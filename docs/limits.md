# Customers — Limits and troubleshooting

## Known gaps you should know about

- **Erasing personal data is irreversible and keeps the row.** «Erase personal data» (admin only,
  permission `customers.erase_customer`) replaces name, contact, tax id, address, birthdays and
  consent by markers, blanks notes, timeline and custom-field values, drops groups/tags and writes one
  `erased` audit entry (who, when, why). The customer id stays so sales, invoices and the purchase
  ledger keep their reference — those are fiscal/commercial records with their own retention and are
  NOT erased here. Access/portability requests are not automated yet.

- **Required custom fields are enforced on the full sheet only.** The walk-in quick add, the bulk
  command and the CSV import may leave a required field pending; the sheet refuses to save until it
  is filled.
- **CSV import is not resumable.** The list's import button validates every row (name required,
  email shape), sends batches of 50 and shows a report (created / skipped with reason / failed batch
  with reason). An interrupted import is re-run from the file; rows already created are duplicated
  unless you remove them from the file first.
- **A group has no discount.** It used to show one, and nothing applied it: `sales` does not depend
  on `customers`, and `pricing` has no consumer. The screen was withdrawn (customers#17); the stored
  column was kept untouched. Until `pricing` grows an engine, a discount is entered on the check.

## Validation you will run into

| Field | Accepted values |
|---|---|
| Lifecycle stage | `lead`, `prospect`, `first_purchase`, `active`, `at_risk`, `dormant`, `churned`, `vip` |
| Preferred channel | `email`, `sms`, `whatsapp`, `phone`, `none` |
| Custom field type | `text`, `number`, `date`, `boolean`, `select`, `textarea` |
| Email | a valid address, or empty |
| Marketing consent, active flag | true/false (or 0/1) |
| Customers per bulk call | 1–50 |

A bulk call accepts `customer` as a lifecycle stage and stores it as `active`.

Creating a customer needs **only a name** (a phone or an email is welcome, not required): the
walk-in of the counter is "name, and charge". Everything else — address, birthday, company,
channel — is enrichment you add later from the sheet. Marketing consent is never demanded at
creation: it is recorded when the customer actually gives it.

## Caps and sizes

| Limit | Value |
|---|---|
| Customers per bulk creation | 50 |
| Rows per page (customers, groups, tags, fields) | 50 |
| Maximum rows a paginated request may ask for | 500 |
| Customers linked to one order | 1 |

## Permissions per action

| To do this | You need |
|---|---|
| See customers and their custom fields | `customers.view_customer` |
| Create a customer | `customers.add_customer` |
| Change a customer, assign groups or tags, link an order | `customers.change_customer` |
| Delete a customer | `customers.delete_customer` |
| Export customers | `customers.export_customer` |
| See groups / tags | `customers.view_customergroup` / `customers.view_customertag` |
| Create or change a group | `customers.add_customergroup` / `customers.change_customergroup` |
| Create or change a tag | `customers.add_customertag` / `customers.change_customertag` |
| Delete a group or a tag | `customers.delete_customergroup` / `customers.delete_customertag` |
| See the activity timeline | `customers.view_activity` |
| Add a note (it also writes its own timeline entry) | `customers.add_note` |
| Record an activity in the timeline by hand or by API | `customers.add_activity` |
| Define custom fields | `customers.manage_custom_fields` |
| Change the module settings | `customers.manage_settings` |

By role:

- **admin** — everything.
- **manager** — everything except the three deletes and `manage_settings`.
- **employee** — can **see** customers, groups and tags, **create** a customer, **read** the timeline
  and **add a note**. An employee cannot edit or delete a customer, cannot manage groups, tags or
  custom fields, cannot export, and cannot write arbitrary entries into the timeline
  (`customers.add_activity` is manager/admin: reading the timeline never grants writing it).

The asymmetry is deliberate: taking down a new customer at the counter is routine; changing or
removing one is not.

## Dependencies — what breaks if something is missing

**Customers depends on nothing** and can be installed alone — that is the point of the design.

**`sales` is optional.** Without it:

- nothing emits `sale.completed`, so purchase counts, spend, last purchase date and the automatic
  lifecycle transitions never move;
- there is no till, so the customer selector has nowhere to appear.

Everything else — the directory, groups, tags, fields, notes and the timeline — works exactly the
same.

**Nothing depends on Customers.** Removing it takes away the customer selector from the till and
nothing else; checks, tables and kitchen carry on. Sales already made keep their frozen fiscal
snapshot, so invoices are unaffected.

## When something looks wrong

**"A customer's total spent did not go up."** Was the sale actually attributed to them? A sale
charged without picking a customer is anonymous and records nothing. Also check `sales` is installed
and the sale reached `completed`.

**"I fixed a customer's tax id but the old invoice still shows the wrong one."** Correct, and
required. The invoice carries a frozen copy. Fixing the record only affects documents issued from now
on; correcting an issued invoice is done in `invoice`.

**"I added a tag and the previous ones disappeared."** Setting tags replaces the whole selection.
Send the complete list you want, not just the new one.

**"The customer selector is not in the till."** Check that Customers is installed and active, that
you have `customers.view_customer`, and remember the sell screen resolves its slots when it mounts —
leave the screen and come back.

**"The customer is attached to the wrong check."** An order can only have one live customer;
re-assigning replaces the link. Do it from the check.

**"I cannot delete a customer."** Only an admin can. A manager cannot.

**"A stage went from lead to first_purchase on its own."** That is the automatic transition on their
first purchase. `vip` and `churned` are never set automatically.

**"The customer's history is empty but they have bought."** The timeline records notes and
activities, not sales. Purchases show up as the metrics on the record.
