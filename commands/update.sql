-- PG-compat (auditoría pm#16, 07-17): los binds BOOLEANOS del schema van envueltos en
-- CASE WHEN :x THEN 1 WHEN NOT :x THEN 0 END — las columnas son INTEGER 0/1 por contrato
-- (§2.5) y Postgres NO castea boolean→bigint (SQLite sí lo toleraba). El tri-estado
-- preserva NULL para los COALESCE de opcionales.
-- Edición de cliente (la UI envía el conjunto completo de campos editables, Tier 0/1).
-- Portado de CustomerService.update_customer.
UPDATE customers_customer SET
  name = :name, email = :email, phone = :phone, tax_id = :tax_id,
  address = :address, city = :city, postal_code = :postal_code, country = :country,
  notes = :notes, lifecycle_stage = :lifecycle_stage, source = :source,
  company_name = :company_name, birthday = :birthday, anniversary = :anniversary,
  preferred_channel = :preferred_channel, marketing_consent = CASE WHEN :marketing_consent THEN 1 WHEN NOT :marketing_consent THEN 0 END,
  is_active = CASE WHEN :is_active THEN 1 WHEN NOT :is_active THEN 0 END, updated_by = :current_user_id, updated_at = :now
WHERE id = :customer_id AND hub_id = :hub_id AND is_deleted = 0;
