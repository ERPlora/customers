-- Reverses a purchase when its sale is VOIDED (customers#8) — listener of `sale.voided`.
--
-- Mirror of `record_purchase.sql`, ONE statement: flips the ledger row `confirmed → voided`
-- (history is kept — never deleted) and, only for the row it actually flipped, subtracts the
-- amount, decrements the count, recomputes `last_purchase_date` from the remaining confirmed rows
-- and steps the stage back deterministically — the exact mirror of the forward CASE in
-- `record_purchase.sql`: no confirmed purchase left → `lead`; one left and `active` →
-- `first_purchase`; anything else keeps its stage (a VIP is not demoted by one void). A second void
-- of the same sale flips nothing → no-op. Hub-scoped by the ledger's own `hub_id`: hub A cannot
-- reverse hub B's sale.
--
-- The `last_purchase_date` subquery excludes `rev.id` explicitly: a data-modifying CTE is NOT
-- visible to the rest of the same statement, so the row being voided still reads `confirmed`.
-- Runtime injects :hub_id, :current_user_id, :now; :sale_id comes from the event.
WITH rev AS (
  UPDATE customers_purchase_ledger
  SET status = 'voided', voided_at = :now, updated_by = :current_user_id, updated_at = :now
  WHERE hub_id = :hub_id AND source_type = 'sale' AND source_id = CAST(:sale_id AS TEXT)
    AND status = 'confirmed' AND is_deleted = 0
  RETURNING id, customer_id, amount
)
UPDATE customers_customer c SET
  total_purchases = GREATEST(c.total_purchases - 1, 0),
  total_spent = c.total_spent - rev.amount,
  last_purchase_date = (SELECT MAX(l.created_at) FROM customers_purchase_ledger l
                        WHERE l.hub_id = c.hub_id AND l.customer_id = c.id AND l.id <> rev.id
                          AND l.status = 'confirmed' AND l.is_deleted = 0),
  lifecycle_stage = CASE
    WHEN c.total_purchases - 1 <= 0 AND c.lifecycle_stage IN ('first_purchase', 'active') THEN 'lead'
    WHEN c.total_purchases - 1 = 1 AND c.lifecycle_stage = 'active' THEN 'first_purchase'
    ELSE c.lifecycle_stage
  END,
  updated_at = :now
FROM rev
WHERE c.id = rev.customer_id AND c.hub_id = :hub_id;
