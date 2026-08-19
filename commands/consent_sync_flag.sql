-- Step 2/3 of both consent commands (customers#10): the sheet's boolean, DERIVED from the ledger.
--
-- `customers_customer.marketing_consent` / `consent_date` are kept, and kept honest: no command
-- writes them by hand any more (`customers.update` stopped — see that file), they are recomputed
-- here from the facts. Everything that already reads them — the list, the sheet, a blueprint, a CSV
-- export, `whatsapp_inbox` the day it looks — keeps working without knowing this table exists. Same
-- shape as `total_spent` over the purchase ledger (customers#8): the aggregate is a convenience,
-- the rows are the truth.
--
-- ALWAYS over the `marketing` purpose, whatever purpose the command carried: this pair of columns
-- has meant «marketing» since 001_init, and recomputing it from, say, a profiling consent would
-- silently change what a column means for every reader that already has it.
--
-- «Yes» = at least one channel whose LAST fact is `granted`. `legacy_unverified` therefore never
-- turns the flag on by itself — but it does not turn it OFF either: this statement only runs when
-- somebody records a real fact for that customer, so a hub full of legacy sheets keeps reading
-- exactly as it did until a human actually says something.
-- Runtime injects :hub_id, :current_user_id, :now.
WITH effective AS (
  SELECT DISTINCT ON (l.channel) l.channel, l.state, l.occurred_at
  FROM customers_consent_ledger l
  WHERE l.customer_id = CAST(:customer_id AS TEXT) AND l.hub_id = :hub_id
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
WHERE c.id = CAST(:customer_id AS TEXT) AND c.hub_id = :hub_id AND c.is_deleted = 0;
