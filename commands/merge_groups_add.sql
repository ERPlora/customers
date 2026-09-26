-- Step 6/15 of `customers.merge` (customers#86): segmentation memberships UNITE, they don't
-- overwrite — a group says something about the person, same as a tag, and both sheets' say-so
-- counts. The junction has no hub_id of its own (scoped via the customer, like
-- commands/anonymize_groups.sql); guarded on BOTH ends so a cross-hub id can never smuggle a
-- membership in through here.
INSERT INTO customers_customer_groups (customer_id, group_id)
SELECT :surviving_id, group_id
FROM customers_customer_groups
WHERE customer_id = :absorbed_id
  AND customer_id IN (SELECT id FROM customers_customer WHERE id = :absorbed_id AND hub_id = :hub_id)
  AND CAST(:surviving_id AS TEXT) IN (SELECT id FROM customers_customer WHERE id = :surviving_id AND hub_id = :hub_id)
ON CONFLICT DO NOTHING;
