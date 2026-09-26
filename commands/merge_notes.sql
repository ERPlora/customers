-- Step 2/15 of `customers.merge` (customers#86): the absorbed sheet's notes move to the survivor
-- — free text somebody wrote is never lost, and it now shows on ONE timeline. Scoped by hub_id and
-- the absorbed id only, so a refused merge simply re-points nothing here (0 rows), never errors.
-- Runtime injects :hub_id, :current_user_id, :now.
UPDATE customers_customernote SET
  customer_id = :surviving_id, updated_by = :current_user_id, updated_at = :now
WHERE customer_id = :absorbed_id AND hub_id = :hub_id;
