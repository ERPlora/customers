#!/usr/bin/env python3
"""A hub cannot have two live customer tags, or two live custom fields, with the same name (customers#107).

«Tags» and «Fields» accepted a second «Moroso» / «Alergias» without a word: the list showed two
identical rows and, when tagging a customer or filling in her file, nobody could tell which one was
the right one. Same recipe as groups (customers#94), and the rule lives in the DATABASE, so no
caller (screen, assistant, API) can get around it:

  1. the manifest maps each new index to a domain refusal on create AND on update
     (`customers.tag_name_taken`, `customers.field_name_taken`), declared and translated in `en`
     and `es` — the screen gets the reason, not the platform's generic `db`;
  2. a hub that ALREADY has duplicates upgrades cleanly: the backfill keeps the oldest row under its
     name and renames the others («Moroso (2)»…), even when that suffix is itself taken by a row the
     owner named so; nothing is merged, no tagged customer and no stored field value moves (they
     hang from the id), deleted and inactive rows and other hubs are left exactly as they were;
     running it again changes nothing;
  3. a live, active row holds its name in its hub, ignoring case and surrounding spaces
     («Moroso» = « moroso »); renaming onto it is refused the same way;
  4. soft delete frees the name (ADR-0145 row contract), and so does deactivating — `tags.list` and
     `fields.list` show only active rows, so a «name taken» for an inactive one would point at
     something nobody can see;
  5. tenancy: the name is per hub — hub B creates its own «Moroso» while hub A has one, and hub A
     deleting its «Moroso» neither frees nor blocks hub B;
  6. the index migration is reversible: its documented DOWN runs and the UP runs again after it.

Usage: tests/tag_field_name_unique.pg.test.py   (exit 0 = green)
  Uses the `erplora-test-pg-5433` container by default (override: ERPLORA_TEST_PG_CONTAINER).
  Creates scratch databases and DROPS them at the end, pass or fail. It NEVER skips itself: a
  battery that goes green because it could not reach Postgres is worse than no battery at all.
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
LOCALES = {
    lang: json.loads(
        (MODULE_DIR / "locales" / f"{lang}.json").read_text(encoding="utf-8")
    )
    for lang in ("en", "es")
}
CONTAINER = os.environ.get("ERPLORA_TEST_PG_CONTAINER", "erplora-test-pg-5433")

HUB_A = "hub-a"
HUB_B = "hub-b"
USER = "user-1"
NOW = "2026-10-04T09:00:00+00:00"

DEDUPE = "migrations/postgres/007_tag_field_name_dedupe.sql"
INDEX = "migrations/postgres/008_tag_field_name_unique.sql"


class Entity:
    """What differs between a tag and a custom field; the rule and its checks are the same."""

    def __init__(
        self,
        *,
        noun: str,
        table: str,
        prefix: str,
        id_param: str,
        index: str,
        code: str,
        name: str,
        other: str,
        extra: dict,
        seed_cols: str,
        seed_vals: str,
    ):
        self.noun = noun
        self.table = table
        self.create = f"customers.{prefix}.create"
        self.update = f"customers.{prefix}.update"
        self.delete = f"customers.{prefix}.delete"
        self.id_param = id_param
        self.index = index
        self.code = code
        self.name = name  # the name the recording hub repeated
        self.other = other  # a second, unrelated name
        self.extra = extra  # the rest of the create/update payload
        self.seed_cols = seed_cols
        self.seed_vals = seed_vals


TAG = Entity(
    noun="tag",
    table="customers_customertag",
    prefix="tags",
    id_param="tag_id",
    index="uq_customers_tag_hub_name_live",
    code="customers.tag_name_taken",
    name="Moroso",
    other="Fiel",
    extra={"color": "danger"},
    seed_cols="color",
    seed_vals="'danger'",
)
FIELD = Entity(
    noun="field",
    table="customers_customerfield",
    prefix="fields",
    id_param="field_id",
    index="uq_customers_field_hub_name_live",
    code="customers.field_name_taken",
    name="Alergias",
    other="Talla",
    extra={"field_type": "text", "options": "[]", "is_required": 0, "sort_order": 0},
    seed_cols="field_type, options, is_required, sort_order",
    seed_vals="'text', '[]', 0, 0",
)
ENTITIES = (TAG, FIELD)

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
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def bind(sql: str, params: dict) -> str:
    # `::int` is the Postgres cast, never a bind — the lookbehind leaves it alone, as the runtime's
    # translator does.
    return re.sub(
        r"(?<!:):([a-z_][a-z0-9_]*)",
        lambda m: literal(params.get(m.group(1))),
        sql,
        flags=re.IGNORECASE,
    )


def migration_files() -> list[str]:
    """The manifest's Postgres migrations in order; an entry is a path or `{file, kind}`."""
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

    def create(self, migrations: list[str]) -> None:
        psql(["-c", f'DROP DATABASE IF EXISTS "{self.name}"'])
        psql(["-c", f'CREATE DATABASE "{self.name}"'])
        self.migrate(migrations)

    def migrate(self, migrations: list[str]) -> None:
        for rel in migrations:
            psql([], db=self.name, stdin=(MODULE_DIR / rel).read_text(encoding="utf-8"))

    def drop(self) -> None:
        try:
            psql(["-c", f'DROP DATABASE IF EXISTS "{self.name}" WITH (FORCE)'])
        except RuntimeError as exc:
            print(f"  ! could not drop {self.name}: {exc}")

    def run(self, sql: str) -> str | None:
        """None when it went through; the error text when Postgres refused it."""
        try:
            psql([], db=self.name, stdin="BEGIN;\n" + sql + "\nCOMMIT;")
            return None
        except RuntimeError as exc:
            return str(exc)

    def rows(self, sql: str) -> list[dict]:
        out = psql(
            ["-tAc", f"SELECT COALESCE(json_agg(t), '[]'::json) FROM ({sql}) t"],
            db=self.name,
        )
        return json.loads(out.strip() or "[]")

    def command(self, name: str, payload: dict, hub: str) -> str | None:
        """Runs the manifest command's REAL SQL with the binds the runtime injects."""
        params = dict(payload)
        params.update(
            hub_id=hub,
            current_user_id=USER,
            now=NOW,
            new_id=payload.get("new_id") or f"x-{uuid.uuid4().hex[:8]}",
        )
        body = "\n".join(
            bind((MODULE_DIR / rel).read_text(encoding="utf-8"), params)
            for rel in MANIFEST["commands"][name]["sql"]
        )
        return self.run(body)


