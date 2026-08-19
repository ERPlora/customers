-- Step 5/7 of `customers.anonymize`: segmentation says something about the person ("VIP",
-- "allergic") → membership dropped. The junction has no hub_id: resolved through the customer.
DELETE FROM customers_customer_groups
WHERE customer_id = :customer_id
  AND customer_id IN (SELECT id FROM customers_customer WHERE id = :customer_id AND hub_id = :hub_id);
