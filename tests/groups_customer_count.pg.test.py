#!/usr/bin/env python3
"""`customers.groups.list.customer_count` — the membership aggregate (ported from hub#1264 slice 7).

Why this file exists: the hub's `customers_e2e.rs::set_groups_wasm_replaces_membership` asserted
two different things at once — that the WASM handler emits `_group_clear` + N×`_group_add`
(already proven, more thoroughly, by the pure unit test
`set_groups_emits_clear_then_adds` in `handler/src/lib.rs`), and that AFTER those intentions run,
`customers.groups.list` reports the right `customer_count` per group. The first half is kernel
territory (a WASM handler's output becoming rows is `guest_operations_become_rows_through_the_host`
in the hub's own KCS, hub#1264 §5); the second half is this module's own SQL and was never tested
on its own — deleting the e2e without a replacement would leave it uncovered.

`_group_add`/`_group_clear` are exercised here exactly as the WASM handler drives them: as plain
manifest commands with their own hub-injected params, against a real Postgres.

Usage: tests/groups_customer_count.pg.test.py   (exit 0 = green)
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
DB = f"customers_groups_count_{uuid.uuid4().hex[:8]}"
HUB_A = "hub-a"
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


def run(command: str, payload: dict, hub: str = HUB_A) -> tuple[bool, str]:
    cmd = MANIFEST["commands"][command]
    params = dict(payload)
    params.update(hub_id=hub, current_user_id=USER, now=NOW, new_id=str(uuid.uuid4()))
    body = "\n".join(bind((MODULE_DIR / rel).read_text(), params) for rel in cmd["sql"])
    try:
        psql([], db=DB, stdin="BEGIN;\n" + body + "\nCOMMIT;")
        return True, ""
    except RuntimeError as exc:
        return False, str(exc).splitlines()[0]


def seed_customer(cid: str, hub: str = HUB_A):
    psql(
        [],
        db=DB,
        stdin=f"""
      INSERT INTO customers_customer (id, hub_id, name, lifecycle_stage, created_at, updated_at)
      VALUES ('{cid}', '{hub}', 'Customer {cid}', 'active', '{NOW}', '{NOW}');""",
    )


def seed_group(gid: str, name: str, hub: str = HUB_A):
    psql(
        [],
        db=DB,
        stdin=f"""
      INSERT INTO customers_customergroup (id, hub_id, name, created_at, updated_at)
      VALUES ('{gid}', '{hub}', '{name}', '{NOW}', '{NOW}');""",
    )


def groups_list(hub: str = HUB_A) -> dict[str, int]:
    sql = (MODULE_DIR / MANIFEST["queries"]["customers.groups.list"]["sql"]).read_text()
    rows = q(
        "SELECT COALESCE(json_agg(json_build_object('id', id, 'customer_count', customer_count)), '[]') "
        "FROM (" + bind(sql, {"hub_id": hub}) + ") g"
    )
    return {r["id"]: r["customer_count"] for r in json.loads(rows)}


def main() -> int:
    print("· the manifest")
    check(
        "customers._group_add exists",
        True,
        "customers._group_add" in MANIFEST["commands"],
    )
    check(
        "customers._group_clear exists",
        True,
        "customers._group_clear" in MANIFEST["commands"],
    )

    if not docker_available():
        print(f"SKIPPED (SQL half): no Postgres in container {CONTAINER}")
        return 1 if failures else 0
    if failures:
        return 1

    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        for rel in MANIFEST["migrations"]["postgres"]:
            psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())

        seed_customer("c1")
        seed_customer("c2")
        seed_group("g-vip", "VIP")
        seed_group("g-wholesale", "Mayorista")

        print("· set_groups replays as clear + N adds: two customers join two groups")
        for cid in ("c1", "c2"):
            ok, err = run("customers._group_clear", {"customer_id": cid})
            check(f"clear({cid}) accepted", True, ok if ok else err)
            for gid in ("g-vip", "g-wholesale"):
                ok, err = run(
                    "customers._group_add", {"customer_id": cid, "group_id": gid}
                )
                check(f"add({cid}, {gid}) accepted", True, ok if ok else err)

        counts = groups_list()
        check("VIP has both customers", 2, counts["g-vip"])
        check("Mayorista has both customers", 2, counts["g-wholesale"])

        print(
            "· replaying c1's membership (VIP only) drops it from Mayorista, keeps c2"
        )
        ok, err = run("customers._group_clear", {"customer_id": "c1"})
        check("clear(c1) accepted", True, ok if ok else err)
        ok, err = run(
            "customers._group_add", {"customer_id": "c1", "group_id": "g-vip"}
        )
        check("add(c1, VIP) accepted", True, ok if ok else err)

        counts = groups_list()
        check("VIP keeps both", 2, counts["g-vip"])
        check("Mayorista drops to just c2", 1, counts["g-wholesale"])
    finally:
        subprocess.run(
            ["docker", "exec", CONTAINER, "dropdb", "-U", "postgres", "--force", DB]
        )

    if failures:
        print(f"\n{len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(
        "\nOK: customer_count tracks group membership as it is replaced, not just added to"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
