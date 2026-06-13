-- Idempotente: si el par ya existe, no-op (ADR-0007: ON CONFLICT DO NOTHING, no INSERT OR IGNORE).
INSERT INTO customers_customer_tags (customer_id, tag_id) VALUES (:customer_id, :tag_id)
ON CONFLICT (customer_id, tag_id) DO NOTHING;
