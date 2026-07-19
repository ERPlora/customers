-- 002_customer_order.sql — ADR-0141: JUNCTION cliente↔pedido, propiedad de `customers`.
--
-- El pedido (`sales_order`) NO sabe de clientes, igual que no sabe de mesas: una tienda de
-- alimentación vende sin cliente asignado. La asociación la OWNea el satélite que depende de
-- `sales`, no al revés. `order_id` es una referencia OPACA (sin FK cross-módulo, contrato §2.5).
--
-- Ojo: esto es la asociación VIVA. El snapshot FISCAL del comprador (nombre/NIF/dirección) viaja
-- congelado en la venta al cobrar (ADR-0132) — son cosas distintas y las dos hacen falta.
CREATE TABLE IF NOT EXISTS customers_customer_order (
    id          TEXT PRIMARY KEY,
    hub_id      TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    order_id    TEXT NOT NULL,   -- sales_order.id (opaco)
    is_deleted INTEGER NOT NULL DEFAULT 0, deleted_at TEXT,
    created_by TEXT, updated_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_order ON customers_customer_order (hub_id, order_id);
CREATE INDEX IF NOT EXISTS ix_customer_order_cust ON customers_customer_order (hub_id, customer_id);
