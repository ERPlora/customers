-- Step 4/15 of `customers.merge` (customers#86): custom-field values, part one — the survivor's
-- OWN empty answers get filled from the absorbed sheet, field by field, same rule as the base
-- columns in commands/merge.sql. The survivor's non-empty value always wins (untouched here);
-- moving what the survivor has no row for at all is the next step.
-- Runtime injects :hub_id, :current_user_id, :now.
UPDATE customers_customerfieldvalue sv SET
  value = av.value, updated_by = :current_user_id, updated_at = :now
FROM customers_customerfieldvalue av
WHERE sv.customer_id = :surviving_id AND sv.hub_id = :hub_id AND sv.is_deleted = 0 AND sv.value = ''
  AND av.customer_id = :absorbed_id AND av.hub_id = :hub_id AND av.is_deleted = 0 AND av.value <> ''
  AND av.field_id = sv.field_id;
