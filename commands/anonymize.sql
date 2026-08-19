-- Step 1/7 of `customers.anonymize` (customers#11, GDPR minimum): the sheet's PII is replaced by
-- markers and the row is KEPT — `id` survives so sales, invoices and the purchase ledger keep
-- pointing at a pseudonymised row (fiscal retention beats erasure for those documents). Aggregates
-- (`total_purchases`, `total_spent`, `last_purchase_date`) are business statistics, not PII: kept.
-- Idempotent: a second run rewrites the same markers and keeps the first `deleted_at`. Hub-scoped by
-- the WHERE; the manifest's `expect_rows {min 1}` turns "no row" into `customer_unavailable`.
-- Runtime injects :hub_id, :current_user_id, :now.
UPDATE customers_customer SET
  name = 'Deleted customer', email = '', phone = '', tax_id = '', address = '', city = '',
  postal_code = '', country = '', avatar = '', notes = '', company_name = '',
  birthday = NULL, anniversary = NULL, preferred_channel = 'none',
  marketing_consent = 0, consent_date = NULL,
  is_active = 0, is_deleted = 1, deleted_at = COALESCE(deleted_at, :now),
  updated_by = :current_user_id, updated_at = :now
WHERE id = :customer_id AND hub_id = :hub_id;
