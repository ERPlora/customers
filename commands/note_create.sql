-- Customer note (customers#14). Step 1 of `customers.notes.add`: the note itself, resolved against
-- the customer of the runtime-injected hub (a foreign or deleted customer selects nothing, and
-- `expect_rows` in the manifest turns that into a business error). Step 2 (`note_activity.sql`)
-- projects it into the timeline in the SAME transaction: one command, both rows or none.
-- `author_name` is optional so a producer that only knows the customer and the text (the automation
-- kernel) can call the domain command as-is. Runtime injects :new_id, :hub_id, :current_user_id, :now.
INSERT INTO customers_customernote
  (id, hub_id, customer_id, content, author_id, author_name,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT :new_id, c.hub_id, c.id, :content, :current_user_id, COALESCE(:author_name, ''),
       0, :current_user_id, :current_user_id, :now, :now
FROM customers_customer c
WHERE c.id = :customer_id AND c.hub_id = :hub_id AND c.is_deleted = 0;
