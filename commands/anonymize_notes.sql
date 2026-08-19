-- Step 2/7 of `customers.anonymize`: notes are free text about a person → blanked and soft-deleted.
-- Guarded through the customer's own hub (the note table carries hub_id too).
UPDATE customers_customernote SET
  content = '', author_name = '', is_deleted = 1, deleted_at = :now,
  updated_by = :current_user_id, updated_at = :now
WHERE customer_id = :customer_id AND hub_id = :hub_id AND is_deleted = 0;
