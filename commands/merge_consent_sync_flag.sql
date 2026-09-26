-- Step 13/15 of `customers.merge` (customers#86): re-derive the survivor's marketing flag from its
-- OWN ledger, now widened by the facts that just moved from the absorbed sheet (previous step).
-- Same logic as commands/consent_sync_flag.sql (customers#10), parameterised on :surviving_id — but
-- gated so a merge NEVER flips a flag the survivor's ledger cannot back: it only runs once there is
-- at least one REAL fact (`granted`/`withdrawn`); a sheet that only ever had the legacy, unverified
-- boolean keeps reading exactly as it did (there is nothing to derive it from).
-- Runtime injects :hub_id, :current_user_id, :now.
WITH effective AS (
  SELECT DISTINCT ON (l.channel) l.channel, l.state, l.occurred_at
  FROM customers_consent_ledger l
  WHERE l.customer_id = CAST(:surviving_id AS TEXT) AND l.hub_id = :hub_id
    AND l.is_deleted = 0 AND l.purpose = 'marketing'
  ORDER BY l.channel, l.occurred_at DESC, l.created_at DESC, l.id DESC
), live AS (
  SELECT MAX(occurred_at) AS at FROM effective WHERE state = 'granted'
)
UPDATE customers_customer c SET
  marketing_consent = CASE WHEN live.at IS NULL THEN 0 ELSE 1 END,
  consent_date = live.at,
  updated_by = :current_user_id, updated_at = :now
FROM live
WHERE c.id = CAST(:surviving_id AS TEXT) AND c.hub_id = :hub_id AND c.is_deleted = 0
  AND EXISTS (
    SELECT 1 FROM customers_consent_ledger r
    WHERE r.customer_id = CAST(:surviving_id AS TEXT) AND r.hub_id = :hub_id
      AND r.is_deleted = 0 AND r.purpose = 'marketing' AND r.state IN ('granted', 'withdrawn')
  );
