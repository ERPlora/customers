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
- **It does not discount anything.** A group is identity segmentation, not price. The
  `discount_percent` column is still on the table so nothing a hub configured is lost, but no
  command writes it, no query returns it and no screen shows it (customers#17): pricing rules
  belong to `pricing`, which has no engine yet.
- **It does not do marketing campaigns, mailings or loyalty points.** It records consent and a
  preferred channel; sending anything is not its job. What it does own is the **evidence**: consent
  is an append-only ledger per purpose and channel, and any module that wants to write to somebody
  asks `customers.consent.state` first — that query is the contract, and it answers `granted`,
  `withdrawn` or `legacy_unverified`, never a bare yes.
- **It does not own the customer data printed on an invoice.** That is a frozen snapshot living on
  the sale — see [concepts.md](concepts.md).
- **CSV import lives in the list.** The table's import button sends the file in batches of 50 and
  reports what was created, what was skipped and why, and what failed. The «País»/`country` column
  is stored as the ISO code of the country it names (name or code, in Spanish or English); a value
  that names no country is imported as written and flagged in the report for review.
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
customer context. The search never hides a failure: "no matches", "Customers is unavailable — retry"
and "no permission" are three different screens, a customer is only assigned once their fiscal data
was read, and «+ New customer» creates a walk-in (name and phone) from the search itself.

**It offers a slot on the customer sheet.** `customers.detail` is a named slot other modules can
fill (for example a visit history from appointments); the sheet tells the filler which customer is
open. Nothing shows there until a module fills it.

Turning Customers off removes only that selector. Tables, Kitchen and the checks themselves keep
working.

## Where its numbers come from

- **`total_spent` and every amount are integer cents** (ADR-0123).
- **`total_purchases`** is a count of completed sales attributed to that customer.
- **A group carries no number you can spend.** `discount_percent` is a dormant column, not an
  amount the till reads.
