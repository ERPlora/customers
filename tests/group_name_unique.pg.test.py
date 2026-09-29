#!/usr/bin/env python3
"""A hub cannot have two live customer groups with the same name (customers#94).

«Groups» accepted a second «Fidelidad nueva» without a word: the list showed two identical rows and
nobody could tell which one to assign a customer to. The rule now lives in the DATABASE, so no
caller (screen, assistant, API) can get around it:

  1. the manifest maps the new index to a domain refusal on create AND on update
     (`customers.group_name_taken`), declared and translated in `en` and `es` — the screen gets the
     reason, not the platform's generic `db`;
  2. a hub that ALREADY has duplicates upgrades cleanly: the backfill keeps the oldest group under
     its name and renames the others («Fidelidad nueva (2)»…), even when that suffix is itself taken
     by a group the owner named so; nothing is merged, no membership moves, deleted and inactive
     groups and other hubs are left exactly as they were; running it again changes nothing;
  3. a live, active group holds its name in its hub, ignoring case and surrounding spaces
     («VIP» = « vip »); renaming onto it is refused the same way;
  4. soft delete frees the name (ADR-0145 row contract), and so does deactivating — an inactive
     group is in no list, so a «name taken» for it would point at something nobody can see;
  5. tenancy: the name is per hub — hub B creates its own «VIP» while hub A has one, and hub A
     deleting its «VIP» neither frees nor blocks hub B;
  6. the index migration is reversible: its documented DOWN runs and the UP runs again after it.

Usage: tests/group_name_unique.pg.test.py   (exit 0 = green)
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
NOW = "2026-09-29T09:00:00+00:00"

CREATE = "customers.groups.create"
UPDATE = "customers.groups.update"
DELETE = "customers.groups.delete"
LIVE_INDEX = "uq_customers_group_hub_name_live"
NAME_TAKEN = "customers.group_name_taken"
DEDUPE = "migrations/postgres/005_group_name_dedupe.sql"
INDEX = "migrations/postgres/006_group_name_unique.sql"

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
            new_id=payload.get("new_id") or f"g-{uuid.uuid4().hex[:8]}",
        )
        body = "\n".join(
            bind((MODULE_DIR / rel).read_text(encoding="utf-8"), params)
            for rel in MANIFEST["commands"][name]["sql"]
        )
        return self.run(body)


def create_group(
    db: ScratchDb, hub: str, name: str, gid: str | None = None
) -> tuple[str, str | None]:
    gid = gid or f"g-{uuid.uuid4().hex[:8]}"
    err = db.command(
        CREATE,
        {
            "new_id": gid,
            "name": name,
            "description": "",
            "color": "primary",
            "sort_order": 0,
        },
        hub,
    )
    return gid, err


def update_group(
    db: ScratchDb, hub: str, gid: str, name: str, is_active: int = 1
) -> str | None:
    return db.command(
        UPDATE,
        {
            "group_id": gid,
            "name": name,
            "description": "",
            "color": "primary",
            "sort_order": 0,
            "is_active": is_active,
        },
        hub,
    )


def delete_group(db: ScratchDb, hub: str, gid: str) -> None:
    err = db.command(DELETE, {"group_id": gid}, hub)
    if err:
        raise RuntimeError(f"fixture: soft delete of {gid} failed: {err}")


def violated_index(err: str | None) -> str | None:
    m = re.search(r'unique constraint "([^"]+)"', err or "")
    return m.group(1) if m else None


def expect_name_taken(label: str, err: str | None, command: str) -> None:
    if err is None:
        fail(
            f"{label}: went through — a live group already holds that name in this hub"
        )
        return
    index = violated_index(err)
    if index is None:
        fail(f"{label}: refused, but not by a unique index: {err}")
        return
    code = ((MANIFEST["commands"][command].get("on_unique")) or {}).get(index)
    if code != NAME_TAKEN:
        fail(
            f"{label}: violated `{index}`, which `{command}`.on_unique maps to {code!r} — expected "
            f"{NAME_TAKEN!r}, or the screen gets the platform's `db` instead of the reason"
        )
        return
    ok(f"{label}: refused as {NAME_TAKEN}")


def expect_accepted(label: str, err: str | None) -> None:
    if err:
        fail(f"{label}: refused: {err}")
    else:
        ok(label)


# ── 1 · the manifest ───────────────────────────────────────────────────────────────────────────


def test_manifest() -> None:
    print("\n1 · the manifest maps the index to a declared, translated refusal")
    for command in (CREATE, UPDATE):
        check(
            f"{command}.on_unique maps {LIVE_INDEX}",
            (MANIFEST["commands"][command].get("on_unique") or {}).get(LIVE_INDEX),
            NAME_TAKEN,
        )
    check(
        f"module.json errors declares {NAME_TAKEN}",
        NAME_TAKEN in (MANIFEST.get("errors") or {}),
        True,
    )
    texts = {
        lang: (LOCALES[lang].get("errors") or {}).get(NAME_TAKEN, "")
        for lang in LOCALES
    }
    for lang, text in texts.items():
        check(
            f"locales/{lang}.json has a sentence for {NAME_TAKEN}",
            bool(text.strip()),
            True,
        )
    check(
        "the Spanish sentence is a translation, not a copy of the English",
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
    db: ScratchDb, gid: str, hub: str, name: str, created: str, *, deleted=0, active=1
) -> None:
    err = db.run(
        "INSERT INTO customers_customergroup (id, hub_id, name, description, color, sort_order, is_active, is_deleted, created_at, updated_at) "
        f"VALUES ({literal(gid)}, {literal(hub)}, {literal(name)}, '', 'primary', 0, {active}, {deleted}, {literal(created)}, {literal(created)});"
    )
    if err:
        raise RuntimeError(f"fixture: seeding {gid} failed: {err}")


def snapshot(db: ScratchDb) -> dict:
    return {
        r["id"]: (
            r["hub_id"],
            r["name"],
            r["is_active"],
            r["is_deleted"],
            r["updated_at"],
        )
        for r in db.rows(
            "SELECT id, hub_id, name, is_active, is_deleted, updated_at FROM customers_customergroup"
        )
    }


def test_upgrade_with_duplicates() -> None:
    print(
        "\n2 · a hub that already has duplicate groups upgrades without losing anything"
    )
    files = migration_files()
    if DEDUPE not in files or INDEX not in files:
        fail(f"{DEDUPE} and {INDEX} are not in the manifest's migrations")
        return
    baseline = files[: files.index(DEDUPE)]
    db = ScratchDb("customers_group_name_upgrade")
    try:
        db.create(baseline)
        # Hub A, as the recording hub was left: two «Fidelidad nueva» and a third spelled apart.
        seed(db, "g-first", HUB_A, "Fidelidad nueva", "2026-09-25T20:00:00+00:00")
        seed(db, "g-second", HUB_A, "Fidelidad nueva", "2026-09-25T20:05:00+00:00")
        seed(db, "g-third", HUB_A, " fidelidad NUEVA ", "2026-09-25T20:10:00+00:00")
        # The owner once named a group with the very suffix the backfill would pick.
        seed(db, "g-owner-2", HUB_A, "Fidelidad nueva (2)", "2026-09-25T19:00:00+00:00")
        # Rows the backfill must NOT touch.
        seed(
            db,
            "g-gone",
            HUB_A,
            "Fidelidad nueva",
            "2026-09-25T18:00:00+00:00",
            deleted=1,
            active=0,
        )
        seed(
            db, "g-off", HUB_A, "Fidelidad nueva", "2026-09-25T18:30:00+00:00", active=0
        )
        seed(db, "g-vip", HUB_A, "VIP", "2026-09-25T18:40:00+00:00")
        seed(db, "g-b", HUB_B, "Fidelidad nueva", "2026-09-25T21:00:00+00:00")
        seed(db, "g-b2", HUB_B, "Fidelidad nueva", "2026-09-25T21:05:00+00:00")
        err = db.run(
            "INSERT INTO customers_customer (id, hub_id, name, lifecycle_stage, created_at, updated_at) "
            f"VALUES ('c-1', {literal(HUB_A)}, 'Ana', 'active', {literal(NOW)}, {literal(NOW)});"
            "INSERT INTO customers_customer_groups (customer_id, group_id) VALUES ('c-1', 'g-second');"
        )
        if err:
            raise RuntimeError(f"fixture: seeding the customer failed: {err}")
        before = snapshot(db)

        try:
            db.migrate(files[files.index(DEDUPE) :])
        except RuntimeError as exc:
            fail(f"the upgrade aborts on a hub that already has duplicates: {exc}")
            return
        after = snapshot(db)

        check("no group was added or removed", sorted(after), sorted(before))
        check(
            "the OLDEST «Fidelidad nueva» keeps its name",
            after["g-first"][1],
            "Fidelidad nueva",
        )
        for gid in ("g-gone", "g-off", "g-vip", "g-owner-2"):
            check(f"{gid} is left exactly as it was", after[gid], before[gid])
        # Hub B is deduplicated on its own: its oldest keeps the name although hub A's are older,
        # and its second is numbered from (2) — hub A's rows are never counted.
        check("hub B's oldest «Fidelidad nueva» keeps its name", after["g-b"], before["g-b"])
        check("hub B's second one is numbered within hub B", after["g-b2"][1], "Fidelidad nueva (2)")
        for gid in ("g-second", "g-third"):
            check(
                f"{gid} stays live and active (renamed, not deleted)",
                after[gid][2:4],
                (1, 0),
            )
            check(f"{gid} was renamed", after[gid][1] != before[gid][1], True)
            check(
                f"{gid} keeps its name as a prefix, so the owner recognises it",
                after[gid][1].startswith(before[gid][1].strip()),
                True,
            )
        live_keys = [
            (h, n.strip().lower())
            for h, n, active, deleted, _ in after.values()
            if h == HUB_A and active == 1 and deleted == 0
        ]
        check(
            "hub A has no two live groups with the same name any more",
            len(live_keys),
            len(set(live_keys)),
        )
        check(
            "the customer stays in the renamed group (no membership moved)",
            db.rows(
                "SELECT group_id FROM customers_customer_groups WHERE customer_id = 'c-1'"
            ),
            [{"group_id": "g-second"}],
        )

        try:
            db.migrate(files[files.index(DEDUPE) :])
        except RuntimeError as exc:
            fail(f"the upgrade is not re-entrant (second boot aborts): {exc}")
            return
        check("a second boot changes nothing", snapshot(db), after)
    finally:
        db.drop()


# ── 3-5 · the rule, on a fresh hub ─────────────────────────────────────────────────────────────


def test_rule() -> None:
    print(
        "\n3 · a live group holds its name in its hub, ignoring case and surrounding spaces"
    )
    db = ScratchDb("customers_group_name_rule")
    try:
        db.create(migration_files())
        vip, err = create_group(db, HUB_A, "VIP")
        if err:
            fail(f"fixture: the first «VIP» was refused: {err}")
            return
        _, err = create_group(db, HUB_A, "VIP")
        expect_name_taken("a second «VIP» in the same hub", err, CREATE)
        _, err = create_group(db, HUB_A, "  vip ")
        expect_name_taken(
            "«  vip » in the same hub (case and spaces do not make it another group)",
            err,
            CREATE,
        )

        other, err = create_group(db, HUB_A, "Mayorista")
        expect_accepted("a group with another name is created", err)
        err = update_group(db, HUB_A, other, "Vip")
        expect_name_taken("renaming «Mayorista» onto the live «VIP»", err, UPDATE)
        err = update_group(db, HUB_A, vip, "VIP")
        expect_accepted("saving a group under its OWN name is not a clash", err)

        print("\n4 · deleting or deactivating a group frees its name")
        delete_group(db, HUB_A, vip)
        again, err = create_group(db, HUB_A, "VIP")
        expect_accepted("the name of a DELETED group can be created again", err)
        check(
            "the deleted «VIP» stays deleted under its name",
            db.rows(
                f"SELECT name, is_deleted FROM customers_customergroup WHERE id = {literal(vip)}"
            ),
            [{"name": "VIP", "is_deleted": 1}],
        )
        err = update_group(db, HUB_A, again, "VIP", is_active=0)
        expect_accepted("deactivating the live «VIP»", err)
        _, err = create_group(db, HUB_A, "VIP")
        expect_accepted("an INACTIVE group (in no list) does not hold its name", err)
        err = update_group(db, HUB_A, again, "VIP", is_active=1)
        expect_name_taken("reactivating a group whose name is now taken", err, UPDATE)

        print("\n5 · tenancy: the name is per hub")
        b_vip, err = create_group(db, HUB_B, "VIP")
        expect_accepted("hub B creates its own «VIP» while hub A has one", err)
        _, err = create_group(db, HUB_B, "vip")
        expect_name_taken("a second «VIP» in hub B", err, CREATE)
        for row in db.rows(
            f"SELECT id FROM customers_customergroup WHERE hub_id = {literal(HUB_A)} AND is_deleted = 0 AND is_active = 1 AND name = 'VIP'"
        ):
            delete_group(db, HUB_A, row["id"])
        _, err = create_group(db, HUB_B, "VIP")
        expect_name_taken("hub A deleting its «VIP» does not free hub B's", err, CREATE)
        _, err = create_group(db, HUB_A, "VIP")
        expect_accepted("hub B's live «VIP» does not block hub A", err)
        check(
            "hub B's «VIP» is untouched",
            db.rows(
                f"SELECT name, is_deleted FROM customers_customergroup WHERE id = {literal(b_vip)}"
            ),
            [{"name": "VIP", "is_deleted": 0}],
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


def test_down() -> None:
    print("\n6 · the index migration is reversible")
    down = documented_down(INDEX) if (MODULE_DIR / INDEX).exists() else ""
    if not down:
        fail(f"{INDEX} does not document its `down` (a `-- DOWN` block)")
        return
    db = ScratchDb("customers_group_name_down")
    try:
        db.create(migration_files())
        err = db.run(down)
        expect_accepted("the documented down runs", err)
        idx = [
            r["indexname"]
            for r in db.rows(
                "SELECT indexname FROM pg_indexes WHERE tablename = 'customers_customergroup'"
            )
        ]
        check("after the down the index is gone", LIVE_INDEX in idx, False)
        _, e1 = create_group(db, HUB_A, "VIP")
        _, e2 = create_group(db, HUB_A, "VIP")
        check(
            "after the down a duplicate goes through again (the old behaviour)",
            (e1, e2),
            (None, None),
        )
        db.migrate([DEDUPE, INDEX])
        idx = [
            r["indexname"]
            for r in db.rows(
                "SELECT indexname FROM pg_indexes WHERE tablename = 'customers_customergroup'"
            )
        ]
        check(
            "the up runs again after the down (dedupe first) and rebuilds the index",
            LIVE_INDEX in idx,
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
    test_upgrade_with_duplicates()
    test_rule()
    test_down()
    return report()


def report() -> int:
    if failures:
        print(f"\nFAILED ({len(failures)}):")
        for msg in failures:
            print(f"  ✗ {msg}")
        return 1
    print(
        "\n✓ one live group per name and hub (case/spaces ignored), duplicates renamed on upgrade, per hub, reversibly"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
