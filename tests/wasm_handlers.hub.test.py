#!/usr/bin/env python3
"""The module's OWN `dist/handler.wasm` running inside the REAL kernel — ported from the hub's
`customers_e2e.rs::bulk_create_wasm` and `::set_groups_wasm_replaces_membership` (ERPlora/hub#1264,
contract «El Hub se CIERRA como KERNEL» §5).

Why this file exists: the pure unit tests in `handler/src/lib.rs`
(`bulk_create_normalizes_stage_and_correlates_ids`, `set_groups_emits_clear_then_adds`) prove what
the handler SOURCE emits, and the kernel's own KCS (`guest_operations_become_rows_through_the_host`)
proves that a guest's operations become rows — for the kernel's fixture. What neither can prove is
the piece in between that only this module owns: that the SHIPPED binary in `dist/` is the one the
manifest points at, exports `bulk_create`/`set_groups`, and — driven by the real dispatcher (the
transaction, `_group_clear` + N×`_group_add` replayed as rows) — leaves the customers and the group
membership the module promises. `erplora validate` still cannot verify the wasm
(module-toolkit#32), so without this battery a stale or broken `dist/handler.wasm` would ship
green. Needs only `customers`: `erplora test <dir> --against-hub` runs it with no extra install.

Contract fixed here (the same one the deleted e2e fixed):

  * `customers.bulk_create` with 3 items answers `operations: 3`, every item becomes ONE customer
    (found by its name through `customers.list`), `lifecycle_stage: "customer"` is normalised to
    `active`, an absent stage defaults to `active`, and every row carries `source: import`.
  * Each `new_ids[i]` of `bulk_create` is the id of the row item `i` created: `customers.get` by
    that id answers the customer named `names[i]` (the guest hands out `context.new_ids` in item
    order). Until ERPlora/hub#1357 (fixed by hub#2139) the kernel re-minted `new_id` for every
    guest operation and reported ids that matched no row; against an image older than that fix
    this check fails, on purpose.
  * `customers.set_groups` REPLACES membership: two groups → `operations: 3` (clear + 2 adds) and
    both report `customer_count` 1 for this customer; setting one group afterwards drops the other
    back to 0 — replaced, not added to.

Usage: `erplora test <dir> --against-hub [dev|stable|sha256:…]` (module-toolkit#110). Without a
runtime it fails, it does not skip.
"""

import sys

from hub_harness import Hub, key


def customer_named(hub: Hub, name: str) -> dict | None:
    rows = [
        r
        for r in hub.query("customers.list", {"search": name})
        if r.get("name") == name
    ]
    return rows[0] if len(rows) == 1 else None


def test_bulk_create_runs_the_shipped_wasm_on_the_kernel(hub: Hub) -> None:
    print(
        "\n1 · customers.bulk_create: the shipped handler.wasm creates rows through the host"
    )
    names = [key("bulk-c1"), key("bulk-c2"), key("bulk-c3")]
    out = hub.run(
        "customers.bulk_create",
        {
            "items": [
                {"name": names[0], "email": "c1@x.es", "lifecycle_stage": "customer"},
                {"name": names[1], "phone": "611 22 33 44"},  # a valid ES number: since customers#121 an impossible one is left out
                {"name": names[2]},
            ]
        },
    )
    hub.check("operations (one create per item)", out.get("operations"), 3)
    hub.check(
        "new_ids (one per item, from the host's batch)",
        len(out.get("new_ids") or []),
        3,
    )

    rows = [customer_named(hub, n) for n in names]
    for i, row in enumerate(rows):
        hub.check_true(
            f"item {i} became exactly one customer", row is not None, names[i]
        )
    if any(r is None for r in rows):
        return
    hub.check(
        "lifecycle_stage 'customer' is normalised to 'active'",
        rows[0]["lifecycle_stage"],
        "active",
    )
    hub.check(
        "an absent lifecycle_stage defaults to 'active'",
        rows[2]["lifecycle_stage"],
        "active",
    )
    for i, row in enumerate(rows):
        hub.check(f"item {i} source is import", row.get("source"), "import")

    new_ids = out.get("new_ids") or []
    for i, new_id in enumerate(new_ids):
        got = hub.query("customers.get", {"customer_id": new_id})
        hub.check(
            f"new_ids[{i}] opens the customer item {i} created",
            [r.get("name") for r in got],
            [names[i]],
        )
        hub.check(
            f"new_ids[{i}] is the id of the row found by name",
            new_id,
            rows[i]["id"],
        )


def count_of(hub: Hub, group_id: str, group_name: str) -> int | None:
    rows = [
        r
        for r in hub.query("customers.groups.list", {"search": group_name})
        if r.get("id") == group_id
    ]
    return rows[0].get("customer_count") if len(rows) == 1 else None


def test_set_groups_replaces_membership_on_the_kernel(hub: Hub) -> None:
    print(
        "\n2 · customers.set_groups: clear + N adds replayed by the host REPLACE membership"
    )
    cid = (
        hub.run("customers.create", {"name": key("grouped")}).get("new_ids") or [None]
    )[0]
    hub.check_true("the customer exists", isinstance(cid, str) and cid != "")
    groups: list[tuple[str, str]] = []
    for label in ("VIP", "Mayorista"):
        name = key(label)
        out = hub.run(
            "customers.groups.create",
            {"name": name, "description": "", "color": "primary", "sort_order": 0},
        )
        gid = (out.get("new_ids") or [None])[0]
        hub.check_true(
            f"group {label} exists", isinstance(gid, str) and gid != "", str(out)
        )
        groups.append((gid, name))
    if not cid or not all(g for g, _ in groups):
        return
    (vip, vip_name), (wholesale, wholesale_name) = groups

    out = hub.run("customers.set_groups", {"customer_id": cid, "ids": [vip, wholesale]})
    hub.check("operations (clear + 2 adds)", out.get("operations"), 3)
    hub.check("VIP counts the customer", count_of(hub, vip, vip_name), 1)
    hub.check(
        "Mayorista counts the customer", count_of(hub, wholesale, wholesale_name), 1
    )

    out = hub.run("customers.set_groups", {"customer_id": cid, "ids": [vip]})
    hub.check("operations (clear + 1 add)", out.get("operations"), 2)
    hub.check("VIP keeps the customer", count_of(hub, vip, vip_name), 1)
    hub.check(
        "Mayorista drops it — replaced, not added to",
        count_of(hub, wholesale, wholesale_name),
        0,
    )


def main() -> int:
    hub = Hub("wasm_handlers", needs=("customers",))
    test_bulk_create_runs_the_shipped_wasm_on_the_kernel(hub)
    test_set_groups_replaces_membership_on_the_kernel(hub)
    return hub.finish(
        "the shipped handler.wasm runs bulk_create and set_groups on the real kernel"
    )


if __name__ == "__main__":
    sys.exit(main())
