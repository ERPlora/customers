#!/usr/bin/env python3
"""Group/tag/field-value writes must never reach a customer of ANOTHER hub (customers#7).

Why this file exists: `_group_add`/`_tag_add` already resolve both parents against the runtime
injected `:hub_id` (pm#146) and every read JOIN carries the hub (pm#89). The OTHER half stayed
open in `origin/main@053c659`:

  * `_group_clear.sql` / `_tag_clear.sql` — `DELETE … WHERE customer_id = :customer_id`. The
    junction tables have no `hub_id`, so a caller of hub A that knows the UUID of a customer of
    hub B could empty its groups/tags via `customers.set_groups` (the handler emits `clear` +
    N×`add`; the `add` is guarded, the `clear` was not).
  * `_field_value_set.sql` — `INSERT … VALUES (:new_id, :hub_id, :customer_id, :field_id, …)`
    writes the caller's hub but never checks that the customer or the field BELONG to it → a
    cross-hub row persisted forever.

What it does: builds a scratch database from THIS module's own migrations, seeds TWO hubs (a
LIVE neighbour, not an empty one — an isolation test against nothing proves nothing), then runs
the manifest commands exactly like the runtime does (`:hub_id`/`:current_user_id`/`:now`/`:new_id`
injected, one transaction per command) as hub A against hub B's ids. Zero mocks.

Usage: tests/tenant_scope_writes.pg.test.py   (exit 0 = green)
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
CONTAINER = os.environ.get("ERPLORA_TEST_PG_CONTAINER", "erplora-test-pg-5433")
DB = f"customers_tenant_scope_{uuid.uuid4().hex[:8]}"

HUB_A = "hub-a"
HUB_B = "hub-b"
USER = "user-a"
NOW = "2026-08-18T10:00:00+00:00"

failures: list[str] = []


# ── Postgres plumbing ────────────────────────────────────────────────────────────────────


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


def qi(sql: str) -> int:
    return int(q(sql))


# ── The runtime, in miniature ────────────────────────────────────────────────────────────

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
    """Replace `:name` placeholders with literals in ONE pass, leaving comments alone (the runtime's
    translator does the same — a `:name` inside a `--` comment is not a bind)."""
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


def run_command(name: str, payload: dict, hub: str) -> tuple[bool, str, int]:
    """Run a manifest command's `sql[]` like the runtime does: one transaction, system params
    injected, `expect_rows` evaluated inside the transaction (hub#139). Returns
    (ok, error_code, affected_rows)."""
    cmd = MANIFEST["commands"][name]
    files = cmd["sql"]
    params = dict(payload)
    params["hub_id"] = hub
    params["current_user_id"] = USER
    params["now"] = NOW
    params.setdefault("new_id", str(uuid.uuid4()))

    # `\gset` is not usable through -c, so the row count is taken through a CTE-free trick:
    # each statement is wrapped so psql prints its command tag; the tag carries the count.
    script = ["BEGIN;"]
    for rel in files:
        script.append(bind((MODULE_DIR / rel).read_text(), params))
    script.append("COMMIT;")
    try:
        out = psql(["-a"], db=DB, stdin="\n".join(script))
    except RuntimeError as exc:
        return False, str(exc), 0
    affected = 0
    for line in out.splitlines():
        m = re.fullmatch(r"(INSERT \d+|UPDATE|DELETE) (\d+)", line.strip())
        if m:
            affected += int(m.group(2))
    gate = cmd.get("expect_rows")
    if gate and gate["op"] == "min" and affected < gate["n"]:
        # The runtime rolls the transaction back here. Our script already committed, so a
        # command that relies on the gate must ALSO have written nothing — asserted by callers.
        return False, gate["error"], affected
    return True, "", affected


def check(label: str, expected, actual):
    if expected != actual:
        failures.append(f"{label} — expected [{expected}], got [{actual}]")
        print(f"  FAIL: {label} — expected [{expected}], got [{actual}]")
    else:
        print(f"  ok: {label} = {expected}")


# ── Fixtures: two LIVE hubs ──────────────────────────────────────────────────────────────


def seed_hub(hub: str, tag: str) -> dict:
    ids = {k: f"{k}-{tag}" for k in ("customer", "group", "tag", "field")}
    audit = f"0, NULL, '{USER}', '{USER}', '{NOW}', '{NOW}'"
    psql(
        [
            "-c",
            f"""
        INSERT INTO customers_customer (id, hub_id, name, is_deleted, deleted_at, created_by, updated_by, created_at, updated_at)
        VALUES ('{ids["customer"]}', '{hub}', 'Customer {tag}', {audit});
        INSERT INTO customers_customergroup (id, hub_id, name, is_deleted, deleted_at, created_by, updated_by, created_at, updated_at)
        VALUES ('{ids["group"]}', '{hub}', 'Group {tag}', {audit});
        INSERT INTO customers_customertag (id, hub_id, name, is_deleted, deleted_at, created_by, updated_by, created_at, updated_at)
        VALUES ('{ids["tag"]}', '{hub}', 'Tag {tag}', {audit});
        INSERT INTO customers_customerfield (id, hub_id, name, is_deleted, deleted_at, created_by, updated_by, created_at, updated_at)
        VALUES ('{ids["field"]}', '{hub}', 'Field {tag}', {audit});
        INSERT INTO customers_customer_groups (customer_id, group_id) VALUES ('{ids["customer"]}', '{ids["group"]}');
        INSERT INTO customers_customer_tags (customer_id, tag_id) VALUES ('{ids["customer"]}', '{ids["tag"]}');
        """,
        ],
        db=DB,
    )
    return ids


def groups_of(customer_id: str) -> int:
    return qi(
        f"SELECT count(*) FROM customers_customer_groups WHERE customer_id = '{customer_id}'"
    )


def tags_of(customer_id: str) -> int:
    return qi(
        f"SELECT count(*) FROM customers_customer_tags WHERE customer_id = '{customer_id}'"
    )


def field_values(customer_id: str) -> int:
    return qi(
        f"SELECT count(*) FROM customers_customerfieldvalue WHERE customer_id = '{customer_id}'"
    )


# ── Scenarios ────────────────────────────────────────────────────────────────────────────


def test_clear_does_not_reach_the_neighbour(a: dict, b: dict):
    print("· `_group_clear`/`_tag_clear` from hub A against a customer of hub B")
    ok, _, affected = run_command(
        "customers._group_clear", {"customer_id": b["customer"]}, HUB_A
    )
    check("group clear ran", True, ok)
    check("group clear affected no row of hub B", 0, affected)
    check("hub B keeps its group relation", 1, groups_of(b["customer"]))

    ok, _, affected = run_command(
        "customers._tag_clear", {"customer_id": b["customer"]}, HUB_A
    )
    check("tag clear ran", True, ok)
    check("tag clear affected no row of hub B", 0, affected)
    check("hub B keeps its tag relation", 1, tags_of(b["customer"]))

    print("· …and the same commands still work for the hub's OWN customer")
    ok, _, affected = run_command(
        "customers._group_clear", {"customer_id": a["customer"]}, HUB_A
    )
    check("own group clear ok", True, ok)
    check("own group relation cleared", 0, groups_of(a["customer"]))
    ok, _, affected = run_command(
        "customers._tag_clear", {"customer_id": a["customer"]}, HUB_A
    )
    check("own tag clear ok", True, ok)
    check("own tag relation cleared", 0, tags_of(a["customer"]))


def test_field_value_set_checks_both_parents(a: dict, b: dict):
    print("· `_field_value_set` from hub A")
    gate = MANIFEST["commands"]["customers._field_value_set"].get("expect_rows")
    check("declares an `expect_rows` gate", True, gate is not None)
    if gate:
        check(
            "gate code lives in the module namespace",
            MANIFEST["id"],
            gate["error"].split(".")[0],
        )
        check("gate has a message", True, bool(gate.get("message")))

    ok, code, _ = run_command(
        "customers._field_value_set",
        {"customer_id": b["customer"], "field_id": b["field"], "value": "x"},
        HUB_A,
    )
    check("neighbour customer + neighbour field → refused", False, ok)
    check("no value row written for hub B's customer", 0, field_values(b["customer"]))

    ok, code, _ = run_command(
        "customers._field_value_set",
        {"customer_id": a["customer"], "field_id": b["field"], "value": "x"},
        HUB_A,
    )
    check("own customer + neighbour field → refused", False, ok)
    check("no value row written with a foreign field", 0, field_values(a["customer"]))

    ok, code, _ = run_command(
        "customers._field_value_set",
        {"customer_id": b["customer"], "field_id": a["field"], "value": "x"},
        HUB_A,
    )
    check("neighbour customer + own field → refused", False, ok)
    check("still no value row for hub B's customer", 0, field_values(b["customer"]))

    ok, code, affected = run_command(
        "customers._field_value_set",
        {"customer_id": a["customer"], "field_id": a["field"], "value": "first"},
        HUB_A,
    )
    check("own customer + own field → accepted", True, ok)
    check("one value row written", 1, field_values(a["customer"]))
    ok, code, affected = run_command(
        "customers._field_value_set",
        {"customer_id": a["customer"], "field_id": a["field"], "value": "second"},
        HUB_A,
    )
    check("setting it again is an upsert, not a duplicate", True, ok)
    check("still one value row", 1, field_values(a["customer"]))
    check(
        "the upsert kept the latest value",
        "second",
        q(
            f"SELECT value FROM customers_customerfieldvalue WHERE customer_id = '{a['customer']}'"
        ),
    )


# ── Main ─────────────────────────────────────────────────────────────────────────────────


def main() -> int:
    if not docker_available():
        print(f"SKIPPED: no Postgres in container {CONTAINER} (nothing was verified)")
        return 0

    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        for rel in MANIFEST["migrations"]["postgres"]:
            psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())
        a = seed_hub(HUB_A, "a")
        b = seed_hub(HUB_B, "b")
        test_clear_does_not_reach_the_neighbour(a, b)
        test_field_value_set_checks_both_parents(a, b)
    finally:
        subprocess.run(
            ["docker", "exec", CONTAINER, "dropdb", "-U", "postgres", "--force", DB]
        )

    if failures:
        print(f"\n{len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nOK: no write of hub A reaches a customer, group, tag or field of hub B")
    return 0


if __name__ == "__main__":
    sys.exit(main())
