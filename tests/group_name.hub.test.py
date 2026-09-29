#!/usr/bin/env python3
"""A taken customer-group name through the REAL kernel (customers#94).

`tests/group_name_unique.pg.test.py` proves the index and the upgrade against a scratch Postgres.
What it cannot prove is the dispatcher: that the manifest installs with the new migrations, that
the unique violation of `POST /api/command` comes back as the module's translatable code
`customers.group_name_taken` (the `on_unique` map) and not the platform's generic `db`, on create
AND on rename, and that the refusal writes nothing.

Tenancy (another hub's «VIP» never collides) is pinned in the Postgres battery: the runtime answers
for ONE hub here.

Usage: `erplora test <dir> --against-hub [dev|stable|sha256:…]` (module-toolkit#110). Without a
runtime it fails, it does not skip.
"""

import sys

from hub_harness import Hub, key

NAME_TAKEN = "customers.group_name_taken"


def refusal(status: int, body) -> str:
    """The error code of a refused command, or 'accepted' when it went through."""
    if status == 200 and (body or {}).get("ok"):
        return "accepted"
    err = (body or {}).get("error") or body or {}
    if isinstance(err, str):
        return body.get("code")
    return err.get("code")


def group(name: str) -> dict:
    return {"name": name, "description": "", "color": "primary", "sort_order": 0}


def live_named(hub: Hub, name: str) -> list:
    rows = hub.query("customers.groups.list", {"search": name, "page_size": 100})
    return [r for r in rows if r["name"].strip().lower() == name.strip().lower()]


def main() -> int:
    hub = Hub("group_name.hub.test")
    name = key("Fidelidad")

    print("\n1 · a second group with the same name is refused with the module's code")
    first = hub.run("customers.groups.create", group(name))["new_ids"][0]
    status, body = hub.command("customers.groups.create", group(f"  {name.upper()} "))
    hub.check(
        "creating it again (other case, spaces around)",
        refusal(status, body),
        NAME_TAKEN,
    )
    hub.check(
        "the refusal wrote nothing: one live group under that name",
        len(live_named(hub, name)),
        1,
    )

    print("\n2 · renaming a group onto a taken name is refused the same way")
    other_name = key("Mayorista")
    other = hub.run("customers.groups.create", group(other_name))["new_ids"][0]
    status, body = hub.command(
        "customers.groups.update", {**group(name), "group_id": other, "is_active": 1}
    )
    hub.check("renaming onto the live name", refusal(status, body), NAME_TAKEN)
    hub.check(
        "the refused rename left the group under its old name",
        len(live_named(hub, other_name)),
        1,
    )

    print("\n3 · deleting the group frees its name")
    hub.run("customers.groups.delete", {"group_id": first})
    status, body = hub.command("customers.groups.create", group(name))
    hub.check(
        "the name of a deleted group can be used again",
        refusal(status, body),
        "accepted",
    )

    return hub.finish(
        "a taken group name is refused as customers.group_name_taken on create and rename; delete frees it"
    )


if __name__ == "__main__":
    sys.exit(main())
