-- EVERY consent fact of a customer, newest first (customers#10) — the audit trail itself.
--
-- Not «the current state»: that is `customers.consent.state`. This is the whole chain, because the
-- question an inspection asks is not «may you write to them today» but «could you, in March, and
-- what had they been told». EDPB 05/2020 §108 spells out what has to be demonstrable — HOW consent
-- was obtained, WHEN, and THE INFORMATION PROVIDED at the time — and the AEPD's consent receipt
-- adds WHO. All four are columns here, so the sheet can just show them.
--
-- Nothing is ever removed from this chain: a withdrawal is a row, not a delete. The only thing that
-- takes rows out is erasure (`customers.anonymize`), which soft-deletes them like every other
-- personal datum, and the `is_deleted = 0` below is what makes that stick.
SELECT id, purpose, channel, state, contact_point, source, notice_text, notice_version,
       evidence, reason, recorded_by, occurred_at, created_at
FROM customers_consent_ledger
WHERE customer_id = :customer_id AND hub_id = :hub_id AND is_deleted = 0
ORDER BY occurred_at DESC, created_at DESC, id DESC
LIMIT 200;
