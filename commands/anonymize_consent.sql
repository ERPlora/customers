-- Step 8/8 of `customers.anonymize` (customers#11 + customers#10): the consent evidence goes too.
--
-- A consent record names a person and the address they were reached at, so it is personal data and
-- an erasure that left it standing would be an erasure with the customer's email still in a table.
-- Soft-deleted, not dropped, exactly like notes and activities: the row survives for the same
-- reason it always did — proof that a decision existed — while `is_deleted = 1` takes it out of
-- `customers.consent.state`, so nothing can ever read it as a live permission again.
--
-- This is also the honest reading of EDPB 05/2020 §107: the duty to demonstrate consent lasts as
-- long as the processing does. Once the person is erased there is no processing left to justify.
UPDATE customers_consent_ledger SET
  contact_point = '', evidence = '', reason = '',
  is_deleted = 1, deleted_at = :now,
  updated_by = :current_user_id, updated_at = :now
WHERE customer_id = :customer_id AND hub_id = :hub_id AND is_deleted = 0;
