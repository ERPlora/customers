-- Step 8/15 of `customers.merge` (customers#86): tag memberships UNITE, same rule as groups
-- (previous pair of steps). Scoped via the customer on both ends; no hub_id on the junction itself.
INSERT INTO customers_customer_tags (customer_id, tag_id)
SELECT :surviving_id, tag_id
FROM customers_customer_tags
WHERE customer_id = :absorbed_id
  AND customer_id IN (SELECT id FROM customers_customer WHERE id = :absorbed_id AND hub_id = :hub_id)
  AND CAST(:surviving_id AS TEXT) IN (SELECT id FROM customers_customer WHERE id = :surviving_id AND hub_id = :hub_id)
ON CONFLICT DO NOTHING;
