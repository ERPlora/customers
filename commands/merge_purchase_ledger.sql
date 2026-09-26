-- Step 10/15 of `customers.merge` (customers#86): the absorbed sheet's purchase ledger (customers#8)
-- moves to the survivor — the commercial history a `total_purchases`/`total_spent` reconciliation
-- checks against must follow the aggregates merged in commands/merge.sql, not stay behind.
-- Runtime injects :hub_id, :current_user_id, :now.
UPDATE customers_purchase_ledger SET
  customer_id = :surviving_id, updated_by = :current_user_id, updated_at = :now
WHERE customer_id = :absorbed_id AND hub_id = :hub_id;
