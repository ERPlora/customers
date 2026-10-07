#!/usr/bin/env python3
"""`customers.by_phone` — the same number is the same number, however it was typed (whatsapp_inbox#162).

Why this file exists. WhatsApp (and any caller id) gives the number in international form, digits
only: `34600111222`. The owner types it on the card as she always has: `600 111 222`,
`+34 600-111-222`, `0034 600 111 222`. `customers.list` filters `phone` with a LIKE over the RAW
column, so `LIKE '%34600111222%'` never finds any of those cards: the inbox did not know whose the
conversation was, and the «from WhatsApp» recipes treated a regular customer as a stranger.

`customers.by_phone` compares NUMBERS: both sides reduced to digits, leading zeros (the `00`
international prefix, a national trunk `0`) dropped, and a card written without the country code
matches when the other side is that number plus the calling code of the BUSINESS's country (and
the other way round). Seven digits at least: a short number is an extension, not an identity.

A card without a prefix is a number of the business's own country (whatsapp_inbox#199, the same
rule the inbox applies since #167): a French `33 600 111 222` writing to a Spanish salon is NOT
the local card `600 111 222`. The country is the hub's `hub_settings.country_code`, `ES` when the
row is absent (the runtime's default), and so is a code the alta does not know (customers#130).

What is checked here, against a real Postgres and bound the way the runtime binds it:
1. every usual way of typing the same number finds the card;
2. a longer number that merely CONTAINS it, a short fragment and a card with no phone do not;
3. the same national digits behind ANOTHER country's code are somebody else;
4. the other hub's card and a deleted card are never returned;
5. in a country whose national numbers keep their leading 0 behind the calling code (Italian
   landlines, whatsapp_inbox#201), the card keeps it too — and only that form is her;
6. an empty or absent phone answers NOTHING — never the whole customer list.

Usage: tests/by_phone.pg.test.py   (exit 0 = green)
  Uses the `erplora-test-pg-5433` container by default (override: ERPLORA_TEST_PG_CONTAINER).
  Creates a scratch database and DROPS it at the end, pass or fail. If Docker or the container is
  missing the SQL half is SKIPPED, never passed.
"""

import importlib.util
import json
import pathlib
import subprocess
import sys
import uuid

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())
# A migration entry is a path or `{file, kind}` (kind: expand/backfill/contract).
MIGRATIONS = [
    e if isinstance(e, str) else e["file"] for e in MANIFEST["migrations"]["postgres"]
]
QUERY = "customers.by_phone"
HUB_A = "hub-a"
HUB_B = "hub-b"
HUB_FR = "hub-fr"
HUB_GB = "hub-gb"
HUB_NOCODE = "hub-nocode"
HUB_IT = "hub-it"
HUB_CI = "hub-ci"
HUB_RW = "hub-rw"
# customers#130: a hub whose cards are stored the way every write saves them since customers#121
# (E.164), plus the leftovers the sweep `phones_to_e164` meets (not yet rewritten, unreadable).
# No settings row: Spain.
HUB_130 = "hub-130"

# The core table the country is read from (`crates/runtime/src/system_migrations.rs` v4). HUB_A has
# NO row on purpose: a fresh hub that never saved its settings is `ES`, the runtime's default.
CORE_TABLES = """
CREATE TABLE hub_settings (
  hub_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
  updated_at TEXT NOT NULL, updated_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (hub_id, key));
"""
SETTINGS = [
    # hub, country_code as stored
    (HUB_B, "ES"),
    (HUB_FR, " fr "),
    (HUB_GB, "GB"),
    (HUB_NOCODE, "ZZ"),
    (HUB_IT, "IT"),
    (HUB_CI, " ci "),
    (HUB_RW, "RW"),
]


