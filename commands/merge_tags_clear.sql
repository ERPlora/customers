-- Step 9/15 of `customers.merge` (customers#86): the absorbed sheet's own tag memberships are
-- dropped once united onto the survivor (previous step). Scoped the same way as
-- commands/anonymize_tags.sql.
DELETE FROM customers_customer_tags
WHERE customer_id = :absorbed_id
  AND customer_id IN (SELECT id FROM customers_customer WHERE id = :absorbed_id AND hub_id = :hub_id);
