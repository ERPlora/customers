-- Empties a customer's tags, scoped to the runtime-injected hub (customers#7).
--
-- Same reasoning as `_group_clear.sql`: the junction table has no `hub_id`, so the scope comes
-- from the parent customer. A foreign id matches nothing, so nothing is deleted.
DELETE FROM customers_customer_tags
WHERE customer_id = :customer_id
  AND customer_id IN (SELECT id FROM customers_customer WHERE id = :customer_id AND hub_id = :hub_id);
