#!/usr/bin/env python3
"""The customer↔order junction (ADR-0141) — `customers` OWNS it, the order knows nothing (customers#8).

Why this file exists: ported from the hub's
`sales_e2e.rs::el_pedido_no_sabe_de_clientes_la_junction_la_owna_customers` (ERPlora/hub#1264,
contract «El Hub se CIERRA como KERNEL» §5). The old e2e opened a REAL `sales` order just to get an
`order_id` to link against — but `order_id` is an OPAQUE reference on purpose
(`migrations/postgres/002_customer_order.sql`: "sin FK cross-módulo, contrato §2.5"), so nothing
here needs a live `sales` module or a runtime at all: the junction's own contract — one customer per
order, re-linking replaces rather than duplicates, hub-scoped — is entirely `customers`' SQL. A
fabricated order id proves it exactly as strongly as a real one would.

What the old e2e ALSO checked — that the order itself exposes no `customer_id` — is `sales`'
contract, not `customers`', and lives in `tests/orders.hub.test.py::test_the_order_knows_nothing_about_customers`
in ERPlora/sales#239 (hub#1264 slice 1).

Contract fixed here, against a real Postgres built from THIS module's migrations:

  * `customers.orders.link` writes ONE row per order; `customers.orders.by_customer` finds it.
  * Re-linking the SAME (customer, order) pair leaves exactly one row — the DELETE-then-INSERT
    pattern is idempotent, not additive.
  * Re-linking a DIFFERENT customer to the SAME order REPLACES the association: the delete keys
    only on `(hub_id, order_id)`, never on the customer, so "a pedido tiene como mucho un cliente"
    holds even across a hand-off, not just a retry.
  * Hub-scoped: hub A's link never shows up under hub B's `by_customer`.

Usage: tests/orders_link.pg.test.py   (exit 0 = green)
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
DB = f"customers_orders_link_{uuid.uuid4().hex[:8]}"
HUB_A = "hub-a"
HUB_B = "hub-b"
USER = "system"
NOW = "2026-08-29T10:00:00+00:00"

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


def seed_customer(cid: str, hub: str):
    psql(
        [],
        db=DB,
        stdin=f"""
      INSERT INTO customers_customer (id, hub_id, name, lifecycle_stage, created_at, updated_at)
      VALUES ('{cid}', '{hub}', 'Customer {cid}', 'lead', '{NOW}', '{NOW}');""",
    )


def by_customer(customer_id: str, hub: str) -> list[str]:
    """Runs the declared query exactly like the runtime binds it, against the real table."""
    sql = (
        MODULE_DIR / MANIFEST["queries"]["customers.orders.by_customer"]["sql"]
    ).read_text()
    rows = q(
        "SELECT COALESCE(json_agg(order_id), '[]') FROM ("
        + bind(sql, {"customer_id": customer_id, "hub_id": hub}).rstrip().rstrip(";")
        + ") h"
    )
    return json.loads(rows)


def main() -> int:
    print("· the manifest")
    check(
        "the junction migration is declared",
        True,
        any(
            m.endswith("002_customer_order.sql")
            for m in MIGRATIONS
        ),
    )
    check(
        "customers.orders.link exists",
        True,
        "customers.orders.link" in MANIFEST["commands"],
    )
    check(
        "customers.orders.by_customer is exposed",
        True,
        MANIFEST["queries"]["customers.orders.by_customer"].get("expose_api"),
    )

    if not docker_available():
        print(f"SKIPPED: no Postgres in container {CONTAINER} (SQL half; nothing was verified)")
        return 1 if failures else 0
    if failures:
        print("manifest half failed; the SQL half needs it")
        return 1

    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        for rel in MIGRATIONS:
            psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())
        seed_customer("c-a", HUB_A)
        seed_customer("c-a2", HUB_A)
        seed_customer("c-b", HUB_B)

        print(
            "· the order knows nothing about customers, the junction is customers' own row"
        )
        order = "ord-1"
        ok, err = run(
            "customers.orders.link", {"customer_id": "c-a", "order_id": order}
        )
        check("link accepted", True, ok if ok else err)
        check("the customer has its order linked", [order], by_customer("c-a", HUB_A))

        print("· re-linking the SAME pair does not duplicate")
        ok, err = run(
            "customers.orders.link", {"customer_id": "c-a", "order_id": order}
        )
        check("re-link accepted", True, ok if ok else err)
        check("still exactly one order", [order], by_customer("c-a", HUB_A))
        check(
            "exactly one junction row for this order",
            "1",
            q(
                f"SELECT COUNT(*) FROM customers_customer_order WHERE hub_id = '{HUB_A}' AND order_id = '{order}'"
            ),
        )

        print(
            "· an order has at most ONE customer: re-assigning it REPLACES, never adds"
        )
        ok, err = run(
            "customers.orders.link", {"customer_id": "c-a2", "order_id": order}
        )
        check("re-assign accepted", True, ok if ok else err)
        check("the OLD customer no longer has it", [], by_customer("c-a", HUB_A))
        check("the NEW customer has it", [order], by_customer("c-a2", HUB_A))
        check(
            "still exactly one junction row for this order, hub-wide",
            "1",
            q(
                f"SELECT COUNT(*) FROM customers_customer_order WHERE hub_id = '{HUB_A}' AND order_id = '{order}'"
            ),
        )

        print("· hub-scoped: hub B never sees hub A's link")
        ok, err = run(
            "customers.orders.link",
            {"customer_id": "c-b", "order_id": "ord-b"},
            hub=HUB_B,
        )
        check("hub B links its own order", True, ok if ok else err)
        check("hub B sees only its own order", ["ord-b"], by_customer("c-b", HUB_B))
        check(
            "hub A's customer sees none of hub B's orders",
            [],
            by_customer("c-b", HUB_A),
        )
    finally:
        subprocess.run(
            ["docker", "exec", CONTAINER, "dropdb", "-U", "postgres", "--force", DB]
        )

    if failures:
        print(f"\n{len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nOK: the junction is customers' own row, idempotent and hub-scoped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
