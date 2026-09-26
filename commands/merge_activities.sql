-- Step 3/15 of `customers.merge` (customers#86): the absorbed sheet's activity timeline moves to
-- the survivor, joining its own history in one place. Scoped by hub_id and the absorbed id only.
-- Runtime injects :hub_id, :current_user_id, :now.
UPDATE customers_customeractivity SET
  customer_id = :surviving_id, updated_by = :current_user_id, updated_at = :now
WHERE customer_id = :absorbed_id AND hub_id = :hub_id;
