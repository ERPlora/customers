-- Idempotente: si el par ya existe, no-op (ADR-0007: ON CONFLICT DO NOTHING, no INSERT OR IGNORE).
INSERT INTO customers_customer_groups (customer_id, group_id) VALUES (:customer_id, :group_id)
ON CONFLICT (customer_id, group_id) DO NOTHING;
