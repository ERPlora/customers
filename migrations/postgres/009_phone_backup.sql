-- customers · 009 — customers#121: where the phone of each card is kept before it becomes E.164.
--
-- The scheduled command `customers._phones_to_e164` rewrites the phones typed before customers#121
-- («600 111 222», «0034 600…») into the one form every write saves since then (`+34600111222`). A
-- rewrite that threw the old text away could not be undone, so each rewritten card leaves ONE row
-- here: its hub, the card, the text it had and the number it was given. A card the command does
-- not touch leaves nothing. The rewrite is a command and not a migration because it reads the
-- hub's country, and a migration has no `:hub_id` to read it with.
--
-- It is a copy of a personal datum, so `customers.anonymize` deletes the card's row
-- (`commands/anonymize_phone_backup.sql`): an erasure that left the old phone here would not be one.
CREATE TABLE IF NOT EXISTS customers_phone_backup (
    id          TEXT PRIMARY KEY,
    hub_id      TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    -- The phone as it was typed, before the upgrade.
    phone       TEXT NOT NULL,
    -- The number the command wrote in its place. The DOWN only restores a card that still carries
    -- it: a phone edited after the upgrade is newer than both and is kept.
    e164        TEXT NOT NULL,
    is_deleted  INTEGER NOT NULL DEFAULT 0,
    deleted_at  TEXT, created_by TEXT, updated_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    UNIQUE (hub_id, customer_id)
);

-- The old text goes back on the cards before the table goes: it is the only place it is kept.
-- DOWN (one statement per line, run in this order):
--   UPDATE customers_customer c SET phone = b.phone FROM customers_phone_backup b WHERE b.hub_id = c.hub_id AND b.customer_id = c.id AND c.phone = b.e164
--   DROP TABLE IF EXISTS customers_phone_backup