def load(name):
    path = MODULE_DIR / "tests" / name
    spec = importlib.util.spec_from_file_location(name.replace(".", "_"), path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# One psql runner and one binder, shared with the stats gate: they cannot drift apart.
S = load("stats.pg.test.py")
S.DB = f"customers_by_phone_{uuid.uuid4().hex[:8]}"
failures = S.failures
check = S.check

CARDS = [
    # id, hub, phone, deleted
    ("c-intl", HUB_A, "+34 600 111 222", 0),
    ("c-national", HUB_A, "600111333", 0),
    ("c-double-zero", HUB_A, "0034 600-111-444", 0),
    ("c-with-prefix", HUB_A, "+34600111555", 0),
    ("c-foreign", HUB_A, "+33 600 111 999", 0),
    ("c-longer", HUB_A, "+346001112229", 0),
    ("c-four-digit-prefix", HUB_A, "+1234 600 111 777", 0),
    ("c-fragment", HUB_A, "111222", 0),
    ("c-empty", HUB_A, "", 0),
    ("c-deleted", HUB_A, "+34600111666", 1),
    ("c-other-hub", HUB_B, "+34600111222", 0),
    ("c-fr-national", HUB_FR, "06 00 11 18 88", 0),
    ("c-uk-trunk", HUB_GB, "07700 900123", 0),
    ("c-nocode-national", HUB_NOCODE, "600111333", 0),
    ("c-nocode-intl", HUB_NOCODE, "+34 600 111 444", 0),
    ("c-it-landline", HUB_IT, "06 1234567", 0),
    ("c-it-mobile", HUB_IT, "333 123 4567", 0),
    ("c-it-intl-landline", HUB_IT, "+39 06 7654321", 0),
    ("c-ci-national", HUB_CI, "07 07 12 34 56", 0),
    ("c-rw-trunk", HUB_RW, "078 123 4567", 0),
    ("c130-uk", HUB_130, "+447700900123", 0),
    ("c130-es", HUB_130, "+34600111222", 0),
    ("c130-typed", HUB_130, "0034 655 44 33 22", 0),
    ("c130-unreadable", HUB_130, "+34 6001112229", 0),
    # Typed before customers#121 without its «+»: in a Spanish hub the sweep cannot read it.
    ("c130-unreadable-intl", HUB_130, "447700900123", 0),
    ("c130-de", HUB_130, "+493012345678", 0),
]


def seed():
    S.psql([], db=S.DB, stdin=CORE_TABLES)
    settings = ",".join(
        f"('{hub}', 'country_code', '{code}', '{S.NOW}', 'system')"
        for hub, code in SETTINGS
    )
    S.psql(
        [],
        db=S.DB,
        stdin="INSERT INTO hub_settings (hub_id, key, value, updated_at, updated_by)"
        f" VALUES {settings};",
    )
    values = ",".join(
        f"('{cid}', '{hub}', 'Customer {cid}', '{phone}', {deleted}, '{S.NOW}', '{S.NOW}')"
        for cid, hub, phone, deleted in CARDS
    )
    S.psql(
        [],
        db=S.DB,
        stdin="INSERT INTO customers_customer (id, hub_id, name, phone, is_deleted, created_at,"
        f" updated_at) VALUES {values};",
    )


def found(hub: str, phone) -> list[str]:
    """Ids `customers.by_phone` answers, bound exactly like the runtime binds it."""
    sql = (MODULE_DIR / MANIFEST["queries"][QUERY]["sql"]).read_text()
    rows = S.q(
        "SELECT COALESCE(json_agg(id ORDER BY id), '[]') FROM ("
        + S.bind(sql, {"hub_id": hub, "phone": phone}).rstrip().rstrip(";")
        + ") l"
    )
    return json.loads(rows)


def check_manifest():
    spec = MANIFEST.get("queries", {}).get(QUERY)
    check(f"{QUERY} is declared", True, bool(spec))
    if not spec:
        return
    check(
        f"{QUERY} is read-gated like the list",
        "customers.view_customer",
        spec.get("permission"),
    )
    check(
        f"{QUERY} is not a paginated list (its filter IS the query)",
        None,
        spec.get("list"),
    )
    schema_rel = spec.get("schema")
    check(f"{QUERY} declares a schema", True, bool(schema_rel))
    if schema_rel:
        schema = json.loads((MODULE_DIR / schema_rel).read_text())
        check(
            f"{QUERY} schema accepts an absent phone (a listener must not dead-letter)",
            [],
            schema.get("required", []),
        )


def main() -> int:
    print("· the manifest")
    check_manifest()
    if failures:
        return 1
    if not S.docker_available():
        print(
            f"SKIPPED: no Postgres in container {S.CONTAINER} (SQL half; nothing was verified)"
        )
        return 1 if failures else 0

    S.psql(["-c", f"CREATE DATABASE {S.DB}"])
    try:
        for rel in MIGRATIONS:
            S.psql([], db=S.DB, stdin=(MODULE_DIR / rel).read_text())
        seed()

        print("· every usual way of typing the number finds the card")
        check(
            "WhatsApp digits → card typed with + and spaces",
            ["c-intl"],
            found(HUB_A, "34600111222"),
        )
        check("with + → the same card", ["c-intl"], found(HUB_A, "+34600111222"))
        check(
            "WhatsApp digits → card typed WITHOUT the country code",
            ["c-national"],
            found(HUB_A, "34600111333"),
        )
        check(
            "WhatsApp digits → card typed with the 00 prefix",
            ["c-double-zero"],
            found(HUB_A, "34600111444"),
        )
        check(
            "a search typed with 00 → card typed WITHOUT the country code",
            ["c-national"],
            found(HUB_A, "0034 600 111 333"),
        )
        check(
            "a national search → card typed with the country code",
            ["c-with-prefix"],
            found(HUB_A, "600 111 555"),
        )
        check(
            "UK hub: card with the trunk 0 → the +44 number",
            ["c-uk-trunk"],
            found(HUB_GB, "447700900123"),
        )
        check(
            "French hub: national card with the trunk 0 → the +33 number",
            ["c-fr-national"],
            found(HUB_FR, "33600111888"),
        )

        print("· another country's code in front is somebody else (whatsapp_inbox#199)")
        check(
            "Spanish hub (no settings row = ES): a French number is not the national card",
            [],
            found(HUB_A, "33600111333"),
        )
        check(
            "Spanish hub: a UK number is not the national card either",
            [],
            found(HUB_A, "44600111333"),
        )
        check(
            "Spanish hub: a card typed WITH a foreign code answers that number exactly",
            ["c-foreign"],
            found(HUB_A, "33600111999"),
        )
        check(
            "Spanish hub: the national digits of a foreign card are a Spanish number, not her",
            [],
            found(HUB_A, "600111999"),
        )
        check(
            "Spanish hub: the foreign card is not the same digits behind +34",
            [],
            found(HUB_A, "34600111999"),
        )
        check(
            "French hub: the Spanish number is not the French national card",
            [],
            found(HUB_FR, "34600111888"),
        )
        check(
            "UK hub: the UK card is not found from a Spanish hub's point of view",
            [],
            found(HUB_A, "447700900123"),
        )
        check(
            "customers#130: a country the alta does not know is Spain, as the alta reads it",
            ["c-nocode-national"],
            found(HUB_NOCODE, "34600111333"),
        )
        check(
            "customers#130: a country the alta does not know: a national search is a Spanish number",
            ["c-nocode-intl"],
            found(HUB_NOCODE, "600111444"),
        )
        check(
            "a country the alta does not know: the exact number still finds her",
            ["c-nocode-intl"],
            found(HUB_NOCODE, "0034 600 111 444"),
        )

        print(
            "· a country that keeps the leading 0 in the international number (customers#82)"
        )
        check(
            "Italian hub: the landline card «06 …» → the +39 06 … number",
            ["c-it-landline"],
            found(HUB_IT, "39061234567"),
        )
        check(
            "Italian hub: the landline without its 0 behind +39 is another number",
            [],
            found(HUB_IT, "3961234567"),
        )
        check(
            "Italian hub: a national search «06 …» → the card typed with +39 06",
            ["c-it-intl-landline"],
            found(HUB_IT, "06 7654321"),
        )
        check(
            "Italian hub: a mobile (no leading 0) still matches behind +39",
            ["c-it-mobile"],
            found(HUB_IT, "393331234567"),
        )
        check(
            "Ivorian hub (lower-case, padded setting): the national card keeps its 0 behind +225",
            ["c-ci-national"],
            found(HUB_CI, "2250707123456"),
        )
        check(
            "Rwandan hub: the 0 IS a trunk prefix, dropped behind +250",
            ["c-rw-trunk"],
            found(HUB_RW, "250781234567"),
        )
        check(
            "customers#130: Rwandan hub: a trunk 0 behind +250 goes, as the alta reads «+44 (0)…»",
            ["c-rw-trunk"],
            found(HUB_RW, "2500781234567"),
        )

        print("· containing is not being")
        check(
            "a longer number that contains it is somebody else",
            ["c-intl"],
            found(HUB_A, "34600111222"),
        )
        check(
            "customers#130: a card no reading makes possible answers nobody, not even its digits",
            [],
            found(HUB_A, "+346001112229"),
        )
        check(
            "searching for the fragment itself finds nobody", [], found(HUB_A, "111222")
        )
        check("a number nobody has", [], found(HUB_A, "34699999999"))
        check(
            "a short card is not found by a longer number ending in it",
            ["c-intl"],
            found(HUB_A, "600111222"),
        )
        check(
            "a short search does not find a card ending in it",
            [],
            found(HUB_A, "111333"),
        )
        check(
            "FOUR digits in front of the search on the card are not a country code",
            [],
            found(HUB_A, "600111777"),
        )
        check(
            "the card plus FOUR digits is not a country code",
            [],
            found(HUB_A, "1234600111333"),
        )

        print("· the question is read with the alta's rules (customers#130)")
        check(
            "customers#130: «+44 (0)7700 900123» is the card the alta saved as +447700900123",
            ["c130-uk"],
            found(HUB_130, "+44 (0)7700 900123"),
        )
        check(
            "customers#130: the 00 prefix and the (0) together",
            ["c130-uk"],
            found(HUB_130, "0044 (0)7700 900123"),
        )
        check(
            "customers#130: WhatsApp digits of a foreign number find its E.164 card",
            ["c130-uk"],
            found(HUB_130, "447700900123"),
        )
        check(
            "customers#130: punctuation the alta accepts («(+34) 600.11.12.22»)",
            ["c130-es"],
            found(HUB_130, "(+34) 600.11.12.22"),
        )
        check(
            "customers#130: a national question finds the E.164 card",
            ["c130-es"],
            found(HUB_130, "600 111 222"),
        )
        check(
            "customers#130: a card the sweep has not rewritten yet is read as the sweep will",
            ["c130-typed"],
            found(HUB_130, "+34 655 443 322"),
        )
        check(
            "customers#130: a card the sweep could not read is nobody, not its typed digits",
            [],
            found(HUB_130, "+346001112229"),
        )
        check(
            "customers#130: a card the sweep could not read gets no WhatsApp reading of its own",
            ["c130-uk"],
            found(HUB_130, "+44 7700 900123"),
        )
        check(
            "customers#130: a trunk 0 goes even where the number would be possible with it",
            ["c130-de"],
            found(HUB_130, "+49 (0)30 12345678"),
        )
        check(
            "customers#130: a no-break space, as the alta reads it",
            ["c130-es"],
            found(HUB_130, "600\u00a0111\u00a0222"),
        )
        check(
            "customers#130: a question the alta refuses is nobody («600111»)",
            [],
            found(HUB_130, "600111"),
        )
        check(
            "customers#130: the same national digits behind another code are somebody else",
            [],
            found(HUB_130, "+33 600 111 222"),
        )

        print("· tenancy and soft-delete")
        check(
            "hub B only sees its own card", ["c-other-hub"], found(HUB_B, "34600111222")
        )
        check("a deleted card is never returned", [], found(HUB_A, "34600111666"))

        print("· no phone means no rows, never the whole list")
        check("empty phone", [], found(HUB_A, ""))
        check("absent phone (NULL bind)", [], found(HUB_A, None))
        check("only punctuation", [], found(HUB_A, "+ -"))
    finally:
        subprocess.run(
            ["docker", "exec", S.CONTAINER, "dropdb", "-U", "postgres", "--force", S.DB]
        )

    if failures:
        print(f"\n{len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nOK: customers.by_phone matches numbers, not text, and stays hub-scoped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
