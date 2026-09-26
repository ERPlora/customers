-- Step 5/15 of `customers.merge` (customers#86): custom-field values, part two — an absorbed value
-- for a field the survivor has NO row for at all (live or soft-deleted) moves over wholesale
-- instead of being filled. `uq_customer_field_value` covers (customer_id, field_id) including
-- deleted rows (001_init.sql), so re-pointing one that WOULD collide is refused by the unique
-- index rather than silently overwriting — this NOT EXISTS is what keeps it from ever trying.
-- A field the survivor already has a row for (filled or not, in the previous step) is left on the
-- retired sheet: a conflicting absorbed value never overwrites what the survivor already answered.
-- Runtime injects :hub_id, :current_user_id, :now.
UPDATE customers_customerfieldvalue av SET
  customer_id = :surviving_id, updated_by = :current_user_id, updated_at = :now
WHERE av.customer_id = :absorbed_id AND av.hub_id = :hub_id
  AND NOT EXISTS (
    SELECT 1 FROM customers_customerfieldvalue sv
    WHERE sv.customer_id = CAST(:surviving_id AS TEXT) AND sv.hub_id = :hub_id AND sv.field_id = av.field_id
  );
