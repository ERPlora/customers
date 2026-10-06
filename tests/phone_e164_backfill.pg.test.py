#!/usr/bin/env python3
"""The cards a hub already has get their phone in E.164 after the module updates (customers#121).

Since customers#121 every write of a card saves its phone in E.164 (`+34600111222`) through the
handler. The cards typed before that («600 111 222», «0034 600…», «07700 900123») would keep the
old text forever, and with it the bug: whoever copies the phone (Appointments into the
appointment, and from there the «appointment confirmed» WhatsApp notice) compares text and finds
nobody. A migration cannot do the rewrite: it gets no `:hub_id`, so it cannot read the hub's
country, and the hub refuses a migration that names `hub_settings`. The rewrite is the internal
command `customers._phones_to_e164`, run per hub by a scheduled task (system context, the hub's
`:hub_id`), with the same rules as the handler:

  0. the manifest declares the backup table (`009`), the internal command and its scheduled task,
     and no migration rewrites phones;
  1. a number the handler would accept is rewritten to exactly what the handler would save, read
     in the hub's country (`hub_settings.country_code`; no row or an unknown code → Spain, the
     runtime's default) — the command touches its own hub's cards only;
  2. what the handler would refuse («600111», «call me») is left exactly as typed: nothing is
     thrown away, the card asks for a valid number the next time it is edited;
  3. deleted cards are rewritten too (the merge and the erasure read them), empty phones stay empty;
  4. every rewritten card leaves its old text in `customers_phone_backup` (hub, card, old, new),
     and an untouched one leaves nothing; erasing a customer's personal data (`customers.anonymize`)
     erases that copy too, in its hub only;
  5. running it again changes nothing;
  6. reversible: the DOWN documented in `009` puts the old text back on the cards that still carry
     the rewritten number (a phone edited after the upgrade is kept), then the table goes, and the
     up runs again;
  7. the country table the command carries is the handler's (`handler/src/phone_metadata.rs`),
     row by row: a drift would make the upgrade and the handler save two different numbers.

Usage: tests/phone_e164_backfill.pg.test.py   (exit 0 = green)
  Uses the `erplora-test-pg-5433` container by default (override: ERPLORA_TEST_PG_CONTAINER).
  Creates scratch databases and DROPS them at the end, pass or fail. It NEVER skips itself.
"""

import json
import os
import pathlib
import re
import subprocess
import sys
import uuid

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = json.loads((MODULE_DIR / "module.json").read_text(encoding="utf-8"))
CONTAINER = os.environ.get("ERPLORA_TEST_PG_CONTAINER", "erplora-test-pg-5433")

TABLE = "migrations/postgres/009_phone_backup.sql"
COMMAND = "customers._phones_to_e164"
COMMAND_SQL = "commands/_phones_to_e164.sql"
RETIRED = "migrations/postgres/010_phone_e164.sql"
METADATA = MODULE_DIR / "handler" / "src" / "phone_metadata.rs"

HUB_ES = "hub-es"  # no settings row: Spain
HUB_GB = "hub-gb"
HUB_FR = "hub-fr"  # stored as « fr »: trimmed and upper-cased, as the runtime reads it
HUB_XX = "hub-xx"  # a code nobody knows: Spain
HUB_DE = "hub-de"  # 4 to 15 digits: a number can read both as national and as «49» + national

HUBS = [HUB_ES, HUB_GB, HUB_FR, HUB_XX, HUB_DE]

# The core table the country is read from (`crates/runtime/src/system_migrations.rs` v4): every hub
# has it, so the scratch database always does.
CORE_TABLES = """
CREATE TABLE hub_settings (
  hub_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
  updated_at TEXT NOT NULL, updated_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (hub_id, key));
INSERT INTO hub_settings (hub_id, key, value, updated_at) VALUES
  ('hub-gb', 'country_code', 'GB', 'now'),
  ('hub-gb', 'language', 'fr', 'now'),  -- another setting of the hub, which is no country
  ('hub-fr', 'country_code', ' fr ', 'now'),
  ('hub-xx', 'country_code', 'XX', 'now'),
  ('hub-de', 'country_code', 'DE', 'now');
"""

