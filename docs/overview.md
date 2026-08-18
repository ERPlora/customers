# Customers — Overview

## What this module does

Customers is the CRM of the hub. It holds the customer record — contact details, tax details,
segmentation and custom fields — plus an activity timeline and notes for each one. It keeps their
purchase metrics up to date by itself: every completed sale that names a customer raises their
purchase count and their spend, sets their last purchase date and moves them along their lifecycle.

It also puts a customer search into the till, so a cashier can attach a customer to a check without
leaving the sale screen.

## What this module does NOT do

- **It does not store sales, lines or amounts.** It keeps opaque order ids and the customer's own
  totals; the money belongs to `sales`.
- **It does not apply the group discount at the till.** A group carries a discount percentage as
  segmentation data. <!-- TODO: verify whether the POS applies it automatically -->
- **It does not do marketing campaigns, mailings or loyalty points.** It records consent and a
  preferred channel; sending anything is not its job.
- **It does not own the customer data printed on an invoice.** That is a frozen snapshot living on
  the sale — see [concepts.md](concepts.md).
- **It has no import screen.** Bulk creation exists as a command but has no UI.
- **Custom-field values live in the customer sheet.** Editing the sheet saves the base data and the
  values in one validated write: a required field cannot stay empty, and number/date/yes-no/select
  values must match their type — otherwise nothing is saved and the form tells you which field.

## Modules it connects to

**Depends on nothing.** `depends_on` is empty on purpose: declaring `sales` would mean that
installing a CRM drags the whole point of sale in with it.

**Events it emits**

| Event | When |
|---|---|
| `customer.created` | a customer is created |
| `customer.updated` | a customer is updated |
| `customer.deleted` | a customer is deleted |

**Events it listens to**

| Event | Runs | Effect |
|---|---|---|
| `sale.completed` (from `sales`) | `customers.record_purchase` | Writes ONE ledger entry per sale (the same sale delivered twice counts once), raises the customer's purchase count and spend, sets the last purchase date, advances their lifecycle stage and adds a `purchase` entry to the timeline |
| `sale.voided` (from `sales`) | `customers._reverse_purchase` | Marks that ledger entry as voided (history is kept), takes the amount and the count back, recomputes the last purchase date and steps the stage back; adds a `purchase_voided` entry to the timeline |

A sale with no customer is anonymous and does nothing here. The purchase history of a customer is
`customers.purchases` (paginated, with the source document id); `customers.purchases.divergences`
lists customers whose totals disagree with their ledger (empty = healthy).

**It fills a slot in the till.** The POS sell screen has a named slot for assigning things to a
check; this module fills it with a customer search. Pick a customer and the check carries them, along
with their fiscal details. When the check materialises, this module writes the link between the
customer and that order — **`sales` never calls `customers`**. After charging, the till clears the
customer context.

Turning Customers off removes only that selector. Tables, Kitchen and the checks themselves keep
working.

## Where its numbers come from

- **`total_spent` and every amount are integer cents** (ADR-0123).
- **`total_purchases`** is a count of completed sales attributed to that customer.
- **`discount_percent`** on a group is a percentage between 0 and 100.