def create_row(
    db: ScratchDb, ent: Entity, hub: str, name: str
) -> tuple[str, str | None]:
    rid = f"{ent.noun[0]}-{uuid.uuid4().hex[:8]}"
    err = db.command(ent.create, {"new_id": rid, "name": name, **ent.extra}, hub)
    return rid, err


def update_row(
    db: ScratchDb, ent: Entity, hub: str, rid: str, name: str, is_active: int = 1
) -> str | None:
    return db.command(
        ent.update,
        {ent.id_param: rid, "name": name, "is_active": is_active, **ent.extra},
        hub,
    )


def delete_row(db: ScratchDb, ent: Entity, hub: str, rid: str) -> None:
    err = db.command(ent.delete, {ent.id_param: rid}, hub)
    if err:
        raise RuntimeError(f"fixture: soft delete of {rid} failed: {err}")


def violated_index(err: str | None) -> str | None:
    m = re.search(r'unique constraint "([^"]+)"', err or "")
    return m.group(1) if m else None


def expect_name_taken(ent: Entity, label: str, err: str | None, command: str) -> None:
    if err is None:
        fail(
            f"{label}: went through — a live {ent.noun} already holds that name in this hub"
        )
        return
    index = violated_index(err)
    if index is None:
        fail(f"{label}: refused, but not by a unique index: {err}")
        return
    code = ((MANIFEST["commands"][command].get("on_unique")) or {}).get(index)
    if code != ent.code:
        fail(
            f"{label}: violated `{index}`, which `{command}`.on_unique maps to {code!r} — expected "
            f"{ent.code!r}, or the screen gets the platform's `db` instead of the reason"
        )
        return
    ok(f"{label}: refused as {ent.code}")


