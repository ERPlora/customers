#!/usr/bin/env python3
"""sales#100 — the `cashier` role is DECLARED by `sales` (a job / permission set, never an identity:
Toast, Square, Lightspeed, Mindbody, Vagaro — decided in ERPlora/pm#9) and every module the till
touches GRANTS to that key what a cashier needs there. The runtime does not inherit from `employee`
(`permissions_for_role` = union of what each active module grants to the key), so a hub that
switches the role on and installs this module without this grant hands the cashier a POS with no
customer: the `sales.pos.assign` slot (`customers.view_customer`) never renders, the inline quick
add (`customers.add_customer`, customers#18) is hidden and `customers.orders.link` — the junction
this module owns (ADR-0141), which needs `change_customer` — fails silently on every sale.

Contract: search, attach and quick-add at the counter, which is the one thing every reference agrees
on (Odoo's basic right «Set customers», Shopify POS «Create new customers»/«View customer details»,
Square's customers permission, Lightspeed's «Customer management», Vagaro's «Customer Management»).
What stays out is the GDPR surface — deleting, anonymising, exporting — plus the CRM configuration
(custom fields, settings) and the group/tag catalogue: front-desk staff use those lists, they do not
curate them.
Usage: tests/cashier_role.contract.test.py   (exit 0 = green)
"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
m = json.loads((ROOT / "module.json").read_text())
grants = m.get("role_permissions", {}).get("cashier")
MUST = [
    "customers.view_customer",
    "customers.add_customer",
    "customers.change_customer",
    "customers.add_note",
    "customers.view_activity",
    "customers.view_customergroup",
    "customers.view_customertag"
]
MUST_NOT = [
    "customers.delete_customer",
    "customers.erase_customer",
    "customers.export_customer",
    "customers.manage_custom_fields",
    "customers.manage_settings",
    "customers.add_customergroup",
    "customers.change_customergroup",
    "customers.delete_customergroup",
    "customers.add_customertag",
    "customers.change_customertag",
    "customers.delete_customertag"
]

errors = []
if grants is None:
    errors.append("role_permissions.cashier is not declared")
else:
    for p in MUST:
        if p not in grants: errors.append(f"cashier lacks {p}")
    for p in MUST_NOT:
        if p in grants: errors.append(f"cashier must not get {p}")
    if "*" in grants: errors.append("cashier must never get *")
    for p in grants:
        if p not in m["permissions"]: errors.append(f"cashier is granted {p}, which this module does not declare")
for e in errors: print("FAIL:", e)
print("cashier role grants:", "OK" if not errors else f"{len(errors)} error(s)")
sys.exit(1 if errors else 0)
