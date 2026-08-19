-- Customer creation. Runtime injects :new_id, :hub_id, :current_user_id, :now.
-- Walk-in of the counter (customers#32): only `name` is required — the rest is enrichment. An
-- absent bind arrives as NULL, and every NOT NULL column falls back to the same default the table
-- declares (empty string / lead / walk_in / none / consent 0), so a quick creation and a full sheet
-- write the same shape and an absent value never becomes a blank the sheet cannot tell apart.
-- Consent is NOT forced here, and since customers#10 it cannot be SET here either: a customer is
-- created with no consent, full stop. `:marketing_consent`/`:consent_date` still arrive in the
-- payload (bulk import, older callers) and are ignored on purpose — creating a sheet, importing
-- a CSV or making a purchase are none of them somebody saying yes, and a column that an import
-- can switch on is the column an operator turns «unknown» into «subscribed» with. Consent is
-- recorded as a fact with its evidence: `customers.consent.grant`.
INSERT INTO customers_customer
  (id, hub_id, name, email, phone, tax_id, address, city, postal_code, country, avatar,
   notes, is_active, lifecycle_stage, source, company_name, birthday, anniversary,
   preferred_channel, marketing_consent, consent_date, total_purchases, total_spent,
   is_deleted, created_by, updated_by, created_at, updated_at)
VALUES
  (:new_id, :hub_id, :name,
   COALESCE(:email, ''), COALESCE(:phone, ''), COALESCE(:tax_id, ''), COALESCE(:address, ''),
   COALESCE(:city, ''), COALESCE(:postal_code, ''), COALESCE(:country, ''), COALESCE(:avatar, ''),
   COALESCE(:notes, ''), 1, COALESCE(:lifecycle_stage, 'lead'), COALESCE(:source, 'walk_in'),
   COALESCE(:company_name, ''), :birthday, :anniversary,
   COALESCE(:preferred_channel, 'none'), 0, NULL, 0, 0,
   0, :current_user_id, :current_user_id, :now, :now);
