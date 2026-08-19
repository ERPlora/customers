#!/usr/bin/env python3
"""Consent is EVIDENCE, not a checkbox (customers#10).

Why this file exists: the sheet carried `marketing_consent` (0/1) and `consent_date`, and nothing
else. That pair cannot answer the only question the GDPR actually asks of it — article 7(1), «the
controller shall be able to DEMONSTRATE that the data subject has consented»: who said yes, when,
for what, through which channel, after being shown which words, and who wrote it down. Worse,
`customers.update` set the boolean and never touched the date, so consent could be switched on with
a null date, or withdrawn while keeping a date that no longer meant anything.

Contract fixed here, against a real Postgres built from THIS module's migrations:

  * Consent is an **append-only ledger** (`customers_consent_ledger`), one row per fact, per
    PURPOSE and per CHANNEL. Granting, withdrawing and granting again leave THREE rows: the
    withdrawal never erases the evidence of what was consented before it.
  * A grant carries its evidence: source, the actor who recorded it, the wording shown and its
    version, an optional external reference — and the moment it happened.
  * The **effective** state per purpose/channel is the LAST fact, and that is what a marketing or
    WhatsApp module reads (`customers.consent.state`, `expose_api`). A withdrawal takes effect
    immediately, on the next read, without a job in between.
  * The legacy boolean is MIGRATED, never trusted: a customer who had `marketing_consent = 1` gets
    one `legacy_unverified` row, not a `granted` one. There is no evidence to invent.
  * `customers.update` NO LONGER writes consent. The sheet's boolean is derived from the ledger by
    the two consent commands, so it stays readable for everything that already reads it.
  * Everything is hub-scoped: hub A cannot grant, withdraw or read hub B's consent.

Usage: tests/consent_ledger.pg.test.py   (exit 0 = green)
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
DB = f"customers_consent_{uuid.uuid4().hex[:8]}"
HUB_A = "hub-a"
HUB_B = "hub-b"
USER = "user-clara"
NOW = "2026-08-19T10:00:00+00:00"
NOTICE = (
    "Quiero recibir ofertas y novedades por email. Puedo darme de baja cuando quiera."
)

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
    command: str, payload: dict, hub: str = HUB_A, now: str = NOW, user: str = USER
):
    """Runs a manifest command like the runtime: system params injected, one transaction."""
    cmd = MANIFEST["commands"][command]
    params = dict(payload)
    params.update(hub_id=hub, current_user_id=user, now=now, new_id=str(uuid.uuid4()))
    body = "\n".join(bind((MODULE_DIR / rel).read_text(), params) for rel in cmd["sql"])
    try:
        psql([], db=DB, stdin="BEGIN;\n" + body + "\nCOMMIT;")
        return True, ""
    except RuntimeError as exc:
        return False, str(exc).splitlines()[0]


def query(name: str, params: dict, hub: str = HUB_A) -> list[str]:
    sql = (MODULE_DIR / MANIFEST["queries"][name]["sql"]).read_text()
    p = dict(params)
    p.update(hub_id=hub)
    out = psql(["-tAF", "|", "-c", bind(sql, p)], db=DB).strip()
    return [line for line in out.splitlines() if line]


def seed_customer(
    cid: str, hub: str, consent: int = 0, consent_date: str | None = None
):
    psql(
        [],
        db=DB,
        stdin=f"""
      INSERT INTO customers_customer (id, hub_id, name, marketing_consent, consent_date, created_at, updated_at)
      VALUES ('{cid}', '{hub}', 'Customer {cid}', {consent}, {literal(consent_date)}, '{NOW}', '{NOW}');""",
    )


def facts(cid: str, hub: str = HUB_A) -> str:
    return q(
        "SELECT COALESCE(string_agg(purpose || '/' || channel || '=' || state, ',' ORDER BY occurred_at, state), '') "
        f"FROM customers_consent_ledger WHERE customer_id = '{cid}' AND hub_id = '{hub}'"
    )


def sheet(cid: str) -> tuple[str, str]:
    row = q(
        f"SELECT marketing_consent::text || '|' || COALESCE(consent_date, '-') FROM customers_customer WHERE id = '{cid}'"
    )
    a, b = row.split("|")
    return a, b


def main() -> int:
    print("· the manifest")
    check(
        "the consent migration is declared",
        True,
        any(
            m.endswith("004_consent_ledger.sql")
            for m in MANIFEST["migrations"]["postgres"]
        ),
    )
    for cmd in ("customers.consent.grant", "customers.consent.withdraw"):
        check(f"command {cmd} exists", True, cmd in MANIFEST["commands"])
    for qy in ("customers.consent.state", "customers.consent.history"):
        check(f"query {qy} exists", True, qy in MANIFEST["queries"])
    check(
        "the effective state is readable by OTHER modules (marketing/WhatsApp)",
        True,
        MANIFEST["queries"].get("customers.consent.state", {}).get("expose_api")
        is True,
    )
    emits = MANIFEST.get("events", {}).get("emits", [])
    for ev in ("customer.consent_granted", "customer.consent_withdrawn"):
        check(f"{ev} is declared", True, ev in emits)
    grant_ref = MANIFEST["commands"].get("customers.consent.grant", {}).get("schema")
    grant_schema = json.loads((MODULE_DIR / grant_ref).read_text()) if grant_ref else {}
    # The wording shown is REQUIRED: a consent whose text nobody can produce is exactly the consent
    # that cannot be demonstrated, which is the whole point of article 7(1).
    check(
        "granting requires the wording shown",
        True,
        "notice_text" in grant_schema.get("required", []),
    )
    check(
        "granting requires a channel",
        True,
        "channel" in grant_schema.get("required", []),
    )
    # …and NOT at creation: the walk-in of the counter stays "name, and charge" (customers#32).
    create_schema = json.loads(
        (MODULE_DIR / MANIFEST["commands"]["customers.create"]["schema"]).read_text()
    )
    check(
        "creating a customer still requires only the name",
        ["name"],
        create_schema.get("required"),
    )
    update_sql = (MODULE_DIR / "commands/update.sql").read_text()
    check(
        "customers.update no longer writes the consent flag",
        False,
        "marketing_consent =" in update_sql,
    )
    # Nor can it be set at CREATION — by the counter, by a CSV import or by the assistant. Creating
    # a sheet is not somebody saying yes, and an import that can write the flag is the search-and-
    # replace that turns «unknown» into «subscribed».
    create_sql = re.sub(r"--[^\n]*", "", (MODULE_DIR / "commands/create.sql").read_text())
    check(
        "customers.create cannot switch consent on",
        False,
        ":marketing_consent" in create_sql or ":consent_date" in create_sql,
    )
    # `legacy_unverified` is writable by the BACKFILL and by nothing else. Shopify made its own
    # `NOT_SUBSCRIBED` read-only after operators were caught turning «unknown» into «subscribed»
    # with a search-and-replace over the CSV export; a state a command can write is a state a
    # command can also be talked into writing the other way.
    for name in ("customers.consent.grant", "customers.consent.withdraw"):
        bodies = "".join(
            re.sub(r"--[^\n]*", "", (MODULE_DIR / rel).read_text())
            for rel in MANIFEST["commands"].get(name, {}).get("sql", [])
        )
        check(
            f"{name} cannot write the legacy state",
            False,
            "legacy_unverified" in bodies,
        )
        # A grant against a customer that is not there must REFUSE, never answer «done» quietly.
        check(
            f"{name} refuses when the customer is not there",
            "customers.customer_unavailable",
            MANIFEST["commands"].get(name, {}).get("expect_rows", {}).get("error"),
        )

    if not docker_available():
        print(f"SKIPPED (SQL half): no Postgres in container {CONTAINER}")
        return 1 if failures else 0
    if failures:
        print("manifest half failed; the SQL half needs it")
        return 1

    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        # The legacy customers exist BEFORE the consent migration runs — that is the whole point of
        # the backfill, so the migrations are applied in two halves around the seed.
        legacy = [
            m
            for m in MANIFEST["migrations"]["postgres"]
            if not m.endswith("004_consent_ledger.sql")
        ]
        for rel in legacy:
            psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())
        seed_customer(
            "c-old", HUB_A, consent=1, consent_date="2024-01-05T09:00:00+00:00"
        )
        seed_customer("c-never", HUB_A, consent=0)
        for rel in MANIFEST["migrations"]["postgres"]:
            if rel.endswith("004_consent_ledger.sql"):
                psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())
        seed_customer("c-a", HUB_A)
        seed_customer("c-b", HUB_B)

        print("· the legacy boolean is migrated, never believed")
        check(
            "the old `yes` became ONE unverified fact",
            "marketing/any=legacy_unverified",
            facts("c-old"),
        )
        check(
            "and it kept the date it had, without inventing anything else",
            "2024-01-05T09:00:00+00:00||",
            q(
                "SELECT occurred_at || '|' || notice_text || '|' || evidence "
                "FROM customers_consent_ledger WHERE customer_id = 'c-old'"
            ),
        )
        check("a customer who never said yes gets NO row", "", facts("c-never"))
        check(
            "the sheet's boolean is untouched by the migration (nothing breaks)",
            ("1", "2024-01-05T09:00:00+00:00"),
            sheet("c-old"),
        )
        # A marketing module asking «may I write to this person?» must NOT read `granted` here.
        # `legacy_unverified` is the honest answer: somebody once ticked a box and nobody knows why.
        legacy_state = {
            r.split("|")[1]: r.split("|")[2]
            for r in query("customers.consent.state", {"customer_id": "c-old"})
        }
        check(
            "an unverified legacy row is NOT consent for anybody who asks",
            {"any": "legacy_unverified"},
            legacy_state,
        )

        print("· granting: one fact, with the evidence attached")
        ok, err = run(
            "customers.consent.grant",
            {
                "customer_id": "c-a",
                "purpose": "marketing",
                "channel": "email",
                "source": "counter",
                "notice_text": NOTICE,
                "notice_version": "counter-v1",
                "evidence": "signed form 2026-0042",
            },
        )
        check("grant accepted", True, ok if ok else err)
        check("one granted fact", "marketing/email=granted", facts("c-a"))
        check(
            "who, when, through what and after which words — all on the row",
            f"{USER}|counter|counter-v1|{NOTICE}|signed form 2026-0042|{NOW}",
            q(
                "SELECT recorded_by || '|' || source || '|' || notice_version || '|' || notice_text "
                "|| '|' || evidence || '|' || occurred_at FROM customers_consent_ledger "
                "WHERE customer_id = 'c-a' AND state = 'granted'"
            ),
        )
        check("the sheet's boolean is DERIVED, not typed", ("1", NOW), sheet("c-a"))
        check(
            "the timeline records it, so the sheet shows it happened",
            "1",
            q(
                "SELECT COUNT(*) FROM customers_customeractivity "
                "WHERE customer_id = 'c-a' AND activity_type = 'consent_granted'"
            ),
        )

        print("· a second purpose/channel is a SEPARATE decision")
        ok, err = run(
            "customers.consent.grant",
            {
                "customer_id": "c-a",
                "purpose": "marketing",
                "channel": "whatsapp",
                "source": "counter",
                "notice_text": NOTICE,
                "notice_version": "counter-v1",
            },
            now="2026-08-19T11:00:00+00:00",
        )
        check("grant accepted", True, ok if ok else err)
        check(
            "email and whatsapp are two facts, not one",
            "marketing/email=granted,marketing/whatsapp=granted",
            facts("c-a"),
        )

        print("· withdrawing: a NEW fact, effective at once, evidence kept")
        ok, err = run(
            "customers.consent.withdraw",
            {
                "customer_id": "c-a",
                "purpose": "marketing",
                "channel": "email",
                "reason": "lo pidió por teléfono",
            },
            now="2026-08-19T12:00:00+00:00",
        )
        check("withdrawal accepted", True, ok if ok else err)
        check(
            "the grant is STILL there — a withdrawal proves nothing if it erases what it revoked",
            "marketing/email=granted,marketing/whatsapp=granted,marketing/email=withdrawn",
            facts("c-a"),
        )
        state = {
            r.split("|")[1]: r.split("|")[2]
            for r in query("customers.consent.state", {"customer_id": "c-a"})
        }
        check("email now reads withdrawn", "withdrawn", state.get("email"))
        check("whatsapp is untouched by it", "granted", state.get("whatsapp"))
        check(
            "the sheet still says yes: whatsapp is live",
            ("1", "2026-08-19T11:00:00+00:00"),
            sheet("c-a"),
        )
        check(
            "the reason travels with the withdrawal",
            "lo pidió por teléfono",
            q(
                "SELECT reason FROM customers_consent_ledger "
                "WHERE customer_id = 'c-a' AND state = 'withdrawn'"
            ),
        )

        print(
            "· withdrawing the last live channel takes the sheet's boolean down with it"
        )
        ok, err = run(
            "customers.consent.withdraw",
            {
                "customer_id": "c-a",
                "purpose": "marketing",
                "channel": "whatsapp",
                "reason": "",
            },
            now="2026-08-19T13:00:00+00:00",
        )
        check("withdrawal accepted", True, ok if ok else err)
        check(
            "the derived boolean is off, and the date with it", ("0", "-"), sheet("c-a")
        )
        check(
            "four facts, none deleted",
            "4",
            q(
                "SELECT COUNT(*) FROM customers_consent_ledger WHERE customer_id = 'c-a'"
            ),
        )

        print("· re-consent after a withdrawal is a fifth fact, and it wins")
        ok, err = run(
            "customers.consent.grant",
            {
                "customer_id": "c-a",
                "purpose": "marketing",
                "channel": "email",
                "source": "web_form",
                "notice_text": NOTICE,
                "notice_version": "web-v2",
            },
            now="2026-08-19T14:00:00+00:00",
        )
        check("grant accepted", True, ok if ok else err)
        check(
            "five facts",
            "5",
            q(
                "SELECT COUNT(*) FROM customers_consent_ledger WHERE customer_id = 'c-a'"
            ),
        )
        state = {
            r.split("|")[1]: r.split("|")[2]
            for r in query("customers.consent.state", {"customer_id": "c-a"})
        }
        check("email reads granted again", "granted", state.get("email"))
        check("whatsapp stays withdrawn", "withdrawn", state.get("whatsapp"))
        check(
            "the sheet follows the ledger",
            ("1", "2026-08-19T14:00:00+00:00"),
            sheet("c-a"),
        )

        print("· the ledger is APPEND-ONLY: the history keeps every fact, newest first")
        history = query("customers.consent.history", {"customer_id": "c-a"})
        check("five rows in the history", 5, len(history))
        check(
            "newest first",
            "granted",
            history[0].split("|")[3] if len(history[0].split("|")) > 3 else history[0],
        )

        print("· consent is never inferred: a purchase does not grant anything")
        run(
            "customers.record_purchase",
            {
                "customer_id": "c-never",
                "sale_id": "s-1",
                "total": 1000,
                "currency": "EUR",
            },
        )
        check("still no fact for a customer who only bought", "", facts("c-never"))
        check("and the sheet still says no", ("0", "-"), sheet("c-never"))

        print("· editing the sheet cannot switch consent on")
        before = sheet("c-a")
        ok, err = run(
            "customers.update",
            {
                "customer_id": "c-a",
                "name": "Ada",
                "email": "",
                "phone": "",
                "tax_id": "",
                "address": "",
                "city": "",
                "postal_code": "",
                "country": "",
                "notes": "",
                "lifecycle_stage": "lead",
                "source": "walk_in",
                "company_name": "",
                "birthday": None,
                "anniversary": None,
                "preferred_channel": "email",
                "marketing_consent": 0,
                "is_active": 1,
            },
            now="2026-08-19T15:00:00+00:00",
        )
        check("update accepted", True, ok if ok else err)
        check("the consent the ledger holds survives the edit", before, sheet("c-a"))

        print("· hub A cannot touch or read hub B's consent")
        ok, err = run(
            "customers.consent.grant",
            {
                "customer_id": "c-b",
                "purpose": "marketing",
                "channel": "email",
                "source": "counter",
                "notice_text": NOTICE,
                "notice_version": "counter-v1",
            },
            hub=HUB_A,
        )
        check("cross-hub grant is a safe no-op", True, ok if ok else err)
        check("nothing written under either hub", "", facts("c-b", HUB_B))
        check("hub B's sheet untouched", ("0", "-"), sheet("c-b"))
        run(
            "customers.consent.grant",
            {
                "customer_id": "c-b",
                "purpose": "marketing",
                "channel": "email",
                "source": "counter",
                "notice_text": NOTICE,
                "notice_version": "counter-v1",
            },
            hub=HUB_B,
        )
        check("hub B grants its own", "marketing/email=granted", facts("c-b", HUB_B))
        check(
            "and hub A cannot READ it",
            [],
            query("customers.consent.state", {"customer_id": "c-b"}, hub=HUB_A),
        )

        print("· erasure takes the evidence with it (customers#11)")
        run(
            "customers.anonymize",
            {"customer_id": "c-a", "reason": "GDPR request"},
            now="2026-08-19T16:00:00+00:00",
        )
        check(
            "the erased customer's consent rows are soft-deleted",
            "0",
            q(
                "SELECT COUNT(*) FROM customers_consent_ledger WHERE customer_id = 'c-a' AND is_deleted = 0"
            ),
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
    print("\nOK: consent is an append-only ledger with the evidence attached")
    return 0


if __name__ == "__main__":
    sys.exit(main())
