-- Step 2 of `customers._reverse_purchase` (customers#8): the timeline entry for the void. Written
-- ONLY if step 1 flipped the row in this very command (`voided_at = :now`, this delivery's
-- timestamp) — a redelivered `sale.voided` flips nothing and writes nothing here.
-- `title` is a KEY, resolved by the sheet at render time (customers#50).
INSERT INTO customers_customeractivity
  (id, hub_id, customer_id, activity_type, title, description, extra_metadata,
   related_object_id, related_object_type, performed_by,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT :new_id, l.hub_id, l.customer_id, 'purchase_voided', 'activity.purchase_voided', COALESCE(CAST(:reason AS TEXT), ''),
       '{"amount": ' || l.amount || ', "currency": "' || l.currency || '"}',
       l.source_id, l.source_type, :current_user_id,
       0, :current_user_id, :current_user_id, :now, :now
FROM customers_purchase_ledger l
WHERE l.hub_id = :hub_id AND l.source_type = 'sale' AND l.source_id = CAST(:sale_id AS TEXT)
  AND l.status = 'voided' AND l.voided_at = :now;
