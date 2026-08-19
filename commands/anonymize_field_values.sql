-- Step 4/7 of `customers.anonymize`: custom-field values ("usual dye", "skin type") are personal
-- data by definition → blanked and soft-deleted.
UPDATE customers_customerfieldvalue SET
  value = '', is_deleted = 1, deleted_at = :now,
  updated_by = :current_user_id, updated_at = :now
WHERE customer_id = :customer_id AND hub_id = :hub_id AND is_deleted = 0;