def expect_accepted(label: str, err: str | None) -> None:
    if err:
        fail(f"{label}: refused: {err}")
    else:
        ok(label)


# ── 1 · the manifest ───────────────────────────────────────────────────────────────────────────


def test_manifest() -> None:
    print("\n1 · the manifest maps each index to a declared, translated refusal")
    for ent in ENTITIES:
        for command in (ent.create, ent.update):
            check(
                f"{command}.on_unique maps {ent.index}",
                (MANIFEST["commands"][command].get("on_unique") or {}).get(ent.index),
                ent.code,
            )
        check(
            f"module.json errors declares {ent.code}",
            ent.code in (MANIFEST.get("errors") or {}),
            True,
        )
        texts = {
            lang: (LOCALES[lang].get("errors") or {}).get(ent.code, "")
            for lang in LOCALES
        }
        for lang, text in texts.items():
            check(
                f"locales/{lang}.json has a sentence for {ent.code}",
                bool(text.strip()),
                True,
            )
        check(
            f"the Spanish sentence for {ent.code} is a translation, not a copy of the English",
            texts["es"] != texts["en"],
            True,
        )
    files = migration_files()
    check(
        "the dedupe backfill runs BEFORE the index",
        files.index(DEDUPE) < files.index(INDEX)
        if DEDUPE in files and INDEX in files
        else False,
        True,
    )
    check(
        f"{DEDUPE} is declared kind backfill (DML only)",
        migration_kind(DEDUPE),
        "backfill",
    )
    check(f"{INDEX} is an expand (DDL only)", migration_kind(INDEX), "expand")


# ── 2 · a hub that already has duplicates upgrades ─────────────────────────────────────────────


def seed(
    db: ScratchDb,
    ent: Entity,
    rid: str,
    hub: str,
    name: str,
    created: str,
    *,
    deleted=0,
    active=1,
) -> None:
    err = db.run(
        f"INSERT INTO {ent.table} (id, hub_id, name, {ent.seed_cols}, is_active, is_deleted, created_at, updated_at) "
        f"VALUES ({literal(rid)}, {literal(hub)}, {literal(name)}, {ent.seed_vals}, {active}, {deleted}, "
        f"{literal(created)}, {literal(created)});"
    )
    if err:
        raise RuntimeError(f"fixture: seeding {rid} failed: {err}")


def snapshot(db: ScratchDb, ent: Entity) -> dict:
    return {
        r["id"]: (
            r["hub_id"],
            r["name"],
            r["is_active"],
            r["is_deleted"],
            r["updated_at"],
        )
        for r in db.rows(
            f"SELECT id, hub_id, name, is_active, is_deleted, updated_at FROM {ent.table}"
        )
    }


