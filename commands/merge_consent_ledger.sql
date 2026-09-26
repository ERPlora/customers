-- Step 12/15 of `customers.merge` (customers#86): consent is EVIDENCE, and evidence follows the
-- PERSON, not the sheet that happened to type it first — every consent fact the absorbed sheet ever
-- recorded moves to the survivor unchanged (customers#10, append-only: this re-points the fact, it
-- does not rewrite it). The survivor's flag is re-derived from the widened ledger next.
-- Runtime injects :hub_id, :current_user_id, :now.
UPDATE customers_consent_ledger SET
  customer_id = :surviving_id, updated_by = :current_user_id, updated_at = :now
WHERE customer_id = :absorbed_id AND hub_id = :hub_id;
