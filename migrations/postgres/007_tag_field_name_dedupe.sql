-- customers · 007 — customers#107: leave ONE live tag and ONE live custom field per name and hub, so `008` can build its indexes.
UPDATE customers_customertag t
   SET name = btrim(t.name) || ' (' || ranked.name_rank || ')'
  FROM (
         SELECT id,
                ROW_NUMBER() OVER (
                  PARTITION BY hub_id, lower(btrim(name))
                  ORDER BY created_at, id
                ) AS name_rank
           FROM customers_customertag
          WHERE is_deleted = 0
            AND is_active = 1
       ) ranked
 WHERE t.id = ranked.id
   AND ranked.name_rank > 1;

UPDATE customers_customertag t
   SET name = btrim(t.name) || ' (' || t.id || ')'
  FROM (
         SELECT id,
                ROW_NUMBER() OVER (
                  PARTITION BY hub_id, lower(btrim(name))
                  ORDER BY created_at, id
                ) AS name_rank
           FROM customers_customertag
          WHERE is_deleted = 0
            AND is_active = 1
       ) ranked
 WHERE t.id = ranked.id
   AND ranked.name_rank > 1;

UPDATE customers_customerfield f
   SET name = btrim(f.name) || ' (' || ranked.name_rank || ')'
  FROM (
         SELECT id,
                ROW_NUMBER() OVER (
                  PARTITION BY hub_id, lower(btrim(name))
                  ORDER BY created_at, id
                ) AS name_rank
           FROM customers_customerfield
          WHERE is_deleted = 0
            AND is_active = 1
       ) ranked
 WHERE f.id = ranked.id
   AND ranked.name_rank > 1;

UPDATE customers_customerfield f
   SET name = btrim(f.name) || ' (' || f.id || ')'
  FROM (
         SELECT id,
                ROW_NUMBER() OVER (
                  PARTITION BY hub_id, lower(btrim(name))
                  ORDER BY created_at, id
                ) AS name_rank
           FROM customers_customerfield
          WHERE is_deleted = 0
            AND is_active = 1
       ) ranked
 WHERE f.id = ranked.id
   AND ranked.name_rank > 1;

-- (Prose at the end on purpose: a semicolon inside a leading `--` block is what splits a migration
-- in the wrong place, so this prose carries none.)
--
-- WHY. Until customers#107 nothing stopped a hub from holding two live tags called «Moroso» or two
-- live custom fields called «Alergias», and the lists showed two identical rows nobody could tell
-- apart. `008` makes the rule a unique index per table, and a unique index cannot be built over
-- rows that already break it — the migration would fail and the hub's update with it. Same plan as
-- groups (`005`, customers#94):
--
--   * per (hub, name ignoring case and surrounding spaces), the OLDEST live row keeps its name (the
--     one customers were most likely tagged with, or filled in, first), then the id so the choice
--     is deterministic
--   * the others are RENAMED, never merged or deleted: «Moroso (2)», «(3)»… They keep their id,
--     colour, type, options, order, every tagged customer and every stored field value (both hang
--     from the id, never from the name), and the owner sees rows that can now be told apart
--   * the second statement of each pair only fires when the first one's suffix was itself taken (a
--     tag the owner had already called «Moroso (2)»): what is still repeated gets its own id as the
--     suffix, which no other row can carry, so `008` always builds
--   * deleted rows (history) and inactive ones (in no list) are left as they are, the indexes
--     ignore them. Other hubs are never compared with each other: the window is per hub.
--
-- Declared `backfill` in module.json: DML only, no DDL. Idempotent: once each (hub, name) has a
-- single live row, a second run matches nothing.
--
-- REVERSIBLE in effect only: the old names are not kept, and bringing two identical names back
-- would only reopen the bug. Nothing depends on a tag's or a field's name (assignments and values
-- go by id), so the rename needs no down.