# (hub, card, phone as typed, phone after the upgrade, deleted?) — the expectations are the
# handler's own (`handler/src/phone.rs` tests): the upgrade saves what an edit would save.
CARDS = [
    (HUB_ES, "es-spaces", "600 111 222", "+34600111222", 0),
    (HUB_ES, "es-dashes", "+34 600-111-223", "+34600111223", 0),
    (HUB_ES, "es-idd", "0034 600 111 224", "+34600111224", 0),
    (HUB_ES, "es-own-code", "34600111225", "+34600111225", 0),
    (HUB_ES, "es-done", "+34600111226", "+34600111226", 0),
    (HUB_ES, "es-deleted", "600.111.227", "+34600111227", 1),
    (HUB_ES, "es-uk-paren", "+44 (0)7700 900123", "+447700900123", 0),
    (HUB_ES, "es-short", "600111", "600111", 0),
    (HUB_ES, "es-words", "call me", "call me", 0),
    (HUB_ES, "es-empty", "", "", 0),
    (HUB_ES, "es-two-plus", "+34 +600111222", "+34 +600111222", 0),
    # A `+` after the first digit: its digits would read as a number, the handler refuses it.
    (HUB_ES, "es-mid-plus", "34+600111222", "34+600111222", 0),
    (HUB_ES, "es-paren-plus", "(+34) 600 111 228", "+34600111228", 0),
    (HUB_GB, "gb-trunk", "07700 900123", "+447700900123", 0),
    (HUB_GB, "gb-trunk-garbage", "01234 5678", "01234 5678", 0),
    (HUB_GB, "gb-es-local", "600 111 222", "+44600111222", 0),
    (HUB_FR, "fr-trunk", "06 12 34 56 78", "+33612345678", 0),
    (HUB_XX, "xx-spain", "600 111 229", "+34600111229", 0),
    # National first, as the handler: «4930 123456» is a possible German number as it stands.
    (HUB_DE, "de-national-first", "4930 123456", "+494930123456", 0),
]

failures: list[str] = []


def fail(msg: str) -> None:
    failures.append(msg)
    print(f"  ✗ {msg}")


def ok(msg: str) -> None:
    print(f"  ✓ {msg}")


def check(label: str, got, want) -> None:
    if got != want:
        fail(f"{label}: got {got!r}, want {want!r}")
    else:
        ok(label)


# ── Postgres plumbing ──────────────────────────────────────────────────────────────────────────


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
    res = subprocess.run(cmd + args, input=stdin, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip() or res.stdout.strip())
    return res.stdout


def literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def bind(sql: str, params: dict) -> str:
    return re.sub(
        r"(?<!:):([a-z_][a-z0-9_]*)",
        lambda m: literal(params.get(m.group(1))),
        sql,
        flags=re.IGNORECASE,
    )


def migration_files() -> list[str]:
    return [
        e if isinstance(e, str) else e["file"]
        for e in MANIFEST["migrations"]["postgres"]
    ]


def migration_kind(rel: str) -> str:
    for e in MANIFEST["migrations"]["postgres"]:
        if isinstance(e, dict) and e.get("file") == rel:
            return e.get("kind", "expand")
    return "expand"


class ScratchDb:
    def __init__(self, prefix: str):
        self.name = f"{prefix}_{os.getpid()}_{uuid.uuid4().hex[:6]}"

    def create(self) -> None:
        psql(["-c", f'DROP DATABASE IF EXISTS "{self.name}"'])
        psql(["-c", f'CREATE DATABASE "{self.name}"'])
        psql([], db=self.name, stdin=CORE_TABLES)

    def migrate(self, migrations: list[str]) -> None:
        for rel in migrations:
            psql([], db=self.name, stdin=(MODULE_DIR / rel).read_text(encoding="utf-8"))

    def drop(self) -> None:
        try:
            psql(["-c", f'DROP DATABASE IF EXISTS "{self.name}" WITH (FORCE)'])
        except RuntimeError as exc:
            print(f"  ! could not drop {self.name}: {exc}")

    def run(self, sql: str) -> str | None:
        try:
            psql(
                [],
                db=self.name,
                stdin="BEGIN;\n" + sql.rstrip().rstrip(";") + ";\nCOMMIT;",
            )
            return None
        except RuntimeError as exc:
            return str(exc)

    def rows(self, sql: str) -> list[dict]:
        out = psql(
            ["-tAc", f"SELECT COALESCE(json_agg(t), '[]'::json) FROM ({sql}) t"],
            db=self.name,
        )
        return json.loads(out.strip() or "[]")

    def command(
        self, name: str, payload: dict, hub: str, user: str = "admin"
    ) -> str | None:
        if name not in MANIFEST["commands"]:
            return f"{name} is not declared in module.json"
        params = dict(payload)
        params.update(
            hub_id=hub,
            current_user_id=user,
            now="2026-10-06T10:00:00+00:00",
            new_id=str(uuid.uuid4()),
        )
        body = "\n".join(
            bind((MODULE_DIR / rel).read_text(encoding="utf-8"), params)
            for rel in MANIFEST["commands"][name]["sql"]
        )
        return self.run(body)

    def seed(self) -> None:
        values = ",\n".join(
            f"({literal(cid)}, {literal(hub)}, {literal('Card ' + cid)}, {literal(phone)}, {deleted})"
            for hub, cid, phone, _, deleted in CARDS
        )
        psql(
            [],
            db=self.name,
            stdin=f"INSERT INTO customers_customer (id, hub_id, name, phone, is_deleted) VALUES\n{values};",
        )

    def phones(self) -> dict[str, str]:
        return {
            r["id"]: r["phone"]
            for r in self.rows("SELECT id, phone FROM customers_customer")
        }

    def sweep(self, hubs: list[str]) -> None:
        """What the scheduled task does on its tick: the command, once per hub, with nobody."""
        for hub in hubs:
            err = self.command(COMMAND, {}, hub, user="")
            if err:
                raise RuntimeError(f"{COMMAND} in {hub}: {err}")

    def backups(self) -> dict[str, tuple]:
        return {
            r["customer_id"]: (r["hub_id"], r["phone"], r["e164"])
            for r in self.rows(
                "SELECT hub_id, customer_id, phone, e164 FROM customers_phone_backup"
            )
        }


