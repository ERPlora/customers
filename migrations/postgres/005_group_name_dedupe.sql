-- customers · 005 — customers#94: leave ONE live group per name and hub, so `006` can build its index.
UPDATE customers_customergroup g
   SET name = btrim(g.name) || ' (' || ranked.name_rank || ')'
  FROM (
         SELECT id,
                ROW_NUMBER() OVER (
                  PARTITION BY hub_id, lower(btrim(name))
                  ORDER BY created_at, id
                ) AS name_rank
           FROM customers_customergroup
          WHERE is_deleted = 0
            AND is_active = 1
       ) ranked
 WHERE g.id = ranked.id
   AND ranked.name_rank > 1;

UPDATE customers_customergroup g
   SET name = btrim(g.name) || ' (' || g.id || ')'
  FROM (
         SELECT id,
                ROW_NUMBER() OVER (
                  PARTITION BY hub_id, lower(btrim(name))
                  ORDER BY created_at, id
                ) AS name_rank
           FROM customers_customergroup
          WHERE is_deleted = 0
            AND is_active = 1
       ) ranked
 WHERE g.id = ranked.id
   AND ranked.name_rank > 1;

-- (Prose at the end on purpose: a semicolon inside a leading `--` block is what splits a migration
-- in the wrong place, so this prose carries none.)
--
-- WHY. Until customers#94 nothing stopped a hub from holding two live groups called «Fidelidad
-- nueva», and the list showed two identical rows nobody could tell apart. `006` makes the rule a
-- unique index, and a unique index cannot be built over rows that already break it — the migration
-- would fail and the hub's update with it. This is the plan for those hubs:
--
--   * per (hub, name ignoring case and surrounding spaces), the OLDEST live group keeps its name
--     (the one customers were most likely assigned to first), then the id so the choice is
--     deterministic
--   * the others are RENAMED, never merged or deleted: «Fidelidad nueva (2)», «(3)»… They keep
--     their id, description, colour, order and every customer in them, and the owner sees two
--     groups that can now be told apart and can merge or rename them by hand
--   * the second statement only fires when the first one's suffix was itself taken (a group the
--     owner had already called «Fidelidad nueva (2)»): what is still repeated gets its own id as the
--     suffix, which no other group can carry, so `006` always builds
--   * deleted groups (history) and inactive ones (in no list) are left as they are, the index
--     ignores them. Other hubs are never compared with each other: the window is per hub.
--
-- Declared `backfill` in module.json: DML only, no DDL. Idempotent: once each (hub, name) has a
-- single live group, a second run matches nothing.
--
-- REVERSIBLE in effect only: the old names are not kept, and bringing two identical names back
-- would only reopen the bug. Nothing depends on a group's name (memberships go by id), so the
-- rename needs no down.
