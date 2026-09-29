#!/usr/bin/env python3
"""The timeline stores KEYS, never sentences (customers#50).

Why this file exists: QA read the Activity block of a customer sheet on a Spanish hub and found
`Note added (note) · 2026-08-19T15:23:00.255043358+00:00`. The date is a rendering problem (fixed in
the component), but «Note added» is a STORAGE one: the module was writing English UI text into the
database. `commands/note_activity.sql` defaulted `title` to the literal `'Note added'`, and the four
other producers hardcoded `'Purchase recorded'`, `'Purchase voided'`, `'Consent given'` /
`'Consent withdrawn'` and `'Customer data erased'` the same way.

Text a person reads must never be persisted (ADR-0055 / ADR-0199: English is the SOURCE language,
what is visible travels through i18n). A row written today is read years later, possibly by a hub
in another language, and a sentence in a column cannot be translated after the fact.

So the producers of THIS module write a stable key — `activity.note_added` — and the sheet resolves
it against the catalogue at render time. Rows already in the wild keep their old literal: the
component maps the six legacy sentences to the same keys, so no migration is needed and nothing
that another module wrote is rewritten.

Two halves:

  1. Every `INSERT INTO customers_customeractivity` of this module writes a key in `title`, and the
     catalogues carry that key in both languages. `commands/activity_add.sql` is the exception on
     purpose: that command is the door OTHER modules write through, and their text is theirs.
  2. Against a real Postgres: adding a note with no `title` lands `activity.note_added`, and erasing
     a customer lands `activity.customer_erased`.

Usage: tests/activity_titles_are_keys.pg.test.py   (exit 0 = green)
  Uses the `erplora-test-pg-5433` container by default (override: ERPLORA_TEST_PG_CONTAINER).
  Creates a scratch database and DROPS it at the end, pass or fail. If Docker or the container is
  missing the SQL half is SKIPPED, never passed; the lexical half always runs.
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
DB = f"customers_activity_{uuid.uuid4().hex[:8]}"
HUB = "hub-a"
USER = "admin-a"
NOW = "2026-08-20T10:00:00+00:00"

#: The keys this module's own producers write, and the catalogue entry each one resolves to.
EXPECTED_KEYS = {
    "activity.note_added": "ui.activityNoteAdded",
    "activity.purchase_recorded": "ui.activityPurchaseRecorded",
    "activity.purchase_voided": "ui.activityPurchaseVoided",
    "activity.consent_granted": "ui.activityConsentGranted",
    "activity.consent_withdrawn": "ui.activityConsentWithdrawn",
    "activity.customer_erased": "ui.activityCustomerErased",
    "activity.customer_merged": "ui.activityCustomerMerged",
}

#: `customers.activity.add` is the public door: whatever another module sends is its own text.
LEXICAL_EXEMPT = {"commands/activity_add.sql"}

KEY_SHAPE = re.compile(r"^activity\.[a-z_]+$")

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


def run_command(name: str, payload: dict) -> tuple[bool, str]:
    cmd = MANIFEST["commands"][name]
    params = dict(payload)
    params.update(hub_id=HUB, current_user_id=USER, now=NOW, new_id=str(uuid.uuid4()))
    script = (
        ["BEGIN;"]
        + [bind((MODULE_DIR / rel).read_text(), params) for rel in cmd["sql"]]
        + ["COMMIT;"]
    )
    try:
        psql([], db=DB, stdin="\n".join(script))
        return True, ""
    except RuntimeError as exc:
        return False, str(exc).splitlines()[0]


def strings_in(sql: str) -> list[str]:
    """Single-quoted literals of a statement, comments stripped."""
    body = "\n".join(l for l in sql.splitlines() if not l.strip().startswith("--"))
    return re.findall(r"'([^']*)'", body)


def looks_like_a_sentence(text: str) -> bool:
    """A human sentence: two or more words with a capital and a space. Keys have neither."""
    return bool(re.match(r"^[A-Z][a-z]+ [a-z]", text))


def main() -> int:
    print("· the catalogues carry every key, in both languages")
    catalogs = {
        lang: json.loads((MODULE_DIR / f"locales/{lang}.json").read_text())
        for lang in ("en", "es")
    }
    for key, ui_key in EXPECTED_KEYS.items():
        for lang, cat in catalogs.items():
            leaf = cat
            for part in ui_key.split("."):
                leaf = leaf.get(part, {}) if isinstance(leaf, dict) else {}
            check(
                f"{lang}: {ui_key} exists (for {key})",
                True,
                isinstance(leaf, str) and bool(leaf),
            )

    print("· no producer of this module writes a sentence into `title`")
    producers = sorted(
        rel
        for cmd in MANIFEST["commands"].values()
        for rel in cmd.get("sql", [])
        if "customers_customeractivity" in (MODULE_DIR / rel).read_text()
        and "INSERT INTO customers_customeractivity" in (MODULE_DIR / rel).read_text()
    )
    check("there are producers to scan", True, bool(producers))
    for rel in producers:
        if rel in LEXICAL_EXEMPT:
            continue
        sentences = [
            s
            for s in strings_in((MODULE_DIR / rel).read_text())
            if looks_like_a_sentence(s)
        ]
        check(f"{rel} has no human sentence in its literals", [], sentences)
        keys = [
            s for s in strings_in((MODULE_DIR / rel).read_text()) if KEY_SHAPE.match(s)
        ]
        check(f"{rel} writes an activity key", True, bool(keys))
        for k in keys:
            check(f"{rel}: `{k}` is a catalogued key", True, k in EXPECTED_KEYS)

    print("· the note schema no longer documents an English default")
    note_schema = json.loads(
        (MODULE_DIR / MANIFEST["commands"]["customers.notes.add"]["schema"]).read_text()
    )
    desc = note_schema["properties"]["title"].get("description", "")
    check("the documented default is the key", True, "activity.note_added" in desc)
    check("…and not the old sentence", False, "'Note added'" in desc)

    if not docker_available():
        print(f"SKIPPED (SQL half): no Postgres in container {CONTAINER}")
        return 1 if failures else 0
    if failures:
        return 1

    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        for rel in MIGRATIONS:
            psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())
        psql(
            [],
            db=DB,
            stdin=f"""INSERT INTO customers_customer (id, hub_id, name, created_at, updated_at)
                      VALUES ('c-a', '{HUB}', 'Ana García', '{NOW}', '{NOW}');""",
        )

        print("· a note with no title lands the key, not a sentence")
        ok, err = run_command(
            "customers.notes.add", {"customer_id": "c-a", "content": "Nota QA"}
        )
        check("accepted", True, ok if ok else err)
        check(
            "title stored as a key",
            "activity.note_added",
            q(
                "SELECT title FROM customers_customeractivity WHERE activity_type = 'note'"
            ),
        )

        print("· the erasure audit entry too")
        ok, err = run_command(
            "customers.anonymize", {"customer_id": "c-a", "reason": "GDPR"}
        )
        check("accepted", True, ok if ok else err)
        check(
            "title stored as a key",
            "activity.customer_erased",
            q(
                "SELECT title FROM customers_customeractivity WHERE activity_type = 'erased'"
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
    print("\nOK: the timeline stores keys; the words are the catalogue's")
    return 0


if __name__ == "__main__":
    sys.exit(main())
