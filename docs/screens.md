# Customers — Screens

The module contributes four tabs to the hub navigation: **Customers**, **Groups**, **Tags** and
**Fields**. It also injects a customer search into the sell screen of the POS.

## Customers

Summary cards on top (`customers.stats`) and the customer list below (`customers.list`, 50 rows per
page). Requires `customers.view_customer`.

- **Search** by name, email, phone, tax id or company name.
- **Sort** by name, email, phone, tax id, company, lifecycle stage, source, active flag, number of
  purchases, total spent or last purchase date. Default: name, ascending.
- **Filter** by any of those, with ranges on tax id, purchases, spend and last purchase date.

### Create a customer

1. Use the quick-add on the list, or open the full form.
2. Fill in the name. Contact details (email, phone, address, city, postal code, country), tax details
   (tax id, company name) and CRM fields are optional. The country is picked from a searchable list
   (Spain first) and stored as its ISO code, so the till always recognises it on the invoice.
   The phone can be typed any way (`600 111 222`, `+44 7700 900123`); it is saved in international
   form (`+34600111222`), and a number that is not a phone of its country is refused on save.
3. Save.

Requires `customers.add_customer` — an employee can do this.

### Open a customer record

The record shows contact and tax details, the purchase metrics, and the timeline. From here you can:

| Action | Needs |
|---|---|
| Edit the record | `customers.change_customer` |
| Delete it (two-step confirmation) | `customers.delete_customer` (admin only) |
| Assign groups and tags with checkboxes | `customers.change_customer` |
| Add a note | `customers.add_note` |
| Read the activity timeline | `customers.view_activity` |

Assigning groups or tags **replaces** the whole selection — see [concepts.md](concepts.md).

### Marketing consent

Its own panel on the record, and **not a field of the edit form** (customers#10). One line per
channel — email, WhatsApp, SMS, plus any other that has something recorded — each showing what was
decided, when, and for which address.

| What you do | What gets stored |
|---|---|
| **Record consent** | Shows the exact sentence to read out. Pressing it stores that sentence word for word, with the channel, the address, where it came from, the moment, and **your name**. |
| **Withdraw** | One tap. No dialog, no compulsory reason — withdrawing has to be at least as easy as giving. |

Nothing is ever overwritten: granting, withdrawing and granting again leave three entries, and all
of them stay in **Everything that was decided** underneath. That list is the proof; the record's
yes/no is only a summary of it.

A customer imported before this existed shows **"Ticked before there was any record"**. That is not
a yes: nobody knows what they were told, so it has to be asked again.

Requires `customers.change_customer` to record or withdraw; `customers.view_customer` to read.

### The CRM fields on a record

| Field | Values |
|---|---|
| Lifecycle stage | `lead`, `prospect`, `first_purchase`, `active`, `at_risk`, `dormant`, `churned`, `vip` |
| Preferred channel | `email`, `sms`, `whatsapp`, `phone`, `none` |
| Source | where this customer came from, picked from a list: `walk_in`, `phone`, `whatsapp`, `website`, `social`, `referral`, `other`. Customers created by a CSV import show `import`; a source typed by hand before the list existed is shown and kept as written |
| Birthday, anniversary | dates |

## Groups

Segmentation groups (`customers.groups.list`, 50 rows per page). Requires
`customers.view_customergroup`.

A group carries a name, a description, a colour, a sort order and an active flag. The list shows how
many customers are in each. There is **no discount field**: a group says who the customer is, not
what they pay (customers#17).

- **Search** by name, description or customer count.
- **Sort** by name, description, colour, order, active flag or customer count. Default: name,
  ascending.

Creating and changing a group needs `customers.add_customergroup` /
`customers.change_customergroup`; deleting needs `customers.delete_customergroup` (admin only).

## Tags

Simple labels with a colour (`customers.tags.list`, 50 rows per page). Requires
`customers.view_customertag`. Search and sort by name, colour or active flag; name ascending by
default.

Same permission pattern as groups: add and change for manager and admin, delete for admin only.

## Fields

Custom fields you define for your own customer records (`customers.fields.list`, 50 rows per page).
Requires `customers.view_customer` to see; `customers.manage_custom_fields` to change.

### Define a custom field

1. Open **Fields** and create one.
2. Give it a name and a **type**: `text`, `number`, `date`, `boolean`, `select` or `textarea`.
3. For a `select`, enter the options as a comma-separated list; they are stored as a list.
4. Mark it required if it must be filled, and set its sort order.
5. Save.

> Defining the field is all the UI does today. **Filling in a field's value for a given customer has
> no screen yet** — the values exist in the data model and can be read, but not edited from here.

## In the till: assign a customer to a check

The sell screen shows a customer button, contributed by this module (requires
`customers.view_customer`).

1. Press it. A search opens over the customer list.
2. Pick a customer. The check now carries their name and their fiscal snapshot.
3. Charge normally. The invoice will carry the customer's tax details.
4. After charging, the till clears the customer — the next check starts anonymous.

With **«Require a customer on every sale»** on in `sales`, step 1 does not need the cashier: on
pressing Charge the till warns and this search **opens on its own**, the way Odoo and Shopify POS ask
for what is mandatory inside the charge flow instead of sending you off to find a button.

When the check is materialised as an order, this module records the link between that customer and
that order (`customers.link_order`, held by employee, cashier, manager and admin), so "which checks
does this customer have open" is answerable.

That link never breaks a charge — but it never fails in silence either: if it cannot be written the
till shows a warning saying the sale goes on and the order will not appear in the customer's
history, and the runtime log carries the detail.

## Dashboard widgets

All three are off by default; turn them on from the dashboard. All need `customers.view_customer`.

| Widget | Shows |
|---|---|
| Clientes | Total number of customers |
| Clientes activos | Customers marked active |
| Ingresos de clientes | Sum of what all customers have spent |
