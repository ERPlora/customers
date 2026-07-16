-- PG-compat (auditoría pm#16, 07-17): los binds BOOLEANOS del schema van envueltos en
-- CASE WHEN :x THEN 1 WHEN NOT :x THEN 0 END — las columnas son INTEGER 0/1 por contrato
-- (§2.5) y Postgres NO castea boolean→bigint (SQLite sí lo toleraba). El tri-estado
-- preserva NULL para los COALESCE de opcionales.
-- Alta de cliente. Runtime inyecta :new_id, :hub_id, :current_user_id, :now.
-- Portado de CustomerService.create_customer (campos base; M2M groups/tags vía handler WASM).
INSERT INTO customers_customer
  (id, hub_id, name, email, phone, tax_id, address, city, postal_code, country, avatar,
   notes, is_active, lifecycle_stage, source, company_name, birthday, anniversary,
   preferred_channel, marketing_consent, consent_date, total_purchases, total_spent,
   is_deleted, created_by, updated_by, created_at, updated_at)
VALUES
  (:new_id, :hub_id, :name, :email, :phone, :tax_id, :address, :city, :postal_code, :country, :avatar,
   :notes, 1, :lifecycle_stage, :source, :company_name, :birthday, :anniversary,
   :preferred_channel, CASE WHEN :marketing_consent THEN 1 WHEN NOT :marketing_consent THEN 0 END, :consent_date, 0, 0,
   0, :current_user_id, :current_user_id, :now, :now);