def seed_duplicates(db: ScratchDb, ent: Entity) -> None:
    n = ent.name
    # Hub A, as the recording hub was left: two «Moroso» and a third spelled apart.
    seed(db, ent, "first", HUB_A, n, "2026-09-25T20:00:00+00:00")
    seed(db, ent, "second", HUB_A, n, "2026-09-25T20:05:00+00:00")
    seed(db, ent, "third", HUB_A, f" {n.upper()} ", "2026-09-25T20:10:00+00:00")
    # The owner once named a row with the very suffix the backfill would pick.
    seed(db, ent, "owner-2", HUB_A, f"{n} (2)", "2026-09-25T19:00:00+00:00")
    # …and the one a second numbering round would pick: only the id can still tell them apart.
    seed(db, ent, "owner-2-2", HUB_A, f"{n} (2) (2)", "2026-09-25T19:30:00+00:00")
    # Rows the backfill must NOT touch.
    seed(db, ent, "gone", HUB_A, n, "2026-09-25T18:00:00+00:00", deleted=1, active=0)
    seed(db, ent, "off", HUB_A, n, "2026-09-25T18:30:00+00:00", active=0)
    # Deleted by a path that left `is_active` at 1 (the row contract's generic soft delete only sets
    # `is_deleted`): still history, so it must neither be renamed nor block the index.
    seed(db, ent, "gone-on", HUB_A, n, "2026-09-25T18:10:00+00:00", deleted=1)
    seed(db, ent, "unique", HUB_A, ent.other, "2026-09-25T18:40:00+00:00")
    # Real ids are random: the OLDER row here has the LATER id, so «oldest» cannot be the id.
    seed(db, ent, "z-older", HUB_A, "Mayorista", "2026-09-25T17:00:00+00:00")
    seed(db, ent, "a-newer", HUB_A, "Mayorista", "2026-09-25T17:30:00+00:00")
    seed(db, ent, "b", HUB_B, n, "2026-09-25T21:00:00+00:00")
    seed(db, ent, "b2", HUB_B, n, "2026-09-25T21:05:00+00:00")


def attached(db: ScratchDb, ent: Entity) -> list[dict]:
    """What hangs from the renamed row by id: a tagged customer, or a stored field value."""
    if ent is TAG:
        return db.rows(
            "SELECT tag_id AS ref FROM customers_customer_tags WHERE customer_id = 'c-1'"
        )
    return db.rows(
        "SELECT field_id AS ref, value FROM customers_customerfieldvalue WHERE customer_id = 'c-1'"
    )


def attach(db: ScratchDb, ent: Entity) -> None:
    sql = (
        "INSERT INTO customers_customer (id, hub_id, name, lifecycle_stage, created_at, updated_at) "
        f"VALUES ('c-1', {literal(HUB_A)}, 'Ana', 'active', {literal(NOW)}, {literal(NOW)});"
    )
    if ent is TAG:
        sql += "INSERT INTO customers_customer_tags (customer_id, tag_id) VALUES ('c-1', 'second');"
    else:
        sql += (
            "INSERT INTO customers_customerfieldvalue (id, hub_id, customer_id, field_id, value, created_at, updated_at) "
            f"VALUES ('v-1', {literal(HUB_A)}, 'c-1', 'second', 'Nueces', {literal(NOW)}, {literal(NOW)});"
        )
    err = db.run(sql)
    if err:
        raise RuntimeError(f"fixture: seeding the customer failed: {err}")


