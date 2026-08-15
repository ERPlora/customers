# Customers — Concepts

The things people get wrong on their first day.

## The customer on an invoice is a frozen copy, not a link

Two different things are easy to confuse.

- **The customer record** lives here and changes whenever you edit it.
- **The customer on a sale** is a **snapshot** — name, tax id and address copied into the sale at the
  moment it was charged.

That is why correcting a customer's address today does **not** change an invoice from last year, and
why it must not: an invoice has to show the buyer as they were when it was issued.

If a customer's details were wrong on an invoice, fixing the record here is not enough — the fiscal
correction belongs to `invoice`.

## The order link belongs to Customers, not to Sales

A check does **not** store a customer id. A grocery shop sells all day without knowing who anyone is,
so forcing the concept into every order would be wrong.

Instead, this module keeps its own link between a customer and an order. The till tells it when a
check is materialised, and this module writes the link. **`sales` never calls `customers`** — that is
what keeps a CRM installable without dragging the whole point of sale along.

The order id stored here is **opaque**: it is a reference, not a foreign key, and amounts and lines
are never joined across the two modules. Asking "which orders does this customer have" gives you
ids; asking what they cost is a question for `sales`.

## Purchases are recorded automatically, and anonymous sales do nothing

When a sale completes with a customer attached, this module raises their purchase count, adds to
their total spent, and sets their last purchase date. **You never type these numbers.**

A sale with no customer is anonymous, and anonymous is a normal, valid outcome — it simply records
nothing here.

## The lifecycle stage moves by itself when someone buys

A purchase advances the stage:

- `lead` or `prospect` → `first_purchase`
- `first_purchase`, `at_risk` or `dormant` → `active`

Other stages (`churned`, `vip`) are yours to set by hand. So "why did this lead become a customer" is
usually answered by "they bought something".

## Assigning groups or tags replaces the whole selection

The commands that set a customer's groups and tags are **not** "add one". They take the complete list
and replace what was there: the old links are cleared and the new ones written.

Send the full set you want, not the delta. Sending an empty list removes every group or tag.

## A group's discount is data, not an automatic price rule

A group carries a discount percentage between 0 and 100. It is stored on the group as segmentation
data. Do not assume a discount is applied to a sale merely because the customer belongs to a group;
discounts on a check are decided by the till.

## Custom fields: you can define them, you cannot fill them from a screen

The Fields tab defines the shape of your extra data — a name, a type, whether it is required. The
per-customer **values** exist in the data model and can be read, but no screen edits them yet. This
is a known gap, not a bug in your setup.

Field types are `text`, `number`, `date`, `boolean`, `select` and `textarea`; a `select` carries its
options as a list.

## Notes and activities are both timeline entries, and they are appended

A note is content you write; an activity is an entry in the history, which may reference another
object. Both **accumulate** — the timeline is a record of what happened, and entries are not edited
away.

## Deleting a customer is a soft delete, and only an admin can do it

The row is marked deleted, not erased. Sales that referenced them keep their frozen fiscal snapshot,
so history stays readable and invoices stay valid.

Note the permission asymmetry: an **employee can create** a customer (you need that at the counter)
but **cannot change or delete** one. Only an **admin** can delete a customer, a group or a tag.

## Bulk creation exists, but only through the API

Up to **50 customers** can be created in one call. There is no import screen. Rows without a source
get `import`, and a lifecycle stage of `customer` is normalised to `active`.

## Every amount is an integer number of cents

`total_spent` and the revenue widget are **cents** (ADR-0123). `1250` is 12,50 €.
