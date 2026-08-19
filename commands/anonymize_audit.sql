-- Step 7/7 of `customers.anonymize`: the AUDIT entry — who erased, when, why and what. Written once
-- (`NOT EXISTS`): a second run adds nothing. It is the only live activity left on the customer.
-- Out of scope on purpose (and said so in the metadata): the purchase ledger and the customer↔order
-- junction — commercial/fiscal evidence retained by reference to the pseudonymised id.
INSERT INTO customers_customeractivity
  (id, hub_id, customer_id, activity_type, title, description, extra_metadata,
   related_object_id, related_object_type, performed_by,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT :new_id, c.hub_id, c.id, 'erased', 'Customer data erased', COALESCE(CAST(:reason AS TEXT), ''),
       '{"actor": "' || COALESCE(CAST(:current_user_id AS TEXT), '') || '", "at": "' || :now || '", '
       || '"scope": ["customer", "notes", "activities", "field_values", "memberships"], '
       || '"retained": ["purchase_ledger", "customer_order"]}',
       c.id, 'customer', :current_user_id,
       0, :current_user_id, :current_user_id, :now, :now
FROM customers_customer c
WHERE c.id = :customer_id AND c.hub_id = :hub_id
  AND NOT EXISTS (SELECT 1 FROM customers_customeractivity a
                  WHERE a.customer_id = c.id AND a.hub_id = c.hub_id AND a.activity_type = 'erased');
