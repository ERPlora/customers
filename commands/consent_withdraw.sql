-- Step 1/3 of `customers.consent.withdraw` (customers#10): saying NO is a fact of its own.
--
-- The grant it revokes is NOT touched. «Withdrawing must be as easy as giving» (article 7(3)) does
-- not mean «withdrawing erases the record»: the period during which writing to that person was
-- lawful is precisely the period an inspection asks about, and deleting the grant would destroy the
-- proof of it. So this is another INSERT, and the state that counts is simply the LAST one.
--
-- `reason` is optional and stays optional: nobody has to justify saying no, and a form that demands
-- an explanation to unsubscribe is the dark pattern this article exists against.
--
-- No `notice_text`: a withdrawal is not informed consent, there is no wording to preserve.
-- Runtime injects :new_id, :hub_id, :current_user_id, :now.
INSERT INTO customers_consent_ledger
  (id, hub_id, customer_id, purpose, channel, contact_point, state, source,
   notice_text, notice_version, evidence, reason, recorded_by, occurred_at,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT :new_id, c.hub_id, c.id,
       COALESCE(CAST(:purpose AS TEXT), 'marketing'), CAST(:channel AS TEXT),
       COALESCE(CAST(:contact_point AS TEXT), ''), 'withdrawn',
       COALESCE(CAST(:source AS TEXT), ''),
       '', '', COALESCE(CAST(:evidence AS TEXT), ''),
       COALESCE(CAST(:reason AS TEXT), ''), COALESCE(CAST(:current_user_id AS TEXT), ''),
       COALESCE(CAST(:occurred_at AS TEXT), :now),
       0, :current_user_id, :current_user_id, :now, :now
FROM customers_customer c
WHERE c.id = CAST(:customer_id AS TEXT) AND c.hub_id = :hub_id AND c.is_deleted = 0;
