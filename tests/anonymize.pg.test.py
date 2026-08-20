#!/usr/bin/env python3
"""`customers.anonymize` — the GDPR minimum: an auditable, hub-scoped, idempotent erasure (customers#11).

Why this file exists: `customers.delete` is a soft-delete that keeps every piece of PII (name, email,
phone, tax id, address, birthday, notes…) forever. There was no erasure command, the child tables
were never touched, and nothing recorded who erased what and why.

Contract fixed here, against a real Postgres built from THIS module's migrations:

  * ONE transactional command `customers.anonymize` (own permission `customers.erase_customer`,
    admin only by default) that: replaces the sheet's PII by markers and keeps the row `id` (sales
    and invoices keep referencing a pseudonymised row — fiscal retention); soft-deletes and blanks
    notes, activities and custom-field values; drops group/tag membership; and writes ONE `erased`
    audit entry with actor, reason and scope.
  * It NEVER touches the purchase ledger, the customer↔order junction or anything of `sales`.
  * Idempotent (running it twice leaves one audit row and the same data) and hub-scoped (hub A
    cannot erase hub B's customer → `customers.customer_unavailable`, nothing written).

Usage: tests/anonymize.pg.test.py   (exit 0 = green)
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
DB = f"customers_anonymize_{uuid.uuid4().hex[:8]}"
HUB_A = "hub-a"
HUB_B = "hub-b"
USER = "admin-a"
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


def run_command(
    name: str, payload: dict, hub: str, now: str = NOW
) -> tuple[bool, str, int]:
    """Like the runtime: one transaction, system params injected, `expect_rows` evaluated (hub#139)."""
    cmd = MANIFEST["commands"][name]
    params = dict(payload)
    params.update(hub_id=hub, current_user_id=USER, now=now, new_id=str(uuid.uuid4()))
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


def seed(hub: str, cid: str):
    psql(
        [],
        db=DB,
        stdin=f"""
      INSERT INTO customers_customer (id, hub_id, name, email, phone, tax_id, address, city, postal_code, country, notes,
        company_name, birthday, marketing_consent, consent_date, total_purchases, total_spent, created_at, updated_at)
      VALUES ('{cid}', '{hub}', 'Ana García', 'ana@example.com', '600111222', '12345678Z', 'Calle Mayor 1', 'Madrid', '28013', 'ES',
        'allergic to nuts', 'ACME', '1990-01-01', 1, '{NOW}', 2, 1550, '{NOW}', '{NOW}');
      INSERT INTO customers_customergroup (id, hub_id, name) VALUES ('g-{cid}', '{hub}', 'VIP');
      INSERT INTO customers_customertag (id, hub_id, name) VALUES ('t-{cid}', '{hub}', 'Friend');
      INSERT INTO customers_customer_groups VALUES ('{cid}', 'g-{cid}');
      INSERT INTO customers_customer_tags VALUES ('{cid}', 't-{cid}');
      INSERT INTO customers_customerfield (id, hub_id, name) VALUES ('f-{cid}', '{hub}', 'Usual dye');
      INSERT INTO customers_customerfieldvalue (id, hub_id, customer_id, field_id, value) VALUES ('v-{cid}', '{hub}', '{cid}', 'f-{cid}', '7.1');
      INSERT INTO customers_customernote (id, hub_id, customer_id, content, author_name) VALUES ('n-{cid}', '{hub}', '{cid}', 'Prefers window table', 'Luis');
      INSERT INTO customers_customeractivity (id, hub_id, customer_id, activity_type, title, description) VALUES ('a-{cid}', '{hub}', '{cid}', 'note', 'activity.note_added', 'Prefers window table');
      INSERT INTO customers_purchase_ledger (id, hub_id, customer_id, source_type, source_id, amount, created_at, updated_at) VALUES ('l-{cid}', '{hub}', '{cid}', 'sale', 's-{cid}', 1550, '{NOW}', '{NOW}');
      INSERT INTO customers_customer_order (id, hub_id, customer_id, order_id, created_at, updated_at) VALUES ('o-{cid}', '{hub}', '{cid}', 'ord-{cid}', '{NOW}', '{NOW}');
    """,
    )


def main() -> int:
    print("· the manifest")
    cmd = MANIFEST["commands"].get("customers.anonymize")
    check("customers.anonymize exists", True, cmd is not None)
    if cmd:
        check("own permission", "customers.erase_customer", cmd.get("permission"))
        check("transactional", True, cmd.get("transaction"))
        check(
            "guarded by expect_rows",
            "customers.customer_unavailable",
            (cmd.get("expect_rows") or {}).get("error"),
        )
        check(
            "emits customer.anonymized",
            True,
            "customer.anonymized" in cmd.get("emit", []),
        )
    check(
        "permission declared",
        True,
        "customers.erase_customer" in MANIFEST["permissions"],
    )
    for role in ("manager", "employee"):
        check(
            f"{role} does NOT get erase",
            False,
            "customers.erase_customer" in MANIFEST["role_permissions"].get(role, []),
        )
    check(
        "event catalogued",
        True,
        "customer.anonymized" in MANIFEST["events"].get("emits", []),
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
        seed(HUB_A, "c-a")
        seed(HUB_B, "c-b")

        print("· erase c-a with a reason")
        ok, err, _ = run_command(
            "customers.anonymize",
            {"customer_id": "c-a", "reason": "GDPR request by email"},
            HUB_A,
        )
        check("accepted", True, ok if ok else err)
        row = json.loads(
            q("SELECT row_to_json(c) FROM customers_customer c WHERE id = 'c-a'")
        )
        check("row is kept (id survives for sales/invoices)", "c-a", row["id"])
        check("name replaced by a marker", "Deleted customer", row["name"])
        for col in (
            "email",
            "phone",
            "tax_id",
            "address",
            "city",
            "postal_code",
            "country",
            "notes",
            "company_name",
            "avatar",
        ):
            check(f"{col} blanked", "", row[col])
        check("birthday NULL", None, row["birthday"])
        check("consent revoked", 0, row["marketing_consent"])
        check("consent_date NULL", None, row["consent_date"])
        check("inactive + soft-deleted", (0, 1), (row["is_active"], row["is_deleted"]))
        check(
            "aggregates kept (not PII, business stats)",
            (2, 1550),
            (row["total_purchases"], row["total_spent"]),
        )
        check(
            "note blanked + soft-deleted",
            "|1",
            q(
                "SELECT content || '|' || is_deleted FROM customers_customernote WHERE id = 'n-c-a'"
            ),
        )
        check(
            "note author blanked",
            "",
            q("SELECT author_name FROM customers_customernote WHERE id = 'n-c-a'"),
        )
        check(
            "prior activity blanked + soft-deleted",
            "|1",
            q(
                "SELECT description || '|' || is_deleted FROM customers_customeractivity WHERE id = 'a-c-a'"
            ),
        )
        check(
            "field value blanked + soft-deleted",
            "|1",
            q(
                "SELECT value || '|' || is_deleted FROM customers_customerfieldvalue WHERE id = 'v-c-a'"
            ),
        )
        check(
            "group/tag membership dropped",
            "0",
            q(
                "SELECT (SELECT COUNT(*) FROM customers_customer_groups WHERE customer_id = 'c-a') + (SELECT COUNT(*) FROM customers_customer_tags WHERE customer_id = 'c-a')"
            ),
        )
        check(
            "purchase ledger UNTOUCHED (fiscal retention)",
            "1|confirmed",
            q(
                "SELECT COUNT(*)::text || '|' || MIN(status) FROM customers_purchase_ledger WHERE customer_id = 'c-a' AND is_deleted = 0"
            ),
        )
        check(
            "customer↔order junction UNTOUCHED",
            "1",
            q(
                "SELECT COUNT(*) FROM customers_customer_order WHERE customer_id = 'c-a' AND is_deleted = 0"
            ),
        )
        audit = q(
            "SELECT title || '|' || description || '|' || performed_by || '|' || is_deleted FROM customers_customeractivity WHERE customer_id = 'c-a' AND activity_type = 'erased'"
        )
        check(
            "ONE live audit entry with actor and reason",
            # The title is a KEY since customers#50: display text is never persisted.
            "activity.customer_erased|GDPR request by email|admin-a|0",
            audit,
        )
        meta = json.loads(
            q(
                "SELECT extra_metadata FROM customers_customeractivity WHERE customer_id = 'c-a' AND activity_type = 'erased'"
            )
        )
        check(
            "audit scope lists what was erased",
            True,
            all(
                k in meta.get("scope", [])
                for k in (
                    "customer",
                    "notes",
                    "activities",
                    "field_values",
                    "memberships",
                )
            ),
        )
        check(
            "audit keeps the ledger out of scope",
            True,
            "purchase_ledger" not in meta.get("scope", []),
        )

        print("· idempotent: a second erase changes nothing and adds no audit row")
        ok, err, _ = run_command(
            "customers.anonymize",
            {"customer_id": "c-a", "reason": "again"},
            HUB_A,
            now="2026-08-19T11:00:00+00:00",
        )
        check("accepted", True, ok if ok else err)
        check(
            "still one audit entry",
            "1",
            q(
                "SELECT COUNT(*) FROM customers_customeractivity WHERE customer_id = 'c-a' AND activity_type = 'erased'"
            ),
        )
        check(
            "audit entry itself was NOT soft-deleted by the second run",
            "0",
            q(
                "SELECT is_deleted FROM customers_customeractivity WHERE customer_id = 'c-a' AND activity_type = 'erased'"
            ),
        )
        check(
            "first deleted_at kept",
            NOW,
            q("SELECT deleted_at FROM customers_customer WHERE id = 'c-a'"),
        )

        print("· hub A cannot erase hub B's customer")
        ok, err, _ = run_command(
            "customers.anonymize", {"customer_id": "c-b", "reason": "x"}, HUB_A
        )
        check("refused with the business error", "customers.customer_unavailable", err)
        check(
            "hub B sheet intact",
            "Ana García|ana@example.com",
            q("SELECT name || '|' || email FROM customers_customer WHERE id = 'c-b'"),
        )
        check(
            "hub B note intact",
            "Prefers window table",
            q("SELECT content FROM customers_customernote WHERE id = 'n-c-b'"),
        )
        check(
            "hub B membership intact",
            "2",
            q(
                "SELECT (SELECT COUNT(*) FROM customers_customer_groups WHERE customer_id = 'c-b') + (SELECT COUNT(*) FROM customers_customer_tags WHERE customer_id = 'c-b')"
            ),
        )
        check(
            "no audit row under hub A for c-b",
            "0",
            q(
                "SELECT COUNT(*) FROM customers_customeractivity WHERE customer_id = 'c-b' AND activity_type = 'erased'"
            ),
        )

        print("· the anonymised customer no longer appears in the list / POS search")
        list_sql = (
            MODULE_DIR / MANIFEST["queries"]["customers.list"]["sql"]
        ).read_text()
        n = q(
            "SELECT COUNT(*) FROM ("
            + bind(list_sql, {"hub_id": HUB_A})
            + ") l WHERE id = 'c-a'"
        )
        check("gone from customers.list", "0", n)
    finally:
        subprocess.run(
            ["docker", "exec", CONTAINER, "dropdb", "-U", "postgres", "--force", DB]
        )

    if failures:
        print(f"\n{len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nOK: erasure is transactional, auditable, idempotent and hub-scoped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
