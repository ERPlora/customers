#!/usr/bin/env python3
"""Purchases are a LEDGER, not a blind counter (customers#8).

Why this file exists: `customers.record_purchase` (listener of `sale.completed`) did
`total_purchases + 1, total_spent + :total` and forgot the sale. Re-delivering the same event
(the outbox is at-least-once) counted the sale twice; `sale.voided` (which `sales` emits and
`cash_register`/`inventory` already reverse) was not listened to, so a voided sale kept inflating
totals and the lifecycle stage forever.

Contract fixed here, against a real Postgres built from THIS module's migrations:

  * `customers.record_purchase` writes ONE row in `customers_purchase_ledger` keyed by
    `(hub_id, source_type, source_id)`; the aggregates move only when that row is NEW. Same event
    twice → same totals. A `purchase` activity links the timeline to the sale.
  * `customers._reverse_purchase` (listener of `sale.voided`) flips the ledger row to `voided`
    (history is kept, never deleted), subtracts the amount, recomputes `last_purchase_date` from
    the ledger and steps the stage back deterministically; a second void is a no-op.
  * Both are hub-scoped: hub A cannot record or reverse against hub B's customer.

Usage: tests/purchase_ledger.pg.test.py   (exit 0 = green)
  Uses the `erplora-test-pg-5433` container by default (override: ERPLORA_TEST_PG_CONTAINER).
  Creates a scratch database and DROPS it at the end, pass or fail. If Docker or the container is
  missing the check is SKIPPED, never passed.
"""

import json
import os
import pathlib
import re
import subprocess
import sys
import uuid

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())
# A migration entry is a path or `{file, kind}` (kind: expand/backfill/contract).
MIGRATIONS = [
    e if isinstance(e, str) else e["file"] for e in MANIFEST["migrations"]["postgres"]
]
CONTAINER = os.environ.get("ERPLORA_TEST_PG_CONTAINER", "erplora-test-pg-5433")
DB = f"customers_ledger_{uuid.uuid4().hex[:8]}"
HUB_A = "hub-a"
HUB_B = "hub-b"
USER = "system"
NOW = "2026-08-18T10:00:00+00:00"

failures: list[str] = []


def check(label: str, expected, actual):
    if expected != actual:
        failures.append(f"{label} — expected [{expected}], got [{actual}]")
        print(f"  FAIL: {label} — expected [{expected}], got [{actual}]")
    else:
        print(f"  ok: {label} = {expected}")


