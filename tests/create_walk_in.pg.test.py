#!/usr/bin/env python3
"""A walk-in customer is created with just a `name` (customers#32).

Why this file exists: `schemas/create.json` declared 18 REQUIRED fields — birthday, anniversary,
consent date, avatar… — so the two-second gesture of any POS ("name, and charge") was impossible:
the cashier had to fill the whole sheet or send blank strings that later cannot be told apart
from an absent value. Square, Toast, Lightspeed, Fresha, Shopify and Odoo all create a customer
from a name (or a phone) and enrich later; consent is captured when the data is USED for
marketing, never forced at creation (a forced checkbox is a false consent).

Two halves, both here:

  1. The SCHEMA: `required` is exactly `["name"]`.
  2. The SQL: with every other bind absent — which the runtime binds as NULL (`DynNull`,
     hub/crates/db/src/lib.rs) — the INSERT must still succeed against a real Postgres, and the
     row must land with the same defaults the table declares (empty strings, `lead`, `walk_in`,
     `none`, consent 0), never NULLs where the column is NOT NULL.

Usage: tests/create_walk_in.pg.test.py   (exit 0 = green)
  Uses the `erplora-test-pg-5433` container by default (override: ERPLORA_TEST_PG_CONTAINER).
  Creates a scratch database and DROPS it at the end, pass or fail. If Docker or the container is
  missing the SQL half is SKIPPED, never passed; the schema half always runs.
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
DB = f"customers_walk_in_{uuid.uuid4().hex[:8]}"
HUB = "hub-a"
USER = "cashier"
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
    cmd = ["docker", "exec", "-i", CONTAINER, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-X"]
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
        lambda m: m.group(0) if in_comment(m.start()) else literal(params.get(m.group(1))),
        sql,
    )


def translate(sql: str) -> str:
    """`:name` → `$n` (first appearance order), for a PREPARE with every bind untyped."""
    names: list[str] = []

    def sub(m):
        name = m.group(1)
        if name not in names:
            names.append(name)
        return f"${names.index(name) + 1}"

    stripped = "\n".join(l for l in sql.splitlines() if not l.strip().startswith("--"))
    return PARAM.sub(sub, stripped)


def run_create(payload: dict) -> tuple[bool, str, str]:
    cmd = MANIFEST["commands"]["customers.create"]
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
    print("· the schema")
    schema = json.loads((MODULE_DIR / MANIFEST["commands"]["customers.create"]["schema"]).read_text())
    check("required is exactly [name]", ["name"], schema.get("required"))
    check("name still cannot be blank", 1, schema["properties"]["name"].get("minLength"))
    check("consent is NOT required at creation", False, "marketing_consent" in schema.get("required", []))

    if not docker_available():
        print(f"SKIPPED (SQL half): no Postgres in container {CONTAINER}")
        return 1 if failures else 0

    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        for rel in MIGRATIONS:
            psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())

        print("· the statement PREPARES with every bind untyped (the all-absent shape)")
        for rel in MANIFEST["commands"]["customers.create"]["sql"]:
            try:
                psql([], db=DB, stdin=f"PREPARE s AS {translate((MODULE_DIR / rel).read_text())}\nDEALLOCATE s;")
                check(f"{rel} prepares", True, True)
            except RuntimeError as exc:
                check(f"{rel} prepares", True, str(exc).splitlines()[0])

        print("· walk-in: only a name")
        ok, err, cid = run_create({"name": "Walk-in Ana"})
        check("insert accepted", True, ok if ok else err)
        if ok:
            row = json.loads(q(f"SELECT row_to_json(c) FROM customers_customer c WHERE id = '{cid}'"))
            check("hub is the injected one", HUB, row["hub_id"])
            for col in ("email", "phone", "tax_id", "address", "city", "postal_code", "country", "avatar", "notes", "company_name"):
                check(f"{col} lands as empty string, not NULL", "", row[col])
            check("lifecycle_stage defaults to lead", "lead", row["lifecycle_stage"])
            check("source defaults to walk_in", "walk_in", row["source"])
            check("preferred_channel defaults to none", "none", row["preferred_channel"])
            check("marketing_consent defaults to 0", 0, row["marketing_consent"])
            check("consent_date stays NULL (no false consent)", None, row["consent_date"])
            check("birthday stays NULL", None, row["birthday"])
            check("is_active", 1, row["is_active"])

        print("· name + phone (the WhatsApp shape)")
        ok, err, cid = run_create({"name": "Luis", "phone": "+34600000000"})
        check("insert accepted", True, ok if ok else err)
        if ok:
            check("phone kept", "+34600000000", q(f"SELECT phone FROM customers_customer WHERE id = '{cid}'"))

        print("· the full sheet still works and keeps every value")
        full = {
            "name": "Ada", "email": "ada@example.com", "phone": "1", "tax_id": "X", "address": "a", "city": "c",
            "postal_code": "p", "country": "ES", "avatar": "", "notes": "n", "lifecycle_stage": "vip",
            "source": "web", "company_name": "ACME", "birthday": "1990-01-01", "anniversary": None,
            "preferred_channel": "email", "marketing_consent": 1, "consent_date": NOW,
        }
        ok, err, cid = run_create(full)
        check("insert accepted", True, ok if ok else err)
        if ok:
            row = json.loads(q(f"SELECT row_to_json(c) FROM customers_customer c WHERE id = '{cid}'"))
            check("lifecycle kept", "vip", row["lifecycle_stage"])
            check("company kept", "ACME", row["company_name"])
            # …but NOT the consent, and that is the point (customers#10). This used to assert
            # «consent kept»: a full sheet could arrive with `marketing_consent: 1` and the row was
            # written with it. Creating a customer — at the counter, from a CSV, from the assistant
            # — is not somebody saying yes, and a flag an import can switch on is the flag an
            # operator turns from «unknown» into «subscribed» with a search-and-replace. Consent is
            # now an append-only fact with its evidence (`customers.consent.grant`), and this
            # command ignores both binds.
            check("consent is NOT taken from the payload", 0, row["marketing_consent"])
            check("nor is its date", None, row["consent_date"])
    finally:
        subprocess.run(["docker", "exec", CONTAINER, "dropdb", "-U", "postgres", "--force", DB])

    if failures:
        print(f"\n{len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nOK: a walk-in is a name; everything else is enrichment")
    return 0


if __name__ == "__main__":
    sys.exit(main())
