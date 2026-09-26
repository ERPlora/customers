-- Step 1/15 of `customers.merge` (customers#86): THE GUARD. Anchored by the manifest's
-- `expect_rows` (hub#1091) — this is the ONLY statement whose affected-row count decides whether
-- the merge goes through: it can touch exactly one row when, and only when, both sheets are real,
-- belong to THIS hub, are not already retired and are not the same row. Every statement after this
-- one runs unconditionally too (a refusal rolls the whole transaction back), so this is also where
-- the survivor absorbs the absorbed sheet's data: it fills only its OWN empty fields, appends free
-- text instead of losing it, and sums the aggregates the purchase-ledger re-point (below) is about
-- to make true again. Name, lifecycle_stage, source, is_active and marketing_consent are the
-- survivor's own and are left out of the SET list on purpose.
-- Runtime injects :hub_id, :current_user_id, :now.
UPDATE customers_customer s SET
  email        = CASE WHEN s.email = ''        THEN a.email        ELSE s.email END,
  phone        = CASE WHEN s.phone = ''        THEN a.phone        ELSE s.phone END,
  tax_id       = CASE WHEN s.tax_id = ''       THEN a.tax_id       ELSE s.tax_id END,
  address      = CASE WHEN s.address = ''      THEN a.address      ELSE s.address END,
  city         = CASE WHEN s.city = ''         THEN a.city         ELSE s.city END,
  postal_code  = CASE WHEN s.postal_code = ''  THEN a.postal_code  ELSE s.postal_code END,
  country      = CASE WHEN s.country = ''      THEN a.country      ELSE s.country END,
  avatar       = CASE WHEN s.avatar = ''       THEN a.avatar       ELSE s.avatar END,
  company_name = CASE WHEN s.company_name = '' THEN a.company_name ELSE s.company_name END,
  birthday     = COALESCE(s.birthday, a.birthday),
  anniversary  = COALESCE(s.anniversary, a.anniversary),
  preferred_channel = CASE WHEN s.preferred_channel = 'none' THEN a.preferred_channel ELSE s.preferred_channel END,
  notes = CASE
    WHEN s.notes <> '' AND a.notes <> '' THEN s.notes || E'\n' || a.notes
    WHEN s.notes <> '' THEN s.notes
    ELSE a.notes
  END,
  total_purchases = s.total_purchases + a.total_purchases,
  total_spent     = s.total_spent + a.total_spent,
  last_purchase_date = CASE
    WHEN s.last_purchase_date IS NULL THEN a.last_purchase_date
    WHEN a.last_purchase_date IS NULL THEN s.last_purchase_date
    WHEN s.last_purchase_date >= a.last_purchase_date THEN s.last_purchase_date
    ELSE a.last_purchase_date
  END,
  updated_by = :current_user_id, updated_at = :now
FROM customers_customer a
WHERE s.id = :surviving_id AND s.hub_id = :hub_id AND s.is_deleted = 0
  AND a.id = :absorbed_id AND a.hub_id = :hub_id AND a.is_deleted = 0
  AND s.id <> a.id;
