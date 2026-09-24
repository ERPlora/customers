#!/usr/bin/env python3
"""`customers.by_phone` — the same number is the same number, however it was typed (whatsapp_inbox#162).

Why this file exists. WhatsApp (and any caller id) gives the number in international form, digits
only: `34600111222`. The owner types it on the card as she always has: `600 111 222`,
`+34 600-111-222`, `0034 600 111 222`. `customers.list` filters `phone` with a LIKE over the RAW
column, so `LIKE '%34600111222%'` never finds any of those cards: the inbox did not know whose the
conversation was, and the «from WhatsApp» recipes treated a regular customer as a stranger.

`customers.by_phone` compares NUMBERS: both sides reduced to digits, leading zeros (the `00`
international prefix, a national trunk `0`) dropped, and a card written without the country code
matches when the other side is that number plus a 1-3 digit country code (and the other way
round). Seven digits at least: a short number is an extension, not an identity.

What is checked here, against a real Postgres and bound the way the runtime binds it:
1. every usual way of typing the same number finds the card;
2. a longer number that merely CONTAINS it, a short fragment and a card with no phone do not;
3. the other hub's card and a deleted card are never returned;
4. an empty or absent phone answers NOTHING — never the whole customer list.

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
QUERY = "customers.by_phone"
HUB_A = "hub-a"
HUB_B = "hub-b"


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
    ("c-uk-trunk", HUB_A, "07700 900123", 0),
    ("c-longer", HUB_A, "+346001112229", 0),
    ("c-fragment", HUB_A, "111222", 0),
    ("c-empty", HUB_A, "", 0),
    ("c-deleted", HUB_A, "+34600111666", 1),
    ("c-other-hub", HUB_B, "+34600111222", 0),
]


def seed():
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
        for rel in MANIFEST["migrations"]["postgres"]:
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
            "a national search → card typed with the country code",
            ["c-with-prefix"],
            found(HUB_A, "600 111 555"),
        )
        check(
            "UK: card with the trunk 0 → the +44 number",
            ["c-uk-trunk"],
            found(HUB_A, "447700900123"),
        )

        print("· containing is not being")
        check(
            "a longer number that contains it is somebody else",
            ["c-intl"],
            found(HUB_A, "34600111222"),
        )
        check(
            "the longer card only answers its own number",
            ["c-longer"],
            found(HUB_A, "+346001112229"),
        )
        check(
            "searching for the fragment itself finds nobody", [], found(HUB_A, "111222")
        )
        check("a number nobody has", [], found(HUB_A, "34699999999"))
        check(
            "the card plus FOUR digits is not a country code",
            [],
            found(HUB_A, "1234600111333"),
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
