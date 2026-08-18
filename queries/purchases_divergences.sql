-- Reconciliation (customers#8): customers whose aggregates DISAGREE with their ledger. The
-- aggregates on `customers_customer` are derived from `customers_purchase_ledger`; this query
-- is the audit that proves it (empty = healthy) and points at what to rebuild.
SELECT c.id, c.name, c.total_purchases, c.total_spent,
       COALESCE(l.n, 0) AS ledger_purchases, COALESCE(l.spent, 0) AS ledger_spent
FROM customers_customer c
LEFT JOIN (
  SELECT customer_id, COUNT(*) AS n, SUM(amount) AS spent
  FROM customers_purchase_ledger
  WHERE hub_id = :hub_id AND status = 'confirmed' AND is_deleted = 0
  GROUP BY customer_id
) l ON l.customer_id = c.id
WHERE c.hub_id = :hub_id AND c.is_deleted = 0
  AND (c.total_purchases <> COALESCE(l.n, 0) OR c.total_spent <> COALESCE(l.spent, 0))
ORDER BY c.name