def test_upgrade_with_duplicates(ent: Entity) -> None:
    print(
        f"\n2 · [{ent.noun}] a hub that already has duplicates upgrades without losing anything"
    )
    files = migration_files()
    if DEDUPE not in files or INDEX not in files:
        fail(f"{DEDUPE} and {INDEX} are not in the manifest's migrations")
        return
    baseline = files[: files.index(DEDUPE)]
    db = ScratchDb(f"customers_{ent.noun}_name_upgrade")
    try:
        db.create(baseline)
        seed_duplicates(db, ent)
        attach(db, ent)
        before = snapshot(db, ent)
        attached_before = attached(db, ent)

        try:
            db.migrate(files[files.index(DEDUPE) :])
        except RuntimeError as exc:
            fail(
                f"the upgrade aborts on a hub that already has duplicate {ent.noun}s: {exc}"
            )
            return
        after = snapshot(db, ent)
        n = ent.name

        check(f"no {ent.noun} was added or removed", sorted(after), sorted(before))
        check(f"the OLDEST «{n}» keeps its name", after["first"][1], n)
        check(
            "the OLDER «Mayorista» keeps its name even with the later id",
            after["z-older"],
            before["z-older"],
        )
        check(
            "the newer «Mayorista» is the one numbered",
            after["a-newer"][1],
            "Mayorista (2)",
        )
        for rid in ("gone", "gone-on", "off", "unique", "owner-2", "owner-2-2"):
            check(f"{rid} is left exactly as it was", after[rid], before[rid])
        # Hub B is deduplicated on its own: its oldest keeps the name although hub A's are older,
        # and its second is numbered from (2) — hub A's rows are never counted.
        check(f"hub B's oldest «{n}» keeps its name", after["b"], before["b"])
        check("hub B's second one is numbered within hub B", after["b2"][1], f"{n} (2)")
        check(
            "the one whose (2) suffix the owner had already taken gets its id instead",
            after["second"][1],
            f"{n} (2) (second)",
        )
        for rid in ("second", "third"):
            check(
                f"{rid} stays live and active (renamed, not deleted)",
                after[rid][2:4],
                (1, 0),
            )
            check(f"{rid} was renamed", after[rid][1] != before[rid][1], True)
            check(
                f"{rid} keeps its name as a prefix, so the owner recognises it",
                after[rid][1].startswith(before[rid][1].strip()),
                True,
            )
        live_keys = [
            (h, name.strip().lower())
            for h, name, active, deleted, _ in after.values()
            if active == 1 and deleted == 0
        ]
        check(
            f"no hub has two live {ent.noun}s with the same name any more",
            len(live_keys),
            len(set(live_keys)),
        )
        check(
            f"what hangs from the renamed {ent.noun} stays on it (nothing merged or moved)",
            attached(db, ent),
            attached_before,
        )

        try:
            db.migrate(files[files.index(DEDUPE) :])
        except RuntimeError as exc:
            fail(f"the upgrade is not re-entrant (second boot aborts): {exc}")
            return
        check("a second boot changes nothing", snapshot(db, ent), after)
    finally:
        db.drop()


# ── 3-5 · the rule, on a fresh hub ─────────────────────────────────────────────────────────────


def test_rule(ent: Entity) -> None:
    n = ent.name
    print(
        f"\n3 · [{ent.noun}] a live {ent.noun} holds its name in its hub, ignoring case and surrounding spaces"
    )
    db = ScratchDb(f"customers_{ent.noun}_name_rule")
    try:
        db.create(migration_files())
        first, err = create_row(db, ent, HUB_A, n)
        if err:
            fail(f"fixture: the first «{n}» was refused: {err}")
            return
        _, err = create_row(db, ent, HUB_A, n)
        expect_name_taken(ent, f"a second «{n}» in the same hub", err, ent.create)
        _, err = create_row(db, ent, HUB_A, f"  {n.lower()} ")
        expect_name_taken(
            ent,
            f"«  {n.lower()} » in the same hub (case and spaces do not make it another {ent.noun})",
            err,
            ent.create,
        )

        other, err = create_row(db, ent, HUB_A, ent.other)
        expect_accepted(f"a {ent.noun} with another name is created", err)
        err = update_row(db, ent, HUB_A, other, n.upper())
        expect_name_taken(
            ent, f"renaming «{ent.other}» onto the live «{n}»", err, ent.update
        )
        err = update_row(db, ent, HUB_A, first, n)
        expect_accepted(f"saving a {ent.noun} under its OWN name is not a clash", err)

        print(f"\n4 · [{ent.noun}] deleting or deactivating frees the name")
        delete_row(db, ent, HUB_A, first)
        again, err = create_row(db, ent, HUB_A, n)
        expect_accepted(f"the name of a DELETED {ent.noun} can be created again", err)
        check(
            f"the deleted «{n}» stays deleted under its name",
            db.rows(
                f"SELECT name, is_deleted FROM {ent.table} WHERE id = {literal(first)}"
            ),
            [{"name": n, "is_deleted": 1}],
        )
        err = update_row(db, ent, HUB_A, again, n, is_active=0)
        expect_accepted(f"deactivating the live «{n}»", err)
        _, err = create_row(db, ent, HUB_A, n)
        expect_accepted(
            f"an INACTIVE {ent.noun} (in no list) does not hold its name", err
        )
        err = update_row(db, ent, HUB_A, again, n, is_active=1)
        expect_name_taken(
            ent, "reactivating one whose name is now taken", err, ent.update
        )

        print(f"\n5 · [{ent.noun}] tenancy: the name is per hub")
        b_row, err = create_row(db, ent, HUB_B, n)
        expect_accepted(f"hub B creates its own «{n}» while hub A has one", err)
        _, err = create_row(db, ent, HUB_B, n.lower())
        expect_name_taken(ent, f"a second «{n}» in hub B", err, ent.create)
        for row in db.rows(
            f"SELECT id FROM {ent.table} WHERE hub_id = {literal(HUB_A)} AND is_deleted = 0 "
            f"AND is_active = 1 AND name = {literal(n)}"
        ):
            delete_row(db, ent, HUB_A, row["id"])
        _, err = create_row(db, ent, HUB_B, n)
        expect_name_taken(
            ent, f"hub A deleting its «{n}» does not free hub B's", err, ent.create
        )
        _, err = create_row(db, ent, HUB_A, n)
        expect_accepted(f"hub B's live «{n}» does not block hub A", err)
        check(
            f"hub B's «{n}» is untouched",
            db.rows(
                f"SELECT name, is_deleted FROM {ent.table} WHERE id = {literal(b_row)}"
            ),
            [{"name": n, "is_deleted": 0}],
        )
    finally:
        db.drop()


