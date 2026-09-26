-- Step 14/15 of `customers.merge` (customers#86): ONE audit entry, written on the survivor, pointing
-- at the sheet it absorbed (`related_object_id`). `title` is a KEY, resolved by the sheet at render
-- time (customers#50), never a sentence — same contract as commands/anonymize_audit.sql.
-- `extra_metadata` carries who did it and when; the absorbed id is already in `related_object_id`
-- but travels here too so a raw metadata dump names it without a join.
INSERT INTO customers_customeractivity
  (id, hub_id, customer_id, activity_type, title, description, extra_metadata,
   related_object_id, related_object_type, performed_by,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT :new_id, s.hub_id, s.id, 'merged', 'activity.customer_merged', '',
       '{"actor": "' || COALESCE(CAST(:current_user_id AS TEXT), '') || '", "at": "' || :now || '", '
       || '"absorbed_id": "' || CAST(:absorbed_id AS TEXT) || '"}',
       CAST(:absorbed_id AS TEXT), 'customer', :current_user_id,
       0, :current_user_id, :current_user_id, :now, :now
FROM customers_customer s
WHERE s.id = :surviving_id AND s.hub_id = :hub_id AND s.is_deleted = 0;