def before_upgrade() -> list[str]:
    files = migration_files()
    return files[: files.index(TABLE)] if TABLE in files else files


def documented_down(rel: str) -> str:
    lines = (MODULE_DIR / rel).read_text(encoding="utf-8").splitlines()
    try:
        start = next(
            i for i, line in enumerate(lines) if line.strip().startswith("-- DOWN")
        )
    except StopIteration:
        return ""
    body = []
    for line in lines[start + 1 :]:
        if not line.startswith("--   "):
            break
        body.append(line[len("--   ") :])
    return "".join(f"{stmt};\n" for stmt in body)


# ── 0 · the manifest ───────────────────────────────────────────────────────────────────────────


def test_manifest() -> None:
    print("0 · the manifest declares the upgrade")
    files = migration_files()
    check("009 (the backup table) is declared", TABLE in files, True)
    check(
        "no migration rewrites phones (it cannot know the hub's country)",
        RETIRED in files or (MODULE_DIR / RETIRED).exists(),
        False,
    )
    command = MANIFEST["commands"].get(COMMAND, {})
    check("the rewrite is a command", command.get("sql"), [COMMAND_SQL])
    check("nobody outside the hub can call it", command.get("internal"), True)
    check("it is all or nothing", command.get("transaction"), True)
    tasks = [
        t for t in MANIFEST.get("scheduled_tasks", []) if t.get("command") == COMMAND
    ]
    check("a scheduled task runs it", len(tasks), 1)
    if tasks:
        check(
            "and catches up once, not once per missed tick",
            tasks[0].get("catch_up"),
            "collapse",
        )
    anonymize = MANIFEST["commands"]["customers.anonymize"]["sql"]
    check(
        "the erasure also erases the backup copy",
        "commands/anonymize_phone_backup.sql" in anonymize,
        True,
    )


# ── 1-5 · the upgrade ──────────────────────────────────────────────────────────────────────────


