-- customers · 006 — customers#94: one live group per name and hub.
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_group_hub_name_live
    ON customers_customergroup (hub_id, lower(btrim(name)))
    WHERE is_deleted = 0 AND is_active = 1;

-- (Prose at the end on purpose: a semicolon inside a leading `--` block is what splits a migration
-- in the wrong place, so this prose carries none.)
--
-- WHAT CHANGES. «Groups» accepted a second «Fidelidad nueva» without a word. The name is now unique
-- per hub among the groups a person can SEE: live (`is_deleted = 0`, the ADR-0145 soft delete frees
-- the name, as kitchen 012 and payment_gateways 004 do) and active (`groups.list` shows only
-- `is_active = 1`, so an inactive group holding its name would refuse a «VIP» that is in no list).
-- Case and surrounding spaces do not make another group: «VIP» and « vip » are the same one to the
-- person picking from the list. The manifest's `on_unique` (create and update) names this index,
-- so the refusal reaches the screen as `customers.group_name_taken` instead of the platform's `db`.
--
-- WHY IT RUNS AFTER 005. `005` renames the duplicates a hub already has, so this index always builds.
--
-- Re-entrant: `CREATE … IF NOT EXISTS` is a no-op on the second boot.
--
-- REVERSIBLE. An index keeps no rows:
-- DOWN (one statement per line, run in this order):
--   DROP INDEX IF EXISTS uq_customers_group_hub_name_live
