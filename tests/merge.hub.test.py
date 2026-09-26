#!/usr/bin/env python3
"""`customers.merge` through the REAL kernel (customers#86, layer 1).

`tests/merge.pg.test.py` proves the SQL against a scratch Postgres with a hand-written harness.
What it cannot prove is the runtime: that the manifest installs (the anchored `expect_rows`
included), that `POST /api/command` binds every placeholder of the fifteen statements the way the
real dispatcher does, and that a refusal comes back as the module's translatable error code with
nothing written. That is what this battery is for.

Usage: `erplora test <dir> --against-hub [dev|stable|sha256:…]` (module-toolkit#110). Without a
runtime it fails, it does not skip.
"""

import sys

from hub_harness import Hub, key


def refusal(status: int, body) -> str:
    """The error code of a refused command, or 'accepted' when it went through."""
    if status == 200 and (body or {}).get("ok"):
        return "accepted"
    err = (body or {}).get("error") or body or {}
    if isinstance(err, str):
        return body.get("code")
    return err.get("code")


def new_customer(hub: Hub, payload: dict) -> str:
    out = hub.run("customers.create", payload)
    return (out.get("new_ids") or [None])[0]


def main() -> int:
    hub = Hub("merge.hub.test")

    print("\n1 · two sheets of the same person become one")
    survivor = new_customer(hub, {"name": key("Ana"), "phone": "600111222"})
    absorbed = new_customer(
        hub, {"name": key("ana"), "email": "ana@example.com", "notes": "Allergic"}
    )
    hub.run(
        "customers.notes.add", {"customer_id": absorbed, "content": "Came via WhatsApp"}
    )

    hub.check(
        "merging a sheet into itself is refused",
        refusal(
            *hub.command(
                "customers.merge", {"surviving_id": survivor, "absorbed_id": survivor}
            )
        ),
        "customers.customer_unavailable",
    )

    hub.run("customers.merge", {"surviving_id": survivor, "absorbed_id": absorbed})
    got = hub.query("customers.get", {"customer_id": survivor})[0]
    hub.check("survivor keeps its phone", got.get("phone"), "600111222")
    hub.check(
        "survivor gets the empty email filled", got.get("email"), "ana@example.com"
    )
    hub.check("survivor gets the notes", got.get("notes"), "Allergic")

    timeline = hub.query("customers.activities", {"customer_id": survivor})
    titles = sorted(r.get("title") for r in timeline)
    hub.check_true(
        "the absorbed sheet's timeline moved and the merge is audited",
        "activity.note_added" in titles and "activity.customer_merged" in titles,
        str(titles),
    )
    hub.check(
        "the absorbed sheet is gone from the list",
        [
            r
            for r in hub.query("customers.list", {"search": ""})
            if r.get("id") == absorbed
        ],
        [],
    )

    print("\n2 · a retired sheet cannot be merged again (no second customer.merged)")
    hub.check(
        "refused with the business code",
        refusal(
            *hub.command(
                "customers.merge", {"surviving_id": survivor, "absorbed_id": absorbed}
            )
        ),
        "customers.customer_unavailable",
    )

    return hub.finish("merge installs, binds and refuses through the real runtime")


if __name__ == "__main__":
    sys.exit(main())