def test_upgrade() -> None:
    print(
        "\n1 · a hub upgrades: every phone the handler would accept is now E.164, in its hub's country"
    )
    db = ScratchDb("customers_phone_e164")
    try:
        db.create()
        db.migrate(before_upgrade())
        db.seed()
        db.migrate([TABLE])
        typed = db.phones()

        print("\n1b · the command only touches the hub it runs for")
        db.sweep([HUB_GB])
        after_gb = db.phones()
        for hub, cid, was, want, _ in CARDS:
            check(
                f"{hub} «{was}» after running for {HUB_GB}",
                after_gb.get(cid),
                want if hub == HUB_GB else typed.get(cid),
            )
        check(
            f"only {HUB_GB} cards have a backup",
            sorted({h for h, _, _ in db.backups().values()}),
            [HUB_GB],
        )

        db.sweep(HUBS)
        phones = db.phones()
        for hub, cid, was, want, _ in CARDS:
            check(f"{hub} «{was}» → «{want}»", phones.get(cid), want)

        print("\n4 · the old text is kept, once per rewritten card, in its hub")
        backups = db.backups()
        want_backups = {
            cid: (hub, was, want) for hub, cid, was, want, _ in CARDS if was != want
        }
        check("one backup per rewritten card, none for the rest", backups, want_backups)

        print("\n5 · running it again changes nothing")
        db.sweep(HUBS)
        check("phones unchanged on a second run", db.phones(), phones)
        check("backups unchanged on a second run", db.backups(), want_backups)

        # A card that went back to typed text by a path that skips the handler: the next tick
        # keeps the FIRST copy (the text from before the upgrade) and does not fail.
        db.run(
            "UPDATE customers_customer SET phone = '0034 600 111 999' WHERE id = 'es-idd'"
        )
        check(
            "a tick over a card whose copy already exists does not fail",
            db.command(COMMAND, {}, HUB_ES, user=""),
            None,
        )
        check(
            "its first copy is kept", db.backups().get("es-idd"), want_backups["es-idd"]
        )
        db.run(
            "UPDATE customers_customer SET phone = '+34600111224' WHERE id = 'es-idd'"
        )

        print(
            "\n4b · erasing a customer's personal data erases her backup copy, in her hub only"
        )
        err = db.command(
            "customers.anonymize",
            {"customer_id": "es-spaces", "reason": "GDPR"},
            HUB_GB,
        )
        check(
            "anonymize from another hub does not touch it",
            "es-spaces" in db.backups(),
            True,
        )
        err = db.command(
            "customers.anonymize",
            {"customer_id": "es-spaces", "reason": "GDPR"},
            HUB_ES,
        )
        check("anonymize goes through", err, None)
        check("her backup copy is gone", "es-spaces" in db.backups(), False)
        check("the others stay", len(db.backups()), len(want_backups) - 1)

        print("\n6 · reversible")
        down = documented_down(TABLE)
        if "customers_customer" not in down or "DROP TABLE" not in down:
            fail(
                "009 must document a `down` that restores the phones and drops the table"
            )
            return
        check(
            "a phone is edited after the upgrade",
            db.run(
                "UPDATE customers_customer SET phone = '+34699999999' WHERE id = 'es-dashes'"
            ),
            None,
        )
        check("the documented down runs", db.run(down), None)
        restored = db.phones()
        for hub, cid, was, want, _ in CARDS:
            if cid == "es-dashes":
                check(
                    "a phone edited after the upgrade is kept",
                    restored.get(cid),
                    "+34699999999",
                )
            elif cid == "es-spaces":
                check("an erased card stays erased", restored.get(cid), "")
            else:
                check(f"«{was}» is back as typed", restored.get(cid), was)
        check(
            "the backup table is gone",
            db.rows("SELECT to_regclass('customers_phone_backup') AS reg")[0]["reg"],
            None,
        )
        db.migrate([TABLE])
        db.sweep([HUB_GB])
        check(
            "the up runs again after the down",
            db.phones().get("gb-trunk"),
            "+447700900123",
        )
    except RuntimeError as exc:
        fail(f"upgrade: {exc}")
    finally:
        db.drop()


# ── 7 · one table, two copies ──────────────────────────────────────────────────────────────────


ROW = re.compile(
    r"\(\s*'([0-9A-Z]+)'\s*,\s*'([0-9]+)'\s*,\s*'([0-9]*)'\s*,\s*'([0-9]*)'\s*,\s*'\{([0-9,]*)\}'"
)
RUST_ROW = re.compile(
    r'iso: "([0-9A-Z]+)", code: "([0-9]+)", trunk: "([0-9]*)", idd: "([0-9]*)", lengths: &\[([0-9, ]*)\]'
)


def test_table_matches_the_handler() -> None:
    print("\n7 · the command's country table is the handler's, row by row")
    if not (MODULE_DIR / COMMAND_SQL).exists():
        fail(f"{COMMAND_SQL} does not exist")
        return
    sql_rows = sorted(
        ROW.findall((MODULE_DIR / COMMAND_SQL).read_text(encoding="utf-8"))
    )
    rust_rows = sorted(
        (iso, code, trunk, idd, lengths.replace(" ", ""))
        for iso, code, trunk, idd, lengths in RUST_ROW.findall(
            METADATA.read_text(encoding="utf-8")
        )
    )
    check("same number of regions", len(sql_rows), len(rust_rows))
    check(
        "same regions, codes, trunks, prefixes and lengths", sql_rows == rust_rows, True
    )


def main() -> int:
    test_manifest()
    try:
        psql(["-tAc", "SELECT 1"])
    except (RuntimeError, OSError) as exc:
        fail(f"no Postgres in container {CONTAINER}: {exc} — this battery never skips")
        return report()
    test_upgrade()
    test_table_matches_the_handler()
    return report()


def report() -> int:
    if failures:
        print(f"\nFAILED ({len(failures)}):")
        for msg in failures:
            print(f"  ✗ {msg}")
        return 1
    print(
        "\n✓ existing cards upgrade to E.164 in their hub's country, with a backup that the erasure clears, reversibly"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
