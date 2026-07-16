-- PG-compat (auditoría pm#16, 07-17): los binds BOOLEANOS del schema van envueltos en
-- CASE WHEN :x THEN 1 WHEN NOT :x THEN 0 END — las columnas son INTEGER 0/1 por contrato
-- (§2.5) y Postgres NO castea boolean→bigint (SQLite sí lo toleraba). El tri-estado
-- preserva NULL para los COALESCE de opcionales.
INSERT INTO customers_customerfield
  (id, hub_id, name, field_type, options, is_required, sort_order, is_active,
   is_deleted, created_by, updated_by, created_at, updated_at)
VALUES
  (:new_id, :hub_id, :name, :field_type, :options, CASE WHEN :is_required THEN 1 WHEN NOT :is_required THEN 0 END, :sort_order, 1,
   0, :current_user_id, :current_user_id, :now, :now);
