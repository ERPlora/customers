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

## A group is identity, not price

A group answers "who is this customer" — VIP, wholesale, staff. It does not answer "what do they
pay". Discounts on a check are decided at the till, and price rules belong to `pricing`.

The table still has a `discount_percent` column, and it is deliberately dormant: the screens that
showed and edited it were withdrawn (customers#17) because nothing ever applied it — `sales` does
not depend on `customers`, and `pricing` has no consumer in the project. The column was kept, with
its values, so a hub that had configured a percentage does not lose it; no command writes it and no
query returns it. Belonging to several groups is why a stored percentage could never be applied on
its own anyway: 5 % and 10 % at once has no answer without priority, stacking and caps rules, and
those are `pricing`'s to define.

## Custom fields: you can define them, you cannot fill them from a screen

The Fields tab defines the shape of your extra data — a name, a type, whether it is required. The
per-customer **values** exist in the data model and can be read, but no screen edits them yet. This
is a known gap, not a bug in your setup.

Field types are `text`, `number`, `date`, `boolean`, `select` and `textarea`; a `select` carries its
options as a list.

## Marketing consent is a fact you can prove, not a field you can tick

A record used to carry `marketing_consent` (yes/no) and a date. That pair answers none of the
questions that matter the day somebody asks: **who** said yes, **when**, **for what**, **through
which channel**, **after being shown which words**, and **who wrote it down**. Since customers#10
consent is an append-only ledger, one row per fact.

- **Per purpose and per channel.** "Yes to the newsletter" is not "yes to WhatsApp", and one
  checkbox forced them into one answer.
- **A withdrawal is a new row, never a deletion.** The period during which writing to that person
  was lawful is precisely the period an inspection asks about; erasing the grant would destroy the
  proof of it. Withdrawing takes effect on the very next read — there is no batch in between.
- **The wording travels verbatim.** Not a reference to a text: catalogues change, and "the sentence
  that was on screen in January" cannot be recovered from today's file.
- **The address it was given for is on the row.** A counter creates duplicate records, merges them
  and fixes mistyped emails every week; consent that follows the record instead of the address
  silently transfers to somebody who was never asked.
- **The record's yes/no still exists and still reads the same** — it is recomputed from the ledger,
  so everything that already reads it keeps working. Nothing writes it by hand: not `customers.
  create`, not `customers.update`, not the CSV import.
- **A tick that predates the ledger reads `legacy_unverified`, never `granted`.** There is no
  evidence behind it, and inventing some is the one thing this whole design exists to prevent.

Another module that wants to write to somebody asks `customers.consent.state` — a declared,
`expose_api` query, never a peek at the table.

## Notes and activities are both timeline entries, and they are appended

A note is content you write; an activity is an entry in the history, which may reference another
object. Both **accumulate** — the timeline is a record of what happened, and entries are not edited
away.

## Deleting a customer is a soft delete, and only an admin can do it

The row is marked deleted, not erased. Sales that referenced them keep their frozen fiscal snapshot,
so history stays readable and invoices stay valid.

Note the permission asymmetry: an **employee can create** a customer and **attach one to the open
order** (`customers.link_order` — you need both at the counter) but **cannot change or delete** one.
Only an **admin** can delete a customer, a group or a tag.

## Bulk creation exists, but only through the API

Up to **50 customers** can be created in one call. There is no import screen. Rows without a source
get `import`, and a lifecycle stage of `customer` is normalised to `active`.

## Every amount is an integer number of cents

`total_spent` and the revenue widget are **cents** (ADR-0123). `1250` is 12,50 €.

## A phone is saved in international form (E.164)

Every write of a card — the form, the till's quick-add, the CSV import, the API and the assistant —
saves the phone as `+` and digits (`+34600111222`), with libphonenumber's rules: spaces, dashes,
dots, slashes and parentheses go, a leading `00` (the international prefix dialled from the
business's country) becomes `+`, and the national `0` goes too (`07700 900123` in the United
Kingdom, `+44 (0)7700 900123`). A number **without** prefix is read in the **business's country**
(`country_code` in the hub settings; Spain if it was never saved) — not in the card's «Country».
A number that is not possible for its country (`600111` in Spain), letters (an extension) or two
numbers in one field are refused with `customers.phone_invalid`: the form keeps what was typed and
the import skips the row with its reason. The phone stays optional: an empty phone is fine.

Cards typed before this change are rewritten by the scheduled task `phones_to_e164` (every 15
minutes; the first tick after the update does the work, the next ones find nothing). It reads them
with the same rules and the same country; a number it cannot read is left as typed and the card
asks for a valid one the next time it is edited. Each rewritten card keeps its old text in
`customers_phone_backup` (removed when the customer's personal data is erased); rolling back
migration `009` puts the old texts back.

## Finding a customer by phone number

Other modules, and the quick add at the till, find a customer by the number she writes or calls
from (WhatsApp gives it as `34600111222`). The number asked for is read with **the same rules a
card's phone is saved with**: spaces, dashes, dots and parentheses, `+` or `00`, the business's
country for a number **without the country code** (`600 111 222`), and the national `0` dropped
even when it is written in parentheses after the code (`+44 (0)7700 900123` is `+447700900123`).
Bare digits are also read as an international number, the way WhatsApp gives them. A number that
is not possible in its country finds nobody, and so does an old card the scheduled task could not
read. The same national digits behind another country's code are somebody else, and a longer
number that merely contains it is somebody else too. When two cards carry the same
number, both are returned and the module asking decides (the WhatsApp inbox, for instance, then
links the conversation to nobody and leaves it to a person).
