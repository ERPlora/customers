-- Step 7/15 of `customers.merge` (customers#86): the absorbed sheet's own group memberships are
-- dropped once they have been united onto the survivor (previous step) — the retired sheet keeps
-- no membership, so a group's customer count stays honest. Scoped the same way as
-- commands/anonymize_groups.sql.
DELETE FROM customers_customer_groups
WHERE customer_id = :absorbed_id
  AND customer_id IN (SELECT id FROM customers_customer WHERE id = :absorbed_id AND hub_id = :hub_id);
