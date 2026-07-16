-- PG-compat (auditoría pm#16, 07-17): los binds BOOLEANOS del schema van envueltos en
-- CASE WHEN :x THEN 1 WHEN NOT :x THEN 0 END — las columnas son INTEGER 0/1 por contrato
-- (§2.5) y Postgres NO castea boolean→bigint (SQLite sí lo toleraba). El tri-estado
-- preserva NULL para los COALESCE de opcionales.
UPDATE customers_customertag SET
  name = :name, color = :color, is_active = CASE WHEN :is_active THEN 1 WHEN NOT :is_active THEN 0 END,
  updated_by = :current_user_id, updated_at = :now
WHERE id = :tag_id AND hub_id = :hub_id AND is_deleted = 0;
