-- Customers whose phone is the SAME NUMBER as :phone, however either side was typed
-- (whatsapp_inbox#162). Runtime injects :hub_id.
--
-- `customers.list` filters `phone` with a LIKE over the raw column, so the number WhatsApp gives
-- (`34600111222`) never found a card typed `600 111 222` or `+34 600-111-222`. Here both sides are
-- reduced to digits and leading zeros are dropped (the `00` international prefix, a national trunk
-- `0` as in UK `07700…`). They match when they are equal, or when one is the other plus a 1-3 digit
-- country code — a card typed without it is still her. Both sides need 7 digits at least: a shorter
-- number is an extension or a typo, not an identity.
--
-- An empty or absent :phone answers NO rows, never the whole list: a caller that lost the number
-- must not be handed everybody. Deciding between two matching cards is the caller's job (the
-- WhatsApp link links nobody then); this query only answers who carries the number.
WITH wanted AS (
  SELECT ltrim(regexp_replace(COALESCE(:phone, ''), '[^0-9]', '', 'g'), '0') AS d
)
SELECT c.id, c.name, c.email, c.phone
FROM customers_customer c
CROSS JOIN wanted w
CROSS JOIN LATERAL (
  SELECT ltrim(regexp_replace(c.phone, '[^0-9]', '', 'g'), '0') AS n
) k
WHERE c.hub_id = :hub_id AND c.is_deleted = 0
  AND length(w.d) >= 7 AND length(k.n) >= 7
  AND (
    k.n = w.d
    OR (length(w.d) - length(k.n) BETWEEN 1 AND 3 AND right(w.d, length(k.n)) = k.n)
    OR (length(k.n) - length(w.d) BETWEEN 1 AND 3 AND right(k.n, length(w.d)) = w.d)
  )
ORDER BY c.name, c.id
