-- Step 2 of `customers.notes.add` (customers#14): the timeline entry for the note just written.
-- The customer sheet reads ONLY `customers.activities`, so a note without this row is invisible —
-- which is exactly what happened when the projection was a second command left to the caller.
-- Same `:new_id` as the note (each table has its own primary key), so the entry points at its note
-- through `related_object_id`. `:title` is optional: the UI sends its translated label, other
-- producers get the English source string.
INSERT INTO customers_customeractivity
  (id, hub_id, customer_id, activity_type, title, description, extra_metadata,
   related_object_id, related_object_type, performed_by,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT :new_id, c.hub_id, c.id, 'note', COALESCE(:title, 'Note added'), :content, '{}',
       :new_id, 'note', :current_user_id,
       0, :current_user_id, :current_user_id, :now, :now
FROM customers_customer c
WHERE c.id = :customer_id AND c.hub_id = :hub_id AND c.is_deleted = 0;
