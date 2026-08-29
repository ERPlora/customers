#!/usr/bin/env python3
"""`customers.stats` — the dashboard counters, hub-scoped (ported from hub#1264 slice 7).

Why this file exists: the hub's `customers_e2e.rs::customer_crud_and_stats` was the ONLY test of
`customers.stats` (total/active/vip/total_revenue), and it asserted the trivial single-customer
case. Deleting that e2e as part of «El Hub se CIERRA como KERNEL» §5 without a replacement would
leave the query untested: nothing would notice a broken JOIN or a wrong aggregate. This ports it
against a real Postgres, with more than one customer and both hubs of the seed, which the old
single-row assertion could not have caught either way.

Usage: tests/stats.pg.test.py   (exit 0 = green)
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
DB = f"customers_stats_{uuid.uuid4().hex[:8]}"
HUB_A = "hub-a"
HUB_B = "hub-b"
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


def seed_customer(cid: str, hub: str, *, active: int, stage: str, spent: int):
    psql(
        [],
        db=DB,
        stdin=f"""
      INSERT INTO customers_customer
        (id, hub_id, name, is_active, lifecycle_stage, total_spent, created_at, updated_at)
      VALUES ('{cid}', '{hub}', 'Customer {cid}', {active}, '{stage}', {spent}, '{NOW}', '{NOW}');""",
    )


def stats(hub: str) -> tuple[int, int, int, int]:
    sql = (MODULE_DIR / MANIFEST["queries"]["customers.stats"]["sql"]).read_text()
    row = q(
        "SELECT total, active, vip, total_revenue FROM ("
        + bind(sql, {"hub_id": hub}).rstrip().rstrip(";")
        + ") s"
    )
    total, active, vip, revenue = row.split("|")
    return int(total), int(active), int(vip), int(revenue)


def main() -> int:
    print("· the manifest")
    check("customers.stats exists", True, "customers.stats" in MANIFEST["queries"])

    if not docker_available():
        print(f"SKIPPED (SQL half): no Postgres in container {CONTAINER}")
        return 1 if failures else 0
    if failures:
        return 1

    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        for rel in MANIFEST["migrations"]["postgres"]:
            psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())

        seed_customer("c-a1", HUB_A, active=1, stage="active", spent=5000)
        seed_customer("c-a2", HUB_A, active=1, stage="vip", spent=12000)
        seed_customer("c-a3", HUB_A, active=0, stage="dormant", spent=0)
        seed_customer("c-b1", HUB_B, active=1, stage="vip", spent=900)

        print(
            "· hub A: 3 customers, 2 active, 1 vip, revenue is the sum of ITS OWN rows"
        )
        total, active, vip, revenue = stats(HUB_A)
        check("total", 3, total)
        check("active", 2, active)
        check("vip", 1, vip)
        check("total_revenue (5000 + 12000 + 0)", 17000, revenue)

        print("· hub B never sees hub A's customers")
        total, active, vip, revenue = stats(HUB_B)
        check("total", 1, total)
        check("active", 1, active)
        check("vip", 1, vip)
        check("total_revenue", 900, revenue)

        print("· soft-deleted customers do not count")
        psql(
            [],
            db=DB,
            stdin=f"UPDATE customers_customer SET is_deleted = 1 WHERE id = 'c-a2';",
        )
        total, active, vip, revenue = stats(HUB_A)
        check("total drops by one", 2, total)
        check("vip drops with it", 0, vip)
        check("total_revenue drops with it (5000 + 0)", 5000, revenue)
    finally:
        subprocess.run(
            ["docker", "exec", CONTAINER, "dropdb", "-U", "postgres", "--force", DB]
        )

    if failures:
        print(f"\n{len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nOK: customers.stats aggregates correctly and stays hub-scoped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
