-- customers · 009 — customers#121: where `010` keeps the phone each card had before it became E.164.
--
-- `010` rewrites the phones typed before customers#121 («600 111 222», «0034 600…») into the one
-- form every write saves since then (`+34600111222`). A rewrite that threw the old text away could
-- not be undone, so each rewritten card leaves ONE row here: its hub, the card, the text it had and
-- the number it was given. A card `010` does not touch leaves nothing.
--
-- It is a copy of a personal datum, so `customers.anonymize` deletes the card's row
-- (`commands/anonymize_phone_backup.sql`): an erasure that left the old phone here would not be one.
CREATE TABLE IF NOT EXISTS customers_phone_backup (
    id          TEXT PRIMARY KEY,
    hub_id      TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    -- The phone as it was typed, before the upgrade.
    phone       TEXT NOT NULL,
    -- The number `010` wrote in its place. The DOWN only restores a card that still carries it: a
    -- phone edited after the upgrade is newer than both and is kept.
    e164        TEXT NOT NULL,
    is_deleted  INTEGER NOT NULL DEFAULT 0,
    deleted_at  TEXT, created_by TEXT, updated_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    UNIQUE (hub_id, customer_id)
);

-- DOWN (one statement per line, run in this order):
--   DROP TABLE IF EXISTS customers_phone_backup