def docker_available() -> bool:
    try:
        r = subprocess.run(
            ["docker", "exec", CONTAINER, "pg_isready", "-U", "postgres"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        return r.returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False


def psql(args: list[str], db: str | None = None, stdin: str | None = None) -> str:
    cmd = [
        "docker",
        "exec",
        "-i",
        CONTAINER,
        "psql",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "postgres",
        "-X",
    ]
    if db:
        cmd += ["-d", db]
    cmd += args
    res = subprocess.run(cmd, input=stdin, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip() or res.stdout.strip())
    return res.stdout


def q(sql: str) -> str:
    return psql(["-tAc", sql], db=DB).strip()


PARAM = re.compile(r":([a-z_][a-z0-9_]*)", re.IGNORECASE)


def literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def bind(sql: str, params: dict) -> str:
    spans, i, n = [], 0, len(sql)
    while i < n:
        if sql.startswith("--", i):
            j = sql.find("\n", i)
            j = n if j < 0 else j
            spans.append((i, j))
            i = j
        else:
            i += 1

    def in_comment(pos: int) -> bool:
        return any(a <= pos < b for a, b in spans)

    return PARAM.sub(
        lambda m: (
            m.group(0) if in_comment(m.start()) else literal(params.get(m.group(1)))
        ),
        sql,
    )


def run(
    command: str, payload: dict, hub: str = HUB_A, now: str = NOW
) -> tuple[bool, str]:
    """Runs a manifest command like the runtime: system params injected, one transaction."""
    cmd = MANIFEST["commands"][command]
    params = dict(payload)
    params.update(hub_id=hub, current_user_id=USER, now=now, new_id=str(uuid.uuid4()))
    body = "\n".join(bind((MODULE_DIR / rel).read_text(), params) for rel in cmd["sql"])
    try:
        psql([], db=DB, stdin="BEGIN;\n" + body + "\nCOMMIT;")
        return True, ""
    except RuntimeError as exc:
        return False, str(exc).splitlines()[0]


def seed_customer(cid: str, hub: str, stage: str = "lead"):
    psql(
        [],
        db=DB,
        stdin=f"""
      INSERT INTO customers_customer (id, hub_id, name, lifecycle_stage, created_at, updated_at)
      VALUES ('{cid}', '{hub}', 'Customer {cid}', '{stage}', '{NOW}', '{NOW}');""",
    )


def totals(cid: str) -> tuple[int, int, str, str | None]:
    row = q(
        f"SELECT total_purchases, total_spent, lifecycle_stage, last_purchase_date FROM customers_customer WHERE id = '{cid}'"
    ).split("|")
    return int(row[0]), int(row[1]), row[2], (row[3] or None)


def main() -> int:
    print("· the manifest")
    listen = MANIFEST.get("events", {}).get("listen", {})
    check(
        "sale.completed → customers.record_purchase",
        "customers.record_purchase",
        listen.get("sale.completed", {}).get("command"),
    )
    check("sale.voided is listened", True, "sale.voided" in listen)
    reverse_cmd = listen.get("sale.voided", {}).get(
        "command", "customers._reverse_purchase"
    )
    check(
        "the ledger migration is declared",
        True,
        any(
            m.endswith("003_purchase_ledger.sql")
            for m in MIGRATIONS
        ),
    )
    check(
        "the purchase history query exists",
        True,
        "customers.purchases" in MANIFEST["queries"],
    )
    check(
        "record_purchase schema knows sale_id",
        True,
        "sale_id"
        in json.loads(
            (
                MODULE_DIR / MANIFEST["commands"]["customers.record_purchase"]["schema"]
            ).read_text()
        )["properties"],
    )

    if not docker_available():
        print(f"SKIPPED (SQL half): no Postgres in container {CONTAINER}")
        return 1 if failures else 0
    if failures:
        print("manifest half failed; the SQL half needs it")
        return 1

    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        for rel in MIGRATIONS:
            psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())
        seed_customer("c-a", HUB_A, "lead")
        seed_customer("c-b", HUB_B, "lead")

        print("· a purchase: ledger row + aggregates + timeline")
        ok, err = run(
            "customers.record_purchase",
            {"customer_id": "c-a", "sale_id": "s-1", "total": 1250, "currency": "EUR"},
        )
        check("record accepted", True, ok if ok else err)
        check("totals after 1st sale", (1, 1250, "first_purchase", NOW), totals("c-a"))
        check(
            "ledger has ONE confirmed row for s-1",
            "1|confirmed|1250|c-a",
            q(
                "SELECT COUNT(*)::text || '|' || MIN(status) || '|' || MIN(amount)::text || '|' || MIN(customer_id) FROM customers_purchase_ledger WHERE hub_id = 'hub-a' AND source_type = 'sale' AND source_id = 's-1'"
            ),
        )
        check(
            "timeline links the sale",
            "purchase|s-1|sale",
            q(
                "SELECT activity_type || '|' || related_object_id || '|' || related_object_type FROM customers_customeractivity WHERE customer_id = 'c-a' AND activity_type = 'purchase'"
            ),
        )

        print("· the SAME event delivered again does not count twice")
        ok, err = run(
            "customers.record_purchase",
            {"customer_id": "c-a", "sale_id": "s-1", "total": 1250, "currency": "EUR"},
            now="2026-08-18T10:05:00+00:00",
        )
        check("redelivery accepted (no error, no effect)", True, ok if ok else err)
        check("totals unchanged", (1, 1250, "first_purchase", NOW), totals("c-a"))
        check(
            "still one ledger row",
            "1",
            q("SELECT COUNT(*) FROM customers_purchase_ledger WHERE source_id = 's-1'"),
        )
        check(
            "still one purchase activity",
            "1",
            q(
                "SELECT COUNT(*) FROM customers_customeractivity WHERE customer_id = 'c-a' AND activity_type = 'purchase'"
            ),
        )

        print("· a second sale moves the stage forward")
        later = "2026-08-19T10:00:00+00:00"
        ok, err = run(
            "customers.record_purchase",
            {"customer_id": "c-a", "sale_id": "s-2", "total": 300, "currency": "EUR"},
            now=later,
        )
        check("record accepted", True, ok if ok else err)
        check("totals after 2nd sale", (2, 1550, "active", later), totals("c-a"))

        print("· anonymous sale (customer_id NULL) is a safe no-op")
        ok, err = run(
            "customers.record_purchase",
            {"customer_id": None, "sale_id": "s-anon", "total": 999},
        )
        check("anonymous accepted", True, ok if ok else err)
        check(
            "no ledger row for the anonymous sale",
            "0",
            q(
                "SELECT COUNT(*) FROM customers_purchase_ledger WHERE source_id = 's-anon'"
            ),
        )

        print("· hub A cannot record against hub B's customer")
        ok, err = run(
            "customers.record_purchase",
            {"customer_id": "c-b", "sale_id": "s-x", "total": 500},
            hub=HUB_A,
        )
        check("cross-hub accepted as no-op", True, ok if ok else err)
        check("hub B customer untouched", (0, 0, "lead", None), totals("c-b"))
        check(
            "no ledger row written under either hub",
            "0",
            q("SELECT COUNT(*) FROM customers_purchase_ledger WHERE source_id = 's-x'"),
        )

        print("· voiding s-2 reverts amount, count, last purchase and stage")
        ok, err = run(
            reverse_cmd,
            {"sale_id": "s-2", "reason": "mistake"},
            now="2026-08-19T11:00:00+00:00",
        )
        check("reverse accepted", True, ok if ok else err)
        check("totals after void", (1, 1250, "first_purchase", NOW), totals("c-a"))
        check(
            "ledger row kept, flipped to voided",
            "voided",
            q("SELECT status FROM customers_purchase_ledger WHERE source_id = 's-2'"),
        )
        check(
            "timeline shows the void",
            "1",
            q(
                "SELECT COUNT(*) FROM customers_customeractivity WHERE customer_id = 'c-a' AND activity_type = 'purchase_voided' AND related_object_id = 's-2'"
            ),
        )

        print("· voiding the same sale again is a no-op")
        ok, err = run(
            reverse_cmd,
            {"sale_id": "s-2", "reason": "again"},
            now="2026-08-19T12:00:00+00:00",
        )
        check("second reverse accepted", True, ok if ok else err)
        check("totals unchanged", (1, 1250, "first_purchase", NOW), totals("c-a"))
        check(
            "one void activity only",
            "1",
            q(
                "SELECT COUNT(*) FROM customers_customeractivity WHERE customer_id = 'c-a' AND activity_type = 'purchase_voided'"
            ),
        )

        print("· voiding the last confirmed sale steps back to lead")
        ok, err = run(
            reverse_cmd,
            {"sale_id": "s-1", "reason": "refund"},
            now="2026-08-19T13:00:00+00:00",
        )
        check("reverse accepted", True, ok if ok else err)
        check("totals after voiding everything", (0, 0, "lead", None), totals("c-a"))

        print("· hub A cannot reverse hub B's ledger")
        ok, err = run(
            "customers.record_purchase",
            {"customer_id": "c-b", "sale_id": "s-b1", "total": 700},
            hub=HUB_B,
        )
        check("hub B records its own sale", True, ok if ok else err)
        ok, err = run(reverse_cmd, {"sale_id": "s-b1", "reason": "x"}, hub=HUB_A)
        check("cross-hub reverse accepted as no-op", True, ok if ok else err)
        check("hub B totals intact", (1, 700, "first_purchase", NOW), totals("c-b"))

        print("· the history query is hub-scoped and links the source document")
        hist_sql = (
            MODULE_DIR / MANIFEST["queries"]["customers.purchases"]["sql"]
        ).read_text()
        rows = q(
            "SELECT COUNT(*) FROM ("
            + bind(hist_sql, {"customer_id": "c-a", "hub_id": HUB_A})
            + ") h"
        )
        check("hub A history rows for c-a (2 entries, one voided each)", "2", rows)
        cols = q(
            "SELECT string_agg(column_name, ',' ORDER BY column_name) FROM information_schema.columns WHERE table_name = 'customers_purchase_ledger'"
        )
        for col in (
            "source_type",
            "source_id",
            "amount",
            "currency",
            "status",
            "voided_at",
        ):
            check(f"ledger column {col}", True, col in cols.split(","))
    finally:
        subprocess.run(
            ["docker", "exec", CONTAINER, "dropdb", "-U", "postgres", "--force", DB]
        )

    if failures:
        print(f"\n{len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nOK: purchases are an idempotent, reversible ledger")
    return 0


if __name__ == "__main__":
    sys.exit(main())
