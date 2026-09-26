#!/usr/bin/env python3
"""`customers.merge` — two duplicate sheets of the same person become ONE (customers#86, layer 1).

Why this file exists: a salon or a bar ends up with two sheets for the same person — one typed at
the counter («Ana García»), one created by WhatsApp or online booking («ana garcia») — and there
was no way to join them: history, purchases and consents stayed split. Square, Shopify, Odoo,
Fresha, Lightspeed and Mindbody all ship «Merge customers».

Contract fixed here (layer 1 = this module only; other modules re-point their own rows by listening
to `customer.merged`, and the UI button comes last), against a real Postgres built from THIS
module's migrations:

  * ONE transactional command `customers.merge` {surviving_id, absorbed_id}, own permission
    `customers.merge_customer` (admin + manager; not cashier/employee), guarded by an `expect_rows`
    ANCHORED to the statement that checks both sheets (hub#1091), so an unconditional sibling can
    never satisfy it. It emits `customer.merged`, whose payload carries `surviving_id` and
    `absorbed_id` (the runtime publishes the bound params).
  * The surviving sheet keeps its own data and only fills its EMPTY fields from the absorbed one;
    free-text notes are appended, never lost; purchase aggregates are summed.
  * Everything of this module that hangs from the absorbed sheet moves to the survivor: notes,
    timeline, custom-field values (the survivor's non-empty value wins), group/tag membership,
    purchase ledger, customer↔order junction and consent ledger (consent follows the contact point,
    so the facts move and the sheet's flag is re-derived from them). ONE `merged` audit entry is
    written on the survivor.
  * The absorbed sheet is RETIRED, never physically deleted: soft-deleted, inactive, zero totals.
  * Refused with `customers.customer_unavailable` and NOTHING written when: both ids are the same,
    either sheet belongs to another hub, is already retired, or does not exist.

Usage: tests/merge.pg.test.py   (exit 0 = green)
  Uses the `erplora-test-pg-5433` container by default (override: ERPLORA_TEST_PG_CONTAINER).
  Creates a scratch database and DROPS it at the end, pass or fail. If Docker or the container is
  missing the SQL half is SKIPPED, never passed.
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
DB = f"customers_merge_{uuid.uuid4().hex[:8]}"
HUB_A = "hub-a"
HUB_B = "hub-b"
USER = "manager-a"
NOW = "2026-09-26T10:00:00+00:00"
CMD = "customers.merge"

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
    cmd = ["docker", "exec", "-i", CONTAINER, "psql", "-v", "ON_ERROR_STOP=1"]
    cmd += ["-U", "postgres", "-X"]
    if db:
        cmd += ["-d", db]
    cmd += args
    res = subprocess.run(cmd, input=stdin, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip() or res.stdout.strip())
    return res.stdout


def q(sql: str) -> str:
    return psql(["-tAc", sql], db=DB).strip()


PARAM = re.compile(r"(?<!:):([a-z_][a-z0-9_]*)", re.IGNORECASE)
TAG = re.compile(r"^(?:INSERT \d+|UPDATE|DELETE) (\d+)$")


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


def run_statements(sqls: list[str], params: dict, end: str) -> list[int]:
    """One transaction; returns the affected-row count of EACH statement, in order."""
    script = ["BEGIN;"] + [bind(s, params).rstrip().rstrip(";") + ";" for s in sqls]
    out = psql([], db=DB, stdin="\n".join(script + [end + ";"]))
    counts = [
        int(m.group(1)) for m in (TAG.match(l.strip()) for l in out.splitlines()) if m
    ]
    if len(counts) != len(sqls):
        raise RuntimeError(f"expected {len(sqls)} command tags, got {counts}: {out}")
    return counts


def run_command(payload: dict, hub: str) -> tuple[bool, str]:
    """Like the runtime: one transaction, system params injected, `expect_rows` evaluated — and,
    when it is ANCHORED (`statement`), only that statement counts (hub#1091). A refusal rolls the
    whole transaction back."""
    cmd = MANIFEST["commands"][CMD]
    params = dict(payload)
    params.update(hub_id=hub, current_user_id=USER, now=NOW, new_id=str(uuid.uuid4()))
    sqls = [(MODULE_DIR / rel).read_text() for rel in cmd["sql"]]
    try:
        counts = run_statements(sqls, params, "ROLLBACK")
    except RuntimeError as exc:
        return False, str(exc).splitlines()[0]
    gate = cmd.get("expect_rows") or {}
    anchor = gate.get("statement")
    affected = counts[cmd["sql"].index(anchor)] if anchor else sum(counts)
    if gate and affected < gate["n"]:
        return False, gate["error"]
    run_statements(sqls, params, "COMMIT")
    return True, ""


def seed():
    psql(
        [],
        db=DB,
        stdin=f"""
      INSERT INTO customers_customergroup (id, hub_id, name) VALUES ('g1', '{HUB_A}', 'VIP'), ('g2', '{HUB_A}', 'Weekday');
      INSERT INTO customers_customertag (id, hub_id, name) VALUES ('t1', '{HUB_A}', 'Friend'), ('t2', '{HUB_A}', 'Blonde');
      INSERT INTO customers_customerfield (id, hub_id, name) VALUES ('f1', '{HUB_A}', 'Usual dye'), ('f2', '{HUB_A}', 'Stylist'), ('f3', '{HUB_A}', 'Size');

      -- The survivor: typed at the counter. Phone and name set, email and tax id missing.
      INSERT INTO customers_customer (id, hub_id, name, email, phone, tax_id, notes, preferred_channel,
        total_purchases, total_spent, last_purchase_date, lifecycle_stage, created_at, updated_at)
      VALUES ('s', '{HUB_A}', 'Ana García', '', '600111222', '', 'Prefers mornings', 'none',
        1, 1000, '2026-01-10T10:00:00+00:00', 'active', '{NOW}', '{NOW}');
      INSERT INTO customers_customer_groups VALUES ('s', 'g1');
      INSERT INTO customers_customer_tags VALUES ('s', 't1');
      INSERT INTO customers_customerfieldvalue (id, hub_id, customer_id, field_id, value) VALUES
        ('v-s-f1', '{HUB_A}', 's', 'f1', ''), ('v-s-f2', '{HUB_A}', 's', 'f2', 'Luis');

      -- The duplicate: created by WhatsApp. Its own phone, but an email and a tax id.
      INSERT INTO customers_customer (id, hub_id, name, email, phone, tax_id, city, notes, preferred_channel,
        total_purchases, total_spent, last_purchase_date, lifecycle_stage, created_at, updated_at)
      VALUES ('a', '{HUB_A}', 'ana garcia', 'ana@example.com', '699000000', '12345678Z', 'Madrid', 'Allergic to ammonia', 'whatsapp',
        2, 550, '2026-03-01T10:00:00+00:00', 'first_purchase', '{NOW}', '{NOW}');
      INSERT INTO customers_customer_groups VALUES ('a', 'g1'), ('a', 'g2');
      INSERT INTO customers_customer_tags VALUES ('a', 't2');
      INSERT INTO customers_customerfieldvalue (id, hub_id, customer_id, field_id, value) VALUES
        ('v-a-f1', '{HUB_A}', 'a', 'f1', '7.1'), ('v-a-f2', '{HUB_A}', 'a', 'f2', 'Marta'),
        ('v-a-f3', '{HUB_A}', 'a', 'f3', 'M');
      INSERT INTO customers_customernote (id, hub_id, customer_id, content, author_name) VALUES ('n-a', '{HUB_A}', 'a', 'Came via WhatsApp', 'Bot');
      INSERT INTO customers_customeractivity (id, hub_id, customer_id, activity_type, title, created_at) VALUES ('act-a', '{HUB_A}', 'a', 'note', 'activity.note_added', '{NOW}');
      INSERT INTO customers_purchase_ledger (id, hub_id, customer_id, source_type, source_id, amount, created_at, updated_at) VALUES ('l-a', '{HUB_A}', 'a', 'sale', 'sale-a', 550, '{NOW}', '{NOW}');
      INSERT INTO customers_customer_order (id, hub_id, customer_id, order_id, created_at, updated_at) VALUES ('o-a', '{HUB_A}', 'a', 'ord-a', '{NOW}', '{NOW}');
      INSERT INTO customers_consent_ledger (id, hub_id, customer_id, purpose, channel, contact_point, state, source, occurred_at, created_at, updated_at)
        VALUES ('cl-a', '{HUB_A}', 'a', 'marketing', 'whatsapp', '699000000', 'granted', 'web_form', '2026-02-01T10:00:00+00:00', '{NOW}', '{NOW}');

      -- A third sheet in hub A, already deleted.
      INSERT INTO customers_customer (id, hub_id, name, is_deleted, is_active, created_at, updated_at)
      VALUES ('gone', '{HUB_A}', 'Old', 1, 0, '{NOW}', '{NOW}');

      -- Hub B: another business with its own sheets.
      INSERT INTO customers_customer (id, hub_id, name, email, created_at, updated_at) VALUES
        ('b1', '{HUB_B}', 'Bea', 'bea@b.example', '{NOW}', '{NOW}'),
        ('b2', '{HUB_B}', 'bea', '', '{NOW}', '{NOW}');
      INSERT INTO customers_customernote (id, hub_id, customer_id, content) VALUES ('n-b1', '{HUB_B}', 'b1', 'Hub B note');
    """,
    )


def snapshot() -> str:
    """Everything a refused merge must leave untouched."""
    return q(
        "SELECT md5(string_agg(t, '|' ORDER BY t)) FROM ("
        " SELECT row_to_json(c)::text t FROM customers_customer c"
        " UNION ALL SELECT row_to_json(n)::text FROM customers_customernote n"
        " UNION ALL SELECT row_to_json(x)::text FROM customers_customeractivity x"
        " UNION ALL SELECT row_to_json(v)::text FROM customers_customerfieldvalue v"
        " UNION ALL SELECT row_to_json(g)::text FROM customers_customer_groups g"
        " UNION ALL SELECT row_to_json(tg)::text FROM customers_customer_tags tg"
        " UNION ALL SELECT row_to_json(l)::text FROM customers_purchase_ledger l"
        " UNION ALL SELECT row_to_json(o)::text FROM customers_customer_order o"
        " UNION ALL SELECT row_to_json(k)::text FROM customers_consent_ledger k) s"
    )


def main() -> int:
    print("· the manifest")
    cmd = MANIFEST["commands"].get(CMD)
    check("customers.merge exists", True, cmd is not None)
    if cmd:
        check("own permission", "customers.merge_customer", cmd.get("permission"))
        check("transactional", True, cmd.get("transaction"))
        gate = cmd.get("expect_rows") or {}
        check(
            "guarded by expect_rows",
            "customers.customer_unavailable",
            gate.get("error"),
        )
        check(
            "gate is ANCHORED to one statement",
            True,
            gate.get("statement") in cmd.get("sql", []),
        )
        check(
            "emits customer.merged",
            True,
            "customer.merged"
            in [
                e if isinstance(e, str) else e.get("event") for e in cmd.get("emit", [])
            ],
        )
        schema = (
            json.loads((MODULE_DIR / cmd.get("schema", "missing")).read_text())
            if cmd.get("schema")
            else {}
        )
        check(
            "payload names the two ids the event carries",
            ["absorbed_id", "surviving_id"],
            sorted(schema.get("required", [])),
        )
    check(
        "permission declared",
        True,
        "customers.merge_customer" in MANIFEST["permissions"],
    )
    check(
        "manager may merge",
        True,
        "customers.merge_customer" in MANIFEST["role_permissions"]["manager"],
    )
    for role in ("cashier", "employee"):
        check(
            f"{role} may NOT merge",
            False,
            "customers.merge_customer" in MANIFEST["role_permissions"].get(role, []),
        )
    check(
        "event catalogued",
        True,
        "customer.merged" in MANIFEST["events"].get("emits", []),
    )
    for lang in ("en", "es"):
        cat = json.loads((MODULE_DIR / f"locales/{lang}.json").read_text())
        check(
            f"{lang}: timeline text for the merge entry",
            True,
            bool(cat.get("ui", {}).get("activityCustomerMerged")),
        )

        check(
            f"{lang}: timeline type for the merge entry",
            True,
            bool(cat.get("ui", {}).get("activityTypeMerged")),
        )
    sheet = (
        MODULE_DIR / "ui/components/erp-customers-list/erp-customers-list.ts"
    ).read_text()
    check(
        "the sheet resolves the merge title key (never printed raw)",
        True,
        "'activity.customer_merged': 'ui.activityCustomerMerged'" in sheet,
    )
    check(
        "the sheet resolves the merge type",
        True,
        "merged: 'ui.activityTypeMerged'" in sheet,
    )

    if not docker_available():
        print(f"SKIPPED (SQL half): no Postgres in container {CONTAINER}")
        return 1
    if failures:
        return 1

    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        for rel in MANIFEST["migrations"]["postgres"]:
            psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())
        seed()

        print("· refusals write nothing")
        before = snapshot()
        for label, payload, hub in (
            ("same sheet twice", {"surviving_id": "s", "absorbed_id": "s"}, HUB_A),
            (
                "absorbed from another hub",
                {"surviving_id": "s", "absorbed_id": "b1"},
                HUB_A,
            ),
            (
                "survivor from another hub",
                {"surviving_id": "b1", "absorbed_id": "a"},
                HUB_A,
            ),
            (
                "absorbed already deleted",
                {"surviving_id": "s", "absorbed_id": "gone"},
                HUB_A,
            ),
            (
                "survivor already deleted",
                {"surviving_id": "gone", "absorbed_id": "a"},
                HUB_A,
            ),
            (
                "absorbed does not exist",
                {"surviving_id": "s", "absorbed_id": "nope"},
                HUB_A,
            ),
            (
                "hub B cannot merge hub A sheets",
                {"surviving_id": "s", "absorbed_id": "a"},
                HUB_B,
            ),
        ):
            ok, err = run_command(payload, hub)
            check(
                f"{label}: refused",
                "customers.customer_unavailable",
                err if not ok else "accepted",
            )
        check("nothing changed after the refusals", before, snapshot())

        print("· merge a → s in hub A")
        ok, err = run_command({"surviving_id": "s", "absorbed_id": "a"}, HUB_A)
        check("accepted", True, ok if ok else err)
        s = json.loads(
            q("SELECT row_to_json(c) FROM customers_customer c WHERE id = 's'")
        )
        check("survivor keeps its name", "Ana García", s["name"])
        check("survivor keeps its own phone", "600111222", s["phone"])
        check("empty email filled from the duplicate", "ana@example.com", s["email"])
        check("empty tax id filled", "12345678Z", s["tax_id"])
        check("empty city filled", "Madrid", s["city"])
        check("preferred channel 'none' filled", "whatsapp", s["preferred_channel"])
        check(
            "notes appended, nothing lost",
            "Prefers mornings\nAllergic to ammonia",
            s["notes"],
        )
        check("purchase count summed", 3, s["total_purchases"])
        check("spend summed (cents)", 1550, s["total_spent"])
        check(
            "latest purchase date wins",
            "2026-03-01T10:00:00+00:00",
            s["last_purchase_date"],
        )
        check("survivor stays live", (1, 0), (s["is_active"], s["is_deleted"]))
        check("consent flag re-derived from the moved facts", 1, s["marketing_consent"])
        check(
            "consent date from the moved fact",
            "2026-02-01T10:00:00+00:00",
            s["consent_date"],
        )

        a = json.loads(
            q("SELECT row_to_json(c) FROM customers_customer c WHERE id = 'a'")
        )
        check("absorbed row still exists (no physical delete)", "a", a["id"])
        check(
            "absorbed retired",
            (0, 1, NOW),
            (a["is_active"], a["is_deleted"], a["deleted_at"]),
        )
        check(
            "absorbed totals moved out",
            (0, 0),
            (a["total_purchases"], a["total_spent"]),
        )

        check(
            "note moved",
            "s",
            q("SELECT customer_id FROM customers_customernote WHERE id = 'n-a'"),
        )
        check(
            "timeline moved",
            "s",
            q("SELECT customer_id FROM customers_customeractivity WHERE id = 'act-a'"),
        )
        check(
            "purchase ledger moved",
            "s",
            q("SELECT customer_id FROM customers_purchase_ledger WHERE id = 'l-a'"),
        )
        check(
            "order junction moved",
            "s",
            q("SELECT customer_id FROM customers_customer_order WHERE id = 'o-a'"),
        )
        check(
            "consent fact moved",
            "s",
            q("SELECT customer_id FROM customers_consent_ledger WHERE id = 'cl-a'"),
        )
        check(
            "field values: empty filled, own value wins, missing one moved",
            "f1=7.1|f2=Luis|f3=M",
            q(
                "SELECT string_agg(field_id || '=' || value, '|' ORDER BY field_id)"
                " FROM customers_customerfieldvalue WHERE customer_id = 's' AND is_deleted = 0"
            ),
        )
        check(
            "groups united",
            "g1,g2",
            q(
                "SELECT string_agg(group_id, ',' ORDER BY group_id) FROM customers_customer_groups WHERE customer_id = 's'"
            ),
        )
        check(
            "tags united",
            "t1,t2",
            q(
                "SELECT string_agg(tag_id, ',' ORDER BY tag_id) FROM customers_customer_tags WHERE customer_id = 's'"
            ),
        )
        check(
            "absorbed keeps no membership (group counts stay honest)",
            "0",
            q(
                "SELECT (SELECT COUNT(*) FROM customers_customer_groups WHERE customer_id = 'a')"
                " + (SELECT COUNT(*) FROM customers_customer_tags WHERE customer_id = 'a')"
            ),
        )
        check(
            "ONE merged audit entry on the survivor, pointing at the absorbed sheet",
            "activity.customer_merged|a|customer|manager-a|0",
            q(
                "SELECT string_agg(title || '|' || related_object_id || '|' || related_object_type"
                " || '|' || performed_by || '|' || is_deleted, ';')"
                " FROM customers_customeractivity WHERE customer_id = 's' AND activity_type = 'merged'"
            ),
        )
        check(
            "hub B untouched",
            "b1|0|b2|0|n-b1:b1",
            q(
                "SELECT string_agg(id || '|' || is_deleted, '|' ORDER BY id) FROM customers_customer WHERE hub_id = 'hub-b'"
            )
            + "|"
            + q(
                "SELECT id || ':' || customer_id FROM customers_customernote WHERE id = 'n-b1'"
            ),
        )

        print("· merging the retired sheet again is refused (no second event)")
        ok, err = run_command({"surviving_id": "s", "absorbed_id": "a"}, HUB_A)
        check(
            "refused", "customers.customer_unavailable", err if not ok else "accepted"
        )

        print(
            "· no real consent fact: the survivor's flag is kept, never switched by a merge"
        )
        psql(
            [],
            db=DB,
            stdin=f"""
          INSERT INTO customers_customer (id, hub_id, name, marketing_consent, consent_date, created_at, updated_at) VALUES
            ('s2', '{HUB_A}', 'Luis', 1, '2025-01-01', '{NOW}', '{NOW}'),
            ('a2', '{HUB_A}', 'luis', 0, NULL, '{NOW}', '{NOW}');
        """,
        )
        ok, err = run_command({"surviving_id": "s2", "absorbed_id": "a2"}, HUB_A)
        check("accepted", True, ok if ok else err)
        check(
            "legacy flag kept",
            "1|2025-01-01",
            q(
                "SELECT marketing_consent || '|' || consent_date FROM customers_customer WHERE id = 's2'"
            ),
        )

        print("· the retired sheet no longer appears in the list / POS search")
        list_sql = (
            MODULE_DIR / MANIFEST["queries"]["customers.list"]["sql"]
        ).read_text()
        n = q(
            "SELECT COUNT(*) FROM ("
            + bind(list_sql, {"hub_id": HUB_A})
            + ") l WHERE id = 'a'"
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
    print("\nOK: merge is transactional, anchored, hub-scoped and loses nothing")
    return 0


if __name__ == "__main__":
    sys.exit(main())
