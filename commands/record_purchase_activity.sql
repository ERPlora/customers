-- Step 2 of `customers.record_purchase` (customers#8): the timeline entry linking the customer to
-- the sale. Written ONLY if step 1 inserted the ledger row in this very command (same `:new_id`):
-- a redelivered event inserts nothing in step 1, so it writes nothing here either.
INSERT INTO customers_customeractivity
  (id, hub_id, customer_id, activity_type, title, description, extra_metadata,
   related_object_id, related_object_type, performed_by,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT :new_id, l.hub_id, l.customer_id, 'purchase', 'Purchase recorded', '',
       '{"amount": ' || l.amount || ', "currency": "' || l.currency || '"}',
       l.source_id, l.source_type, :current_user_id,
       0, :current_user_id, :current_user_id, :now, :now
FROM customers_purchase_ledger l
WHERE l.id = :new_id AND l.hub_id = :hub_id;
