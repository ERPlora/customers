#!/usr/bin/env python3
"""A note added through `customers.notes.add` must APPEAR in `customers.activities` (customers#14).

Why this file exists: adding a note took TWO commands from the caller — `customers.notes.add`
inserted the note and `customers.activity.add` projected it into the timeline. The customer
sheet only reads `customers.activities`, so any producer that called the domain command alone
(the automation kernel did, hub flow `7aee7fd1…`, verified 2026-08-10) wrote a note nobody could
ever see; and from the browser, if the second command failed the note existed but vanished from
the experience.

Contract under test: ONE command, ONE transaction, both rows or none — the note and its timeline
entry, resolved against the customer of the runtime-injected hub. Runs the manifest exactly like
the runtime does (`:hub_id`/`:current_user_id`/`:now`/`:new_id` injected, `expect_rows`
evaluated) against a real Postgres. Zero mocks.

Usage: tests/note_add_projects_activity.pg.test.py   (exit 0 = green)
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
# A migration entry is a path or `{file, kind}` (kind: expand/backfill/contract).
MIGRATIONS = [
    e if isinstance(e, str) else e["file"] for e in MANIFEST["migrations"]["postgres"]
]
CONTAINER = os.environ.get("ERPLORA_TEST_PG_CONTAINER", "erplora-test-pg-5433")
DB = f"customers_note_activity_{uuid.uuid4().hex[:8]}"

HUB_A = "hub-a"
HUB_B = "hub-b"
USER = "user-a"
NOW = "2026-08-18T10:00:00+00:00"
COMMAND = "customers.notes.add"

failures: list[str] = []


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


def qi(sql: str) -> int:
    return int(q(sql))


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


def run_command(name: str, payload: dict, hub: str) -> tuple[bool, str, str]:
    """One transaction, system params injected, `expect_rows` evaluated over the sum of affected
    rows of the command's own statements (hub#139: below the minimum the runtime rolls EVERYTHING
    back — mirrored here with a ROLLBACK). Returns (ok, error_code, new_id)."""
    cmd = MANIFEST["commands"][name]
    params = dict(payload)
    params["hub_id"] = hub
    params["current_user_id"] = USER
    params["now"] = NOW
    new_id = str(uuid.uuid4())
    params["new_id"] = new_id

    body = "\n".join(bind((MODULE_DIR / rel).read_text(), params) for rel in cmd["sql"])
    gate = cmd.get("expect_rows")
    try:
        out = psql(["-a"], db=DB, stdin="BEGIN;\n" + body + "\nCOMMIT;")
    except RuntimeError as exc:
        return False, str(exc), new_id
    affected = sum(
        int(m.group(2))
        for line in out.splitlines()
        if (m := re.fullmatch(r"(INSERT \d+|UPDATE|DELETE) (\d+)", line.strip()))
    )
    if gate and gate["op"] == "min" and affected < gate["n"]:
        return False, gate["error"], new_id
    return True, "", new_id


def check(label: str, expected, actual):
    if expected != actual:
        failures.append(f"{label} — expected [{expected}], got [{actual}]")
        print(f"  FAIL: {label} — expected [{expected}], got [{actual}]")
    else:
        print(f"  ok: {label} = {expected}")


def seed_customer(hub: str, cid: str) -> None:
    psql(
        [
            "-c",
            f"""INSERT INTO customers_customer
            (id, hub_id, name, is_deleted, created_by, updated_by, created_at, updated_at)
            VALUES ('{cid}', '{hub}', 'Customer {cid}', 0, '{USER}', '{USER}', '{NOW}', '{NOW}')""",
        ],
        db=DB,
    )


def activities(customer_id: str, hub: str) -> list[dict]:
    """The timeline exactly as the sheet reads it: the manifest query `customers.activities`."""
    sql = (
        bind(
            (
                MODULE_DIR / MANIFEST["queries"]["customers.activities"]["sql"]
            ).read_text(),
            {"customer_id": customer_id, "hub_id": hub},
        )
        .rstrip()
        .rstrip(";")
    )
    raw = q(f"SELECT COALESCE(json_agg(t), '[]') FROM ({sql}) t")
    return json.loads(raw)


def main() -> int:
    if not docker_available():
        print(f"SKIPPED: no Postgres in container {CONTAINER} (nothing was verified)")
        return 0

    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        for rel in MIGRATIONS:
            psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())
        seed_customer(HUB_A, "cust-a")
        seed_customer(HUB_B, "cust-b")

        print("· the manifest contract")
        spec = MANIFEST["commands"][COMMAND]
        check("notes.add is transactional", True, spec.get("transaction") is True)
        check(
            "notes.add writes the note AND its timeline entry (two statements)",
            2,
            len(spec["sql"]),
        )
        check(
            "notes.add declares an expect_rows gate",
            True,
            spec.get("expect_rows") is not None,
        )

        print("· a note added by the domain command shows up in the timeline")
        ok, code, note_id = run_command(
            COMMAND,
            {
                "customer_id": "cust-a",
                "content": "Prefers window seat",
                "author_name": "Ana",
            },
            HUB_A,
        )
        check("command accepted", True, ok)
        check(
            "note row written",
            1,
            qi(
                "SELECT count(*) FROM customers_customernote WHERE customer_id = 'cust-a'"
            ),
        )
        rows = activities("cust-a", HUB_A)
        check("ONE timeline entry visible through customers.activities", 1, len(rows))
        if rows:
            check("entry type is note", "note", rows[0]["activity_type"])
            check(
                "entry carries the content",
                "Prefers window seat",
                rows[0]["description"],
            )
            check("entry points at the note", note_id, rows[0]["related_object_id"])
            check("entry has a title", True, bool(rows[0]["title"]))
            check("performed_by is the caller", USER, rows[0]["performed_by"])

        print("· the kernel shape: no author_name in the payload")
        ok, code, _ = run_command(
            COMMAND, {"customer_id": "cust-a", "content": "From a flow"}, HUB_A
        )
        check("command accepted without author_name", True, ok)
        check("two timeline entries now", 2, len(activities("cust-a", HUB_A)))

        print("· a customer of another hub: nothing written, business error")
        ok, code, _ = run_command(
            COMMAND,
            {"customer_id": "cust-b", "content": "sneaky", "author_name": ""},
            HUB_A,
        )
        check("refused", False, ok)
        check(
            "no note for hub B's customer",
            0,
            qi(
                "SELECT count(*) FROM customers_customernote WHERE customer_id = 'cust-b'"
            ),
        )
        check(
            "no timeline entry for hub B's customer",
            0,
            qi(
                "SELECT count(*) FROM customers_customeractivity WHERE customer_id = 'cust-b'"
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
    print("\nOK: one command, one transaction — the note and its timeline entry")
    return 0


if __name__ == "__main__":
    sys.exit(main())
