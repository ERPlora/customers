-- Purchase history of ONE customer from the ledger (customers#8): every commercial link with its
-- source document (opaque `source_type`/`source_id` — the amounts and lines belong to `sales`),
-- amount, currency and status (`confirmed` | `voided`). Voided rows are kept and shown: history
-- is never rewritten. Paginated `list` query: no ORDER BY / LIMIT here (the runtime adds them).
SELECT l.id, l.customer_id, l.source_type, l.source_id, l.amount, l.currency, l.status,
       l.voided_at, l.created_at
FROM customers_purchase_ledger l
WHERE l.hub_id = :hub_id AND l.customer_id = :customer_id AND l.is_deleted = 0
