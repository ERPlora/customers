#!/usr/bin/env python3
"""The per-group discount is retired from the module's contract, and the stored value survives
(customers#17).

Why this file exists: a customer group promised a discount nobody could ever apply. `sales` does
not depend on `customers` (`depends_on: ["inventory", "taxes"]`), no module reads
`customers.groups.*`, and `pricing` has zero consumers in the whole project. Yet the UI showed
`VIP (−10%)` in the membership picker, a "Discount %" column in the groups table and a 0-100
input in the form. A percentage that reaches no price is a false promise, and it was made in the
daily flow.

So the promise is withdrawn everywhere it was READABLE or WRITABLE — schema, command SQL and the
public `customers.groups.list` query — while the COLUMN stays exactly where it is, with its
values. `customers_customergroup.discount_percent` is an external contract: it is not dropped and
it is not renamed, so whatever a hub configured is still on disk the day `pricing` grows an
engine.

Three halves, all here:

  1. The SCHEMAS: `discount_percent` is no longer `required` in `group_create` / `group_update`
     (the form stopped sending it; a required field nobody sends is a command that cannot run).
  2. The MANIFEST + the query: `customers.groups.list` neither selects the column nor offers it
     as a sort or a filter — otherwise the same promise just moves one layer down, and the `ai`
     block on that query would relay it to the assistant.
  3. The SQL, against a real Postgres: the column still EXISTS with its default, creating a group
     without the field lands 0, and — the regression that matters — updating a group that already
     has 10% with the payload the new form sends (no `discount_percent` at all, which the runtime
     binds as NULL, hub/crates/db/src/lib.rs) must LEAVE THE 10% ALONE, never write 0 over it.

Usage: tests/group_discount_retired.pg.test.py   (exit 0 = green)
  Uses the `erplora-test-pg-5433` container by default (override: ERPLORA_TEST_PG_CONTAINER).
  Creates a scratch database and DROPS it at the end, pass or fail. If Docker or the container is
  missing the SQL half is SKIPPED, never passed; the schema and manifest halves always run.
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
DB = f"customers_group_discount_{uuid.uuid4().hex[:8]}"
HUB = "hub-a"
USER = "admin"
NOW = "2026-08-19T10:00:00+00:00"

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
    """`:name` → literal. An ABSENT key binds NULL, which is what the runtime does."""
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


def run_command(name: str, payload: dict) -> tuple[bool, str, str]:
    cmd = MANIFEST["commands"][name]
    params = dict(payload)
    params.update(hub_id=HUB, current_user_id=USER, now=NOW)
    new_id = str(uuid.uuid4())
    params["new_id"] = new_id
    body = "\n".join(bind((MODULE_DIR / rel).read_text(), params) for rel in cmd["sql"])
    try:
        psql([], db=DB, stdin="BEGIN;\n" + body + "\nCOMMIT;")
        return True, "", new_id
    except RuntimeError as exc:
        return False, str(exc).splitlines()[0], new_id


def main() -> int:
    print("· the schemas no longer DEMAND a discount")
    for cmd_name in ("customers.groups.create", "customers.groups.update"):
        schema = json.loads(
            (MODULE_DIR / MANIFEST["commands"][cmd_name]["schema"]).read_text()
        )
        check(
            f"{cmd_name}: discount_percent is not required",
            False,
            "discount_percent" in schema.get("required", []),
        )
        check(
            f"{cmd_name}: discount_percent is not a declared property either",
            False,
            "discount_percent" in schema.get("properties", {}),
        )

    print("· the command SQL no longer WRITES the column")
    for cmd_name in ("customers.groups.create", "customers.groups.update"):
        for rel in MANIFEST["commands"][cmd_name]["sql"]:
            body = (MODULE_DIR / rel).read_text()
            code = "\n".join(
                l for l in body.splitlines() if not l.strip().startswith("--")
            )
            check(
                f"{rel} does not bind :discount_percent",
                False,
                ":discount_percent" in code,
            )

    print("· the public query does not EXPOSE it (the assistant reads this one)")
    listq = MANIFEST["queries"]["customers.groups.list"]
    sql = (MODULE_DIR / listq["sql"]).read_text()
    code = "\n".join(l for l in sql.splitlines() if not l.strip().startswith("--"))
    check(
        "groups_list.sql does not select discount_percent",
        False,
        "discount_percent" in code,
    )
    check(
        "not sortable by discount_percent",
        False,
        "discount_percent" in listq["list"]["sort"],
    )
    check(
        "not filterable by discount_percent",
        False,
        "discount_percent" in listq["list"]["filters"],
    )

    print("· no UI string promises a percentage any more")
    for locale in ("en", "es"):
        catalog = json.loads((MODULE_DIR / "locales" / f"{locale}.json").read_text())[
            "ui"
        ]
        for key in ("colDiscount", "fieldDiscount"):
            check(f"locales/{locale}.json has no ui.{key}", False, key in catalog)

    if not docker_available():
        print(f"SKIPPED (SQL half): no Postgres in container {CONTAINER}")
        return 1 if failures else 0

    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        for rel in MANIFEST["migrations"]["postgres"]:
            psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())

        print("· the COLUMN survives — nothing was dropped or renamed")
        col = q(
            "SELECT coalesce(column_default,'') FROM information_schema.columns "
            "WHERE table_name = 'customers_customergroup' AND column_name = 'discount_percent'"
        )
        check("customers_customergroup.discount_percent still exists", True, col != "")

        print("· a group is created WITHOUT the field and lands on the table default")
        ok, err, gid = run_command(
            "customers.groups.create",
            {"name": "Nuevo", "description": "", "color": "primary", "sort_order": 0},
        )
        check(
            "insert accepted with no discount in the payload", True, ok if ok else err
        )
        if ok:
            check(
                "lands at 0, not NULL",
                "0",
                q(
                    f"SELECT discount_percent FROM customers_customergroup WHERE id = '{gid}'"
                ),
            )

        print("· THE REGRESSION: editing a 10% group does not write 0 over it")
        vip = str(uuid.uuid4())
        psql(
            [],
            db=DB,
            stdin=(
                "INSERT INTO customers_customergroup "
                "(id, hub_id, name, description, discount_percent, color, sort_order, is_active, is_deleted) "
                f"VALUES ('{vip}', '{HUB}', 'VIP', 'Clientes VIP', 10, 'primary', 1, 1, 0);"
            ),
        )
        # Exactly what the form sends now: no `discount_percent` key at all.
        ok, err, _ = run_command(
            "customers.groups.update",
            {
                "group_id": vip,
                "name": "VIP Oro",
                "description": "Clientes VIP",
                "color": "primary",
                "sort_order": 1,
                "is_active": 1,
            },
        )
        check("update accepted", True, ok if ok else err)
        if ok:
            row = json.loads(
                q(
                    f"SELECT row_to_json(g) FROM customers_customergroup g WHERE id = '{vip}'"
                )
            )
            check("the rename went through", "VIP Oro", row["name"])
            check("the configured 10% is still there", 10, row["discount_percent"])
    finally:
        subprocess.run(
            ["docker", "exec", CONTAINER, "dropdb", "-U", "postgres", "--force", DB]
        )

    if failures:
        print(f"\n{len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nOK: the promise is gone, the stored value is not")
    return 0


if __name__ == "__main__":
    sys.exit(main())
