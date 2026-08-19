-- Step 6/7 of `customers.anonymize`: same as groups, for tags.
DELETE FROM customers_customer_tags
WHERE customer_id = :customer_id
  AND customer_id IN (SELECT id FROM customers_customer WHERE id = :customer_id AND hub_id = :hub_id);
