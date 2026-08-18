-- Customer creation. Runtime injects :new_id, :hub_id, :current_user_id, :now.
-- Walk-in of the counter (customers#32): only `name` is required — the rest is enrichment. An
-- absent bind arrives as NULL, and every NOT NULL column falls back to the same default the table
-- declares (empty string / lead / walk_in / none / consent 0), so a quick creation and a full sheet
-- write the same shape and an absent value never becomes a blank the sheet cannot tell apart.
-- Consent is NOT forced here: it is captured when the data is used for marketing.
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
   COALESCE(:preferred_channel, 'none'), COALESCE(:marketing_consent, 0), :consent_date, 0, 0,
   0, :current_user_id, :current_user_id, :now, :now);
