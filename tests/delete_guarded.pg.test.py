#!/usr/bin/env python3
"""A delete that deletes nothing must FAIL, and must not announce a deletion (customers#49).

Why this file exists: `customers.delete` was the only destructive command of the module with
neither a `schema` nor an `expect_rows`. Called with `{}` or with an id that does not exist, its
`UPDATE … WHERE id = :customer_id AND hub_id = :hub_id` matched no row, nobody counted the rows,
the transaction committed and the runtime published `customer.deleted`. For anyone listening — a
flow, an automation, another module — that is a PHANTOM removal: a customer that is still alive is
announced as gone, and the caller never learns its id was wrong.

The same shape was closed in staff#1 and invoice_series#8. The fix is declarative and does not
touch the SQL: a payload schema that demands the id, and a row guard that turns "zero rows" into
the business error the neighbours already speak (`customers.customer_unavailable`). The runtime
evaluates the guard INSIDE the transaction, so a rejected command rolls back and never emits
(hub#139, `crates/runtime/tests/min_affected_rows_e2e.rs`).

Three halves, all here:

  1. The MANIFEST: every `*.delete` of the module declares a schema and a row guard, and the
     customer one still emits `customer.deleted` on the happy path.
  2. The SCHEMAS: the id is `required` and cannot be blank.
  3. The SQL, against a real Postgres built from this module's own migrations: a real id soft-deletes
     one row and passes the guard; an unknown id, a blank id and another hub's id all affect ZERO
     rows, so the guard rejects them with `customers.customer_unavailable` and nothing is written.

Usage: tests/delete_guarded.pg.test.py   (exit 0 = green)
  Uses the `erplora-test-pg-5433` container by default (override: ERPLORA_TEST_PG_CONTAINER).
  Creates a scratch database and DROPS it at the end, pass or fail. If Docker or the container is
  missing the SQL half is SKIPPED, never passed; the manifest and schema halves always run.
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
DB = f"customers_delete_{uuid.uuid4().hex[:8]}"
HUB_A = "hub-a"
HUB_B = "hub-b"
USER = "admin-a"
NOW = "2026-08-20T10:00:00+00:00"

#: Every soft-delete of the module and the payload key that says WHAT to delete.
DELETES = {
    "customers.delete": ("customer_id", "customers.customer_unavailable"),
    "customers.groups.delete": ("group_id", "customers.group_unavailable"),
    "customers.tags.delete": ("tag_id", "customers.tag_unavailable"),
    "customers.fields.delete": ("field_id", "customers.field_unavailable"),
}

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


def run_command(name: str, payload: dict, hub: str) -> tuple[bool, str, int]:
    """Like the runtime: one transaction, system params injected, `expect_rows` evaluated (hub#139)."""
    cmd = MANIFEST["commands"][name]
    params = dict(payload)
    params.update(hub_id=hub, current_user_id=USER, now=NOW, new_id=str(uuid.uuid4()))
    script = (
        ["BEGIN;"]
        + [bind((MODULE_DIR / rel).read_text(), params) for rel in cmd["sql"]]
        + ["COMMIT;"]
    )
    try:
        out = psql(["-a"], db=DB, stdin="\n".join(script))
    except RuntimeError as exc:
        return False, str(exc).splitlines()[0], 0
    affected = sum(
        int(m.group(2))
        for m in (
            re.fullmatch(r"(INSERT \d+|UPDATE|DELETE) (\d+)", l.strip())
            for l in out.splitlines()
        )
        if m
    )
    gate = cmd.get("expect_rows")
    if gate and gate["op"] == "min" and affected < gate["n"]:
        return False, gate["error"], affected
    return True, "", affected


def payload_accepted(schema: dict, payload: dict) -> bool:
    """The subset of JSON Schema this contract leans on: `required` + `minLength` on strings.

    Deliberately tiny — the runtime runs the real validator; what this asserts is that the schema
    SAYS enough for the real validator to reject `{}`."""
    for key in schema.get("required", []):
        if key not in payload:
            return False
        rule = schema.get("properties", {}).get(key, {})
        value = payload[key]
        if not isinstance(value, str):
            return False
        if len(value) < int(rule.get("minLength", 0)):
            return False
    return True


def seed(hub: str, suffix: str):
    psql(
        [],
        db=DB,
        stdin=f"""
      INSERT INTO customers_customer (id, hub_id, name, created_at, updated_at)
        VALUES ('c-{suffix}', '{hub}', 'Ana García', '{NOW}', '{NOW}');
      INSERT INTO customers_customergroup (id, hub_id, name) VALUES ('g-{suffix}', '{hub}', 'VIP');
      INSERT INTO customers_customertag (id, hub_id, name) VALUES ('t-{suffix}', '{hub}', 'Friend');
      INSERT INTO customers_customerfield (id, hub_id, name) VALUES ('f-{suffix}', '{hub}', 'Usual dye');
    """,
    )


def main() -> int:
    print("· the manifest — no soft-delete is left without a schema and a row guard")
    for name, (key, error) in DELETES.items():
        cmd = MANIFEST["commands"].get(name, {})
        check(f"{name} declares a schema", True, bool(cmd.get("schema")))
        gate = cmd.get("expect_rows") or {}
        check(
            f"{name} guards the affected rows",
            ("min", 1),
            (gate.get("op"), gate.get("n")),
        )
        check(f"{name} rejects with a business code", error, gate.get("error"))
        check(
            f"{name} carries a message for the operator",
            True,
            bool(gate.get("message")),
        )

    print("· the schemas — the id is required and cannot be blank")
    for name, (key, _) in DELETES.items():
        rel = MANIFEST["commands"].get(name, {}).get("schema")
        if not rel:
            continue
        schema = json.loads((MODULE_DIR / rel).read_text())
        check(f"{name}: required is exactly [{key}]", [key], schema.get("required"))
        check(
            f"{name}: {key} cannot be blank",
            1,
            schema.get("properties", {}).get(key, {}).get("minLength"),
        )
        check(
            f"{name}: an empty payload is rejected", False, payload_accepted(schema, {})
        )
        check(
            f"{name}: a blank id is rejected",
            False,
            payload_accepted(schema, {key: ""}),
        )
        check(
            f"{name}: a real id is accepted", True, payload_accepted(schema, {key: "x"})
        )

    print("· the happy path still announces the removal")
    delete = MANIFEST["commands"].get("customers.delete", {})
    check(
        "customers.delete still emits customer.deleted",
        ["customer.deleted"],
        delete.get("emit"),
    )
    check(
        "customer.deleted stays in the module's catalogue",
        True,
        "customer.deleted" in MANIFEST["events"].get("emits", []),
    )

    if not docker_available():
        print(f"SKIPPED (SQL half): no Postgres in container {CONTAINER}")
        return 1 if failures else 0
    if failures:
        return 1

    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        for rel in MIGRATIONS:
            psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())
        seed(HUB_A, "a")
        seed(HUB_B, "b")

        print("· a real customer: one row, guard passes, sheet soft-deleted")
        ok, err, affected = run_command(
            "customers.delete", {"customer_id": "c-a"}, HUB_A
        )
        check("accepted", True, ok if ok else err)
        check("exactly one row", 1, affected)
        check(
            "soft-deleted and deactivated",
            "1|0",
            q(
                "SELECT is_deleted || '|' || is_active FROM customers_customer WHERE id = 'c-a'"
            ),
        )

        print(
            "· an id that does not exist: ZERO rows → business error, no phantom deletion"
        )
        ok, err, affected = run_command(
            "customers.delete", {"customer_id": "does-not-exist-at-all"}, HUB_A
        )
        check("refused with the business error", "customers.customer_unavailable", err)
        check("nothing was touched", 0, affected)

        print(
            "· no id at all (the payload the schema now rejects) never reaches a row either"
        )
        ok, err, affected = run_command("customers.delete", {}, HUB_A)
        check("refused with the business error", "customers.customer_unavailable", err)
        check("nothing was touched", 0, affected)

        print("· hub A cannot delete hub B's customer, and is told so")
        ok, err, affected = run_command(
            "customers.delete", {"customer_id": "c-b"}, HUB_A
        )
        check("refused with the business error", "customers.customer_unavailable", err)
        check(
            "hub B sheet intact",
            "0",
            q("SELECT is_deleted FROM customers_customer WHERE id = 'c-b'"),
        )

        print("· the same guard on groups, tags and custom fields")
        for name, (key, error) in DELETES.items():
            if name == "customers.delete":
                continue
            live = {
                "customers.groups.delete": "g-a",
                "customers.tags.delete": "t-a",
                "customers.fields.delete": "f-a",
            }[name]
            other = {
                "customers.groups.delete": "g-b",
                "customers.tags.delete": "t-b",
                "customers.fields.delete": "f-b",
            }[name]
            ok, err, affected = run_command(name, {key: live}, HUB_A)
            check(f"{name}: a real id is accepted", True, ok if ok else err)
            check(f"{name}: exactly one row", 1, affected)
            ok, err, affected = run_command(name, {key: "nope"}, HUB_A)
            check(f"{name}: an unknown id is refused", error, err)
            ok, err, affected = run_command(name, {key: other}, HUB_A)
            check(f"{name}: another hub's id is refused", error, err)
    finally:
        subprocess.run(
            ["docker", "exec", CONTAINER, "dropdb", "-U", "postgres", "--force", DB]
        )

    if failures:
        print(f"\n{len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nOK: a delete that matches no row fails, and nothing is announced")
    return 0


if __name__ == "__main__":
    sys.exit(main())