# ── 6 · reversible ─────────────────────────────────────────────────────────────────────────────


def documented_down(rel: str) -> str:
    """The `-- DOWN` block of a migration, uncommented: the reverse the runbook would run."""
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


def indexes(db: ScratchDb, ent: Entity) -> list[str]:
    return [
        r["indexname"]
        for r in db.rows(
            f"SELECT indexname FROM pg_indexes WHERE tablename = '{ent.table}'"
        )
    ]


def test_down() -> None:
    print("\n6 · the index migration is reversible")
    down = documented_down(INDEX) if (MODULE_DIR / INDEX).exists() else ""
    if not down:
        fail(f"{INDEX} does not document its `down` (a `-- DOWN` block)")
        return
    db = ScratchDb("customers_tag_field_name_down")
    try:
        db.create(migration_files())
        err = db.run(down)
        expect_accepted("the documented down runs", err)
        for ent in ENTITIES:
            check(
                f"after the down {ent.index} is gone",
                ent.index in indexes(db, ent),
                False,
            )
            _, e1 = create_row(db, ent, HUB_A, ent.name)
            _, e2 = create_row(db, ent, HUB_A, ent.name)
            check(
                f"after the down a duplicate {ent.noun} goes through again (the old behaviour)",
                (e1, e2),
                (None, None),
            )
        db.migrate([DEDUPE, INDEX])
        for ent in ENTITIES:
            check(
                f"the up runs again after the down (dedupe first) and rebuilds {ent.index}",
                ent.index in indexes(db, ent),
                True,
            )
    except RuntimeError as exc:
        fail(f"reversibility: {exc}")
    finally:
        db.drop()


def main() -> int:
    test_manifest()
    try:
        psql(["-tAc", "SELECT 1"])
    except (RuntimeError, OSError) as exc:
        fail(f"no Postgres in container {CONTAINER}: {exc} — this battery never skips")
        return report()
    for ent in ENTITIES:
        test_upgrade_with_duplicates(ent)
        test_rule(ent)
    test_down()
    return report()


def report() -> int:
    if failures:
        print(f"\nFAILED ({len(failures)}):")
        for msg in failures:
            print(f"  ✗ {msg}")
        return 1
    print(
        "\n✓ one live tag and one live field per name and hub (case/spaces ignored), duplicates renamed on upgrade, per hub, reversibly"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
