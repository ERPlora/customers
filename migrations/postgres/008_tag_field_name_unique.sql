-- customers · 008 — customers#107: one live tag and one live custom field per name and hub.
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_tag_hub_name_live
    ON customers_customertag (hub_id, lower(btrim(name)))
    WHERE is_deleted = 0 AND is_active = 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_field_hub_name_live
    ON customers_customerfield (hub_id, lower(btrim(name)))
    WHERE is_deleted = 0 AND is_active = 1;

-- (Prose at the end on purpose: a semicolon inside a leading `--` block is what splits a migration
-- in the wrong place, so this prose carries none.)
--
-- WHAT CHANGES. «Tags» accepted a second «Moroso» and «Fields» a second «Alergias» without a word.
-- The name is now unique per hub among the rows a person can SEE: live (`is_deleted = 0`, the
-- ADR-0145 soft delete frees the name, as groups `006` does) and active (`tags.list` and
-- `fields.list` show only `is_active = 1`, so an inactive row holding its name would refuse a
-- «Moroso» that is in no list). Case and surrounding spaces do not make another one: «Moroso» and
-- « moroso » are the same to the person picking from the list. The manifest's `on_unique` (create
-- and update) names these indexes, so the refusal reaches the screen as `customers.tag_name_taken`
-- or `customers.field_name_taken` instead of the platform's `db`.
--
-- WHY IT RUNS AFTER 007. `007` renames the duplicates a hub already has, so these indexes always
-- build.
--
-- Re-entrant: `CREATE … IF NOT EXISTS` is a no-op on the second boot.
--
-- REVERSIBLE. An index keeps no rows:
-- DOWN (one statement per line, run in this order):
--   DROP INDEX IF EXISTS uq_customers_field_hub_name_live
--   DROP INDEX IF EXISTS uq_customers_tag_hub_name_live
