-- Records a purchase IDEMPOTENTLY (customers#8) — listener of `sale.completed`.
--
-- ONE statement (data-modifying CTE, Postgres-only per ADR-0154): the ledger row and the aggregate
-- UPDATE share the same transaction and the same guard. The INSERT is keyed by
-- `(hub_id, source_type, source_id)`; `ON CONFLICT DO NOTHING` + `RETURNING` means the UPDATE runs
-- ONLY when the row is NEW — the same event delivered twice moves the totals once. Voiding is
-- `_reverse_purchase.sql`; re-recording a voided sale is a no-op too (the row exists).
--
-- `:sale_id` comes from the event (`sales` emits it). A caller without it (assistant, API) gets a
-- `manual` entry keyed by its own ledger id — still a row, just not deduplicable. `customer_id` NULL
-- (anonymous sale) or a customer of another hub → nothing selected, nothing written: safe no-op.
-- Runtime injects :new_id, :hub_id, :current_user_id, :now; :total is CENTS (ADR-0007).
WITH ins AS (
  INSERT INTO customers_purchase_ledger
    (id, hub_id, customer_id, source_type, source_id, amount, currency, status,
     is_deleted, created_by, updated_by, created_at, updated_at)
  SELECT :new_id, c.hub_id, c.id,
         CASE WHEN CAST(:sale_id AS TEXT) IS NULL THEN 'manual' ELSE 'sale' END,
         COALESCE(CAST(:sale_id AS TEXT), :new_id),
         CAST(:total AS BIGINT), COALESCE(CAST(:currency AS TEXT), ''), 'confirmed',
         0, :current_user_id, :current_user_id, :now, :now
  FROM customers_customer c
  WHERE c.id = CAST(:customer_id AS TEXT) AND c.hub_id = :hub_id AND c.is_deleted = 0
  ON CONFLICT (hub_id, source_type, source_id) DO NOTHING
  RETURNING customer_id, amount
)
UPDATE customers_customer c SET
  total_purchases = c.total_purchases + 1,
  total_spent = c.total_spent + ins.amount,
  last_purchase_date = :now,
  lifecycle_stage = CASE
    WHEN c.lifecycle_stage IN ('lead', 'prospect') THEN 'first_purchase'
    WHEN c.lifecycle_stage IN ('first_purchase', 'at_risk', 'dormant') THEN 'active'
    ELSE c.lifecycle_stage
  END,
  updated_at = :now
FROM ins
WHERE c.id = ins.customer_id AND c.hub_id = :hub_id;
