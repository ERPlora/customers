-- Empties a customer's groups, scoped to the runtime-injected hub (customers#7).
--
-- The junction table has no `hub_id`, so the scope has to come from the parent: a bare
-- `WHERE customer_id = :customer_id` let a caller of hub A that knew a UUID of hub B empty its
-- groups (the handler emits `clear` + N×`add`; the `add` is guarded, the `clear` was not).
-- A foreign id matches nothing here, so nothing is deleted. Runtime injects :hub_id.
DELETE FROM customers_customer_groups
WHERE customer_id = :customer_id
  AND customer_id IN (SELECT id FROM customers_customer WHERE id = :customer_id AND hub_id = :hub_id);
