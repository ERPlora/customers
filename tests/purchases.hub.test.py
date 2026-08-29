#!/usr/bin/env python3
"""The `sale.completed` → `customers.record_purchase` seam, against the REAL kernel — ported from
the hub's `sales_e2e.rs::sale_records_customer_purchase_via_event` (ERPlora/hub#1264, contract «El
Hub se CIERRA como KERNEL» §5: the module proves its own behaviour; the hub keeps only the
conformance of its fixture).

`customers.record_purchase` is `"internal": true` (customers#8): it is the listener of
`sale.completed`, never a public door — a caller that could dial it directly could move a
customer's totals without a sale ever happening. That means the ONLY way to exercise it for real
is the path a cashier actually takes: charge a REAL sale through `sales.complete_sale` (a public
Tier-2 command) and let the runtime's own outbox relay deliver the event to the listener, exactly
as production does. Nothing here binds `:hub_id` or runs SQL by hand.

The declarative correctness of the listener itself — idempotent ledger, void reversal, cross-hub
isolation, the anonymous-sale no-op — is already proven against a real Postgres, more thoroughly
than the old e2e ever did, in `tests/purchase_ledger.pg.test.py` (customers#8). What THAT file
cannot prove is the wiring: that a hub with both `sales` and `customers` installed actually routes
the event from one module to the other's internal command through the relay. That is the one
thing this battery exists for.

Usage: `erplora test <dir> --against-hub [dev|stable|sha256:…]` (module-toolkit#110). `customers`
declares no `depends_on`, so `--against-hub` alone will not bring `sales`/`taxes` along — until
module-toolkit#135 resolves transitive installs for a THIRD party module, this battery is run by
hand against a hub with `taxes`+`sales`+`customers` installed (see hub#1264 for the recipe every
other slice used). Never on its own: without a runtime it fails, it does not skip.
"""

import sys

import hub_harness
from hub_harness import Hub, cash_method_id, cents, key, wait_until


def test_a_real_sale_records_the_purchase_through_the_relay(
    hub: Hub, cash: str
) -> None:
    print(
        "\n1 · a real sale.completed reaches customers.record_purchase through the outbox"
    )
    name = key("cliente")
    out = hub.run("customers.create", {"name": name, "lifecycle_stage": "lead"})
    customer_id = (out.get("new_ids") or [None])[0]
    hub.check_true(
        "new_ids[0] names the customer",
        isinstance(customer_id, str) and customer_id != "",
        str(out),
    )

    before = hub.query("customers.get", {"customer_id": customer_id})[0]
    hub.check("born a lead", before.get("lifecycle_stage"), "lead")
    hub.check("no purchases yet", before.get("total_purchases"), 0)

    hub.run(
        "sales.complete_sale",
        {
            "idempotency_key": key("compra-del-cliente"),
            "payment_method_id": cash,
            "customer_id": customer_id,
            "customer_name": name,
            "items": [
                {
                    "product_name": "X",
                    "price": 5000,
                    "quantity": 1_000_000,
                    "tax_rate": 0.0,
                }
            ],
        },
    )

    # The listener runs off the relay's own poll tick (see hub_harness.wait_until), never
    # synchronously with the charge above.
    after = wait_until(
        lambda: hub.query("customers.get", {"customer_id": customer_id})[0],
        accept=lambda c: c.get("total_purchases", 0) >= 1,
    )
    hub.check(
        "lead → first_purchase, moved by the listener, not by the charge itself",
        after.get("lifecycle_stage"),
        "first_purchase",
    )
    hub.check("one purchase recorded", after.get("total_purchases"), 1)
    hub.check(
        "50,00€ landed as cents (ADR-0007)", cents(after.get("total_spent")), 5000
    )


def main() -> int:
    hub = Hub("purchases", needs=("taxes", "sales", "customers"))
    cash = cash_method_id(hub)
    test_a_real_sale_records_the_purchase_through_the_relay(hub, cash)
    return hub.finish(
        "sale.completed reaches the internal listener through the real relay"
    )


if __name__ == "__main__":
    sys.exit(main())
