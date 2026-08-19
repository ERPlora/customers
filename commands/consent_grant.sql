-- Step 1/3 of `customers.consent.grant` (customers#10): the FACT, with its evidence attached.
--
-- An INSERT, never an UPDATE: the ledger is append-only, so consenting again after a withdrawal is
-- a new row and the withdrawal stays where it was. What the row has to carry is fixed by article
-- 7(1) — being able to DEMONSTRATE the consent: who (`customer_id`), when (`occurred_at`), for what
-- (`purpose`), through which channel, after which words (`notice_text` + `notice_version`), from
-- where (`source`), backed by what (`evidence`) and written down by whom (`recorded_by`, taken from
-- the SESSION, never from the payload — same rule as `discarded_by` and `created_by`).
--
-- `occurred_at` falls back to `:now`: a signature collected yesterday can say so, and a counter that
-- has nothing better does not have to lie about it.
--
-- Guarded by the customer's own row, so a customer of another hub — or a deleted one — selects
-- nothing and the whole command is a safe no-op. `expect_rows {min 1}` in the manifest turns that
-- into `customers.customer_unavailable` instead of a silent success.
-- Runtime injects :new_id, :hub_id, :current_user_id, :now.
INSERT INTO customers_consent_ledger
  (id, hub_id, customer_id, purpose, channel, contact_point, state, source,
   notice_text, notice_version, evidence, reason, recorded_by, occurred_at,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT :new_id, c.hub_id, c.id,
       COALESCE(CAST(:purpose AS TEXT), 'marketing'), CAST(:channel AS TEXT),
       COALESCE(CAST(:contact_point AS TEXT), ''), 'granted',
       COALESCE(CAST(:source AS TEXT), ''),
       CAST(:notice_text AS TEXT), COALESCE(CAST(:notice_version AS TEXT), ''),
       COALESCE(CAST(:evidence AS TEXT), ''), '', COALESCE(CAST(:current_user_id AS TEXT), ''),
       COALESCE(CAST(:occurred_at AS TEXT), :now),
       0, :current_user_id, :current_user_id, :now, :now
FROM customers_customer c
WHERE c.id = CAST(:customer_id AS TEXT) AND c.hub_id = :hub_id AND c.is_deleted = 0;
