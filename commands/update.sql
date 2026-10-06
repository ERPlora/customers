-- Customer edit (the UI sends the whole set of editable fields). Reached as `customers._update`
-- from the handler (`update` / `update_with_fields`), which has already turned :phone into E.164
-- or refused it (customers#121): never called straight from a screen.
--
-- **`marketing_consent` y `consent_date` YA NO se escriben aquí** (customers#10). Esta sentencia
-- ponía el booleano y nunca tocaba la fecha, así que se podía encender el consentimiento con fecha
-- nula, o retirarlo conservando una fecha que ya no significaba nada — y, peor, un consentimiento
-- quedaba dado por el hecho de que alguien pasara por la pantalla de edición: ni finalidad, ni
-- canal, ni qué se le enseñó, ni quién lo apuntó. El consentimiento no se infiere de editar una
-- ficha, igual que no se infiere de una compra ni de crear el cliente.
--
-- Las dos columnas siguen existiendo y siguen leyéndose (lista, ficha, blueprints, export): son un
-- ESPEJO DERIVADO del ledger `customers_consent_ledger`, recalculado por `customers.consent.grant`
-- y `customers.consent.withdraw` (`commands/consent_sync_flag.sql`). El bind `:marketing_consent`
-- sigue llegando en el payload y aquí se ignora a propósito: el esquema lo marca como no
-- soportado, y quitarlo del contrato rompería a todo el que ya lo manda.
UPDATE customers_customer SET
  name = :name, email = :email, phone = :phone, tax_id = :tax_id,
  address = :address, city = :city, postal_code = :postal_code, country = :country,
  notes = :notes, lifecycle_stage = :lifecycle_stage, source = :source,
  company_name = :company_name, birthday = :birthday, anniversary = :anniversary,
  preferred_channel = :preferred_channel,
  is_active = :is_active, updated_by = :current_user_id, updated_at = :now
WHERE id = :customer_id AND hub_id = :hub_id AND is_deleted = 0;
