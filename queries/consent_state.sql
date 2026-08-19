-- The EFFECTIVE consent of a customer, one row per purpose and channel (customers#10).
--
-- This is the read a marketing or messaging module makes before writing to somebody, and it is
-- `expose_api` for exactly that: the contract between modules is a declared query, never a peek at
-- another module's table (§2.5). Answering it is a `DISTINCT ON` over the ledger — **the last fact
-- wins** — so a withdrawal is in force on the very next read, with no job in between.
--
-- Three states come out and all three matter:
--   * `granted`            — there is evidence, and it is on the row (`notice_text`, `source`, who).
--   * `withdrawn`          — they said no. Not the absence of a yes: an explicit no.
--   * `legacy_unverified`  — somebody ticked a box before this ledger existed. **Never treat it as
--                            consent**: EDPB 05/2020 §168 says a presumed consent with no records
--                            kept is below the standard and has to be renewed.
-- And a customer with NO row at all answers nothing, which is the fourth state — never asked.
--
-- `contact_point` travels so the caller can check the consent was given for the address it is about
-- to write to: a sheet whose email was corrected last week is not covered by the consent given for
-- the old one.
SELECT l.purpose, l.channel, l.state, l.contact_point, l.source, l.notice_version, l.occurred_at,
       l.recorded_by, l.evidence
FROM (
  SELECT DISTINCT ON (x.purpose, x.channel) x.*
  FROM customers_consent_ledger x
  WHERE x.customer_id = :customer_id AND x.hub_id = :hub_id AND x.is_deleted = 0
  ORDER BY x.purpose, x.channel, x.occurred_at DESC, x.created_at DESC, x.id DESC
) l
ORDER BY l.purpose, l.channel
;
