-- Step 2 of `customers.notes.add` (customers#14): the timeline entry for the note just written.
-- The customer sheet reads ONLY `customers.activities`, so a note without this row is invisible —
-- which is exactly what happened when the projection was a second command left to the caller.
-- Same `:new_id` as the note (each table has its own primary key), so the entry points at its note
-- through `related_object_id`. `:title` is optional: a producer with a title of its own sends it,
-- everybody else gets the module's default.
-- `title` holds a KEY, never a sentence (customers#50): what a person reads is resolved by the
-- sheet against the module catalogue at render time. A row written today is read years later,
-- possibly by a hub in another language, and text already in a column cannot be translated after
-- the fact (ADR-0055 / ADR-0199).
INSERT INTO customers_customeractivity
  (id, hub_id, customer_id, activity_type, title, description, extra_metadata,
   related_object_id, related_object_type, performed_by,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT :new_id, c.hub_id, c.id, 'note', COALESCE(:title, 'activity.note_added'), :content, '{}',
       :new_id, 'note', :current_user_id,
       0, :current_user_id, :current_user_id, :now, :now
FROM customers_customer c
WHERE c.id = :customer_id AND c.hub_id = :hub_id AND c.is_deleted = 0;
