-- Sets a custom field value, resolving BOTH parents against the runtime-injected hub (customers#7).
--
-- A plain `VALUES (:new_id, :hub_id, :customer_id, :field_id, …)` wrote the caller's hub but never
-- checked that the customer or the field belong to it: a cross-hub row persisted forever.
-- `INSERT … SELECT` with the two guards: if either parent is not of this hub (or is deleted)
-- nothing is selected, nothing is written, and `expect_rows` in the manifest turns that silence
-- into a business error instead of a false OK.
INSERT INTO customers_customerfieldvalue
  (id, hub_id, customer_id, field_id, value, is_deleted, created_by, updated_by, created_at, updated_at)
SELECT :new_id, c.hub_id, c.id, f.id, :value, 0, :current_user_id, :current_user_id, :now, :now
FROM customers_customer c
JOIN customers_customerfield f
  ON f.hub_id = c.hub_id AND f.id = :field_id AND f.hub_id = :hub_id AND f.is_deleted = 0
WHERE c.id = :customer_id AND c.hub_id = :hub_id AND c.is_deleted = 0
ON CONFLICT (customer_id, field_id) DO UPDATE SET value = :value, updated_by = :current_user_id, updated_at = :now;
