-- 004_consent_ledger.sql — customers#10: consent is EVIDENCE, not a checkbox.
--
-- `customers_customer.marketing_consent` (0/1) + `consent_date` could not answer the only question
-- the GDPR asks of them — article 7(1), «the controller shall be able to DEMONSTRATE that the data
-- subject has consented»: who said yes, when, for WHAT, through WHICH channel, after being shown
-- WHICH words, and who wrote it down. A boolean holds none of that, and `customers.update` set it
-- without touching the date, so consent could be switched on with a null date or withdrawn while
-- keeping a date that no longer meant anything.
--
-- This table is that evidence. **One row per FACT**, keyed by nothing: it is APPEND-ONLY. Granting,
-- withdrawing and granting again leave three rows, because a withdrawal that erased what it revoked
-- would destroy the proof of the period during which writing to that person WAS lawful — which is
-- exactly the period an inspection asks about. Nothing in this module updates or deletes a row here
-- (erasure soft-deletes them, like every other personal datum: `customers.anonymize`).
--
-- **Per purpose AND per channel**, because they are different decisions and the market models them
-- that way (Mailchimp/Klaviyo/Shopify keep email marketing and SMS marketing apart). «Yes to the
-- newsletter» is not «yes to WhatsApp», and a single boolean forced the two into one answer.
--
-- The sheet's `marketing_consent`/`consent_date` SURVIVE as a **derived mirror**, recomputed by the
-- two consent commands: everything that already reads them (the list, the sheet, blueprints, CSV
-- export) keeps working, and nothing writes them by hand any more.
CREATE TABLE IF NOT EXISTS customers_consent_ledger (
    id             TEXT PRIMARY KEY,
    hub_id         TEXT NOT NULL,
    customer_id    TEXT NOT NULL,
    -- WHAT it is for. `marketing` today; a hub that starts profiling or sending surveys adds its
    -- own without a migration, because the effective state is read per purpose.
    purpose        TEXT NOT NULL DEFAULT 'marketing',
    -- THROUGH WHAT. `any` exists for one reason only: the legacy boolean never said which channel.
    channel        TEXT NOT NULL,                    -- email|sms|whatsapp|phone|postal|any
    -- THE ADDRESS IT WAS GIVEN FOR, as it was at that moment: `ada@example.com`, `+34600…`.
    -- Dynamics 365 anchors consent to the CONTACT POINT and not to the contact record, and it is
    -- right: a counter creates duplicate sheets, merges them and corrects mistyped emails every
    -- week, and consent that follows the row silently transfers to an address nobody ever asked.
    -- Empty when the caller does not know it — the fact is still worth more than no fact.
    contact_point  TEXT NOT NULL DEFAULT '',
    -- WHAT WAS DECIDED. `legacy_unverified` is neither yes nor no: somebody once ticked a box and
    -- there is no evidence of what they were told. It must never read as consent — and **no command
    -- can write it**, only the backfill below. Shopify made its own `NOT_SUBSCRIBED` read-only for
    -- the same reason, after operators were caught turning «unknown» into «subscribed» with a
    -- search-and-replace over the export.
    state          TEXT NOT NULL,                    -- granted|withdrawn|legacy_unverified
    -- WHERE it came from: counter|web_form|import|phone|email|legacy_boolean.
    source         TEXT NOT NULL DEFAULT '',
    -- WHAT THEY WERE SHOWN. Stored verbatim, not by reference: the wording of a form changes, and
    -- «the text that was on screen in January» is not recoverable from today's catalogue.
    notice_text    TEXT NOT NULL DEFAULT '',
    notice_version TEXT NOT NULL DEFAULT '',
    -- Anything external that backs it up: a signed form's reference, a ticket number, a form id.
    evidence       TEXT NOT NULL DEFAULT '',
    -- Only on a withdrawal, and only if there was one: nobody has to justify saying no.
    reason         TEXT NOT NULL DEFAULT '',
    -- WHO wrote it down — the hub user, from the session. Not the customer: the customer is
    -- `customer_id`, and conflating «who consented» with «who typed it» is how a paper trail rots.
    recorded_by    TEXT NOT NULL DEFAULT '',
    -- WHEN THE PERSON SAID IT, which is not always when it was typed (a form signed yesterday, a
    -- phone call at lunch). Defaults to `:now` when the caller has nothing better.
    occurred_at    TEXT NOT NULL,
    is_deleted     INTEGER NOT NULL DEFAULT 0,
    deleted_at     TEXT, created_by TEXT, updated_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers_customer (id) ON DELETE CASCADE
);
-- The read that matters is «the LAST fact per purpose and channel for this customer», so the index
-- carries the whole ordering the query needs.
CREATE INDEX IF NOT EXISTS ix_consent_effective
    ON customers_consent_ledger (hub_id, customer_id, purpose, channel, occurred_at);

-- MIGRATION OF THE LEGACY BOOLEAN — without inventing a single piece of evidence.
--
-- Every customer whose sheet says `marketing_consent = 1` gets ONE row, and it is
-- `legacy_unverified`: not `granted`. There is no record of what they were told, through which
-- channel, or whether they were asked at all — turning that into a `granted` row would be
-- manufacturing the proof this whole table exists to hold. `channel = 'any'` for the same reason:
-- the boolean never said which.
--
-- `occurred_at` keeps the date the sheet had when it had one; `created_at` when it did not, which
-- is the earliest moment this hub can honestly claim. `notice_text` and `evidence` stay EMPTY.
--
-- Deterministic id (`legacy-consent-<customer id>`) + `NOT EXISTS`: re-running this migration adds
-- nothing, and the row is recognisable for what it is at a glance.
INSERT INTO customers_consent_ledger
  (id, hub_id, customer_id, purpose, channel, contact_point, state, source,
   notice_text, notice_version, evidence, reason, recorded_by, occurred_at,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT 'legacy-consent-' || c.id, c.hub_id, c.id, 'marketing', 'any', '', 'legacy_unverified',
       'legacy_boolean', '', '', '', '', '',
       COALESCE(c.consent_date, c.created_at, ''),
       0, '', '', COALESCE(c.created_at, ''), COALESCE(c.updated_at, c.created_at, '')
FROM customers_customer c
WHERE c.marketing_consent = 1
  AND NOT EXISTS (SELECT 1 FROM customers_consent_ledger l WHERE l.id = 'legacy-consent-' || c.id);
