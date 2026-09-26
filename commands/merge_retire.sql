-- Step 15/15 of `customers.merge` (customers#86): the absorbed sheet is RETIRED, never physically
-- deleted — soft-deleted, inactive, zero totals (everything it had was already moved to the
-- survivor by the steps above). Runs LAST on purpose: every earlier step scopes by hub_id + the
-- absorbed id only, and needed the sheet to still read as `is_deleted = 0` while it moved its rows.
-- `id <> :surviving_id` is a last-line safety net: the guard already refuses same-id merges, this
-- statement simply never retires the survivor even if it somehow ran unguarded.
-- Runtime injects :hub_id, :current_user_id, :now.
UPDATE customers_customer SET
  is_deleted = 1, is_active = 0, deleted_at = :now,
  total_purchases = 0, total_spent = 0, last_purchase_date = NULL,
  updated_by = :current_user_id, updated_at = :now
WHERE id = :absorbed_id AND hub_id = :hub_id AND is_deleted = 0 AND id <> :surviving_id;
