-- Step 3/7 of `customers.anonymize`: the timeline (descriptions, metadata) is blanked and
-- soft-deleted — EXCEPT the `erased` audit entry itself, which must survive a second run.
UPDATE customers_customeractivity SET
  description = '', extra_metadata = '{}', is_deleted = 1, deleted_at = :now,
  updated_by = :current_user_id, updated_at = :now
WHERE customer_id = :customer_id AND hub_id = :hub_id AND is_deleted = 0
  AND activity_type <> 'erased';
