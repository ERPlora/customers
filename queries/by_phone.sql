-- Customers whose phone is the SAME NUMBER as :phone, however either side was typed
-- (whatsapp_inbox#162), read as a number of the BUSINESS's country (whatsapp_inbox#199).
-- Runtime injects :hub_id.
--
-- `customers.list` filters `phone` with a LIKE over the raw column, so the number WhatsApp gives
-- (`34600111222`) never found a card typed `600 111 222` or `+34 600-111-222`. Here both sides are
-- reduced to digits and leading zeros are dropped (the `00` international prefix, a national trunk
-- `0` as in UK `07700…`). They match when they are equal, or when one is the other with the calling
-- code of the hub's country in front: a card typed without it is a number of THIS country, so it is
-- still her. The same national digits behind ANOTHER country's code are somebody else — a French
-- `33 600 111 222` writing to a Spanish salon is not the local card `600 111 222` (the rule the
-- WhatsApp inbox applies since whatsapp_inbox#167; the WhatsApp recipes read this query as is).
-- Both sides need 7 digits at least: a shorter number is an extension or a typo, not an identity.
--
-- The country is the core's `hub_settings.country_code` (ADR-0085): the runtime binds no
-- `:country_code`, so it is read here, and a hub that never saved its settings has no row and is
-- `ES`, the runtime's default (`settings::country_code_of`). A country with no known calling code
-- matches the exact number only: any doubt is «nobody». The ISO 3166 → E.164 table is the same one
-- the whatsapp_inbox handler uses (`calling_code`); a country added there is added here.
--
-- An empty or absent :phone answers NO rows, never the whole list: a caller that lost the number
-- must not be handed everybody. Deciding between two matching cards is the caller's job (the
-- WhatsApp link links nobody then); this query only answers who carries the number.
WITH wanted AS (
  SELECT ltrim(regexp_replace(COALESCE(:phone, ''), '[^0-9]', '', 'g'), '0') AS d
),
home_country AS (
  SELECT COALESCE(
    (SELECT NULLIF(UPPER(TRIM(s.value)), '') FROM hub_settings s
      WHERE s.hub_id = :hub_id AND s.key = 'country_code'),
    'ES') AS iso
),
calling_codes (iso, code) AS (VALUES
    ('US', '1'), ('CA', '1'), ('AG', '1'), ('AI', '1'), ('AS', '1'), ('BB', '1'), ('BM', '1'),
    ('BS', '1'), ('DM', '1'), ('DO', '1'), ('GD', '1'), ('GU', '1'), ('JM', '1'), ('KN', '1'),
    ('KY', '1'), ('LC', '1'), ('MP', '1'), ('MS', '1'), ('PR', '1'), ('SX', '1'), ('TC', '1'),
    ('TT', '1'), ('VC', '1'), ('VG', '1'), ('VI', '1'), ('UM', '1'), ('RU', '7'), ('KZ', '7'),
    ('EG', '20'), ('ZA', '27'), ('GR', '30'), ('NL', '31'), ('BE', '32'), ('FR', '33'),
    ('ES', '34'), ('HU', '36'), ('IT', '39'), ('VA', '39'), ('RO', '40'), ('CH', '41'),
    ('AT', '43'), ('GB', '44'), ('GG', '44'), ('IM', '44'), ('JE', '44'), ('DK', '45'),
    ('SE', '46'), ('NO', '47'), ('SJ', '47'), ('PL', '48'), ('DE', '49'), ('PE', '51'),
    ('MX', '52'), ('CU', '53'), ('AR', '54'), ('BR', '55'), ('CL', '56'), ('CO', '57'),
    ('VE', '58'), ('MY', '60'), ('AU', '61'), ('CX', '61'), ('CC', '61'), ('ID', '62'),
    ('PH', '63'), ('NZ', '64'), ('PN', '64'), ('SG', '65'), ('TH', '66'), ('JP', '81'),
    ('KR', '82'), ('VN', '84'), ('CN', '86'), ('TR', '90'), ('IN', '91'), ('PK', '92'),
    ('AF', '93'), ('LK', '94'), ('MM', '95'), ('IR', '98'), ('SS', '211'), ('MA', '212'),
    ('EH', '212'), ('DZ', '213'), ('TN', '216'), ('LY', '218'), ('GM', '220'), ('SN', '221'),
    ('MR', '222'), ('ML', '223'), ('GN', '224'), ('CI', '225'), ('BF', '226'), ('NE', '227'),
    ('TG', '228'), ('BJ', '229'), ('MU', '230'), ('LR', '231'), ('SL', '232'), ('GH', '233'),
    ('NG', '234'), ('TD', '235'), ('CF', '236'), ('CM', '237'), ('CV', '238'), ('ST', '239'),
    ('GQ', '240'), ('GA', '241'), ('CG', '242'), ('CD', '243'), ('AO', '244'), ('GW', '245'),
    ('IO', '246'), ('SC', '248'), ('SD', '249'), ('RW', '250'), ('ET', '251'), ('SO', '252'),
    ('DJ', '253'), ('KE', '254'), ('TZ', '255'), ('UG', '256'), ('BI', '257'), ('MZ', '258'),
    ('ZM', '260'), ('MG', '261'), ('RE', '262'), ('YT', '262'), ('ZW', '263'), ('NA', '264'),
    ('MW', '265'), ('LS', '266'), ('BW', '267'), ('SZ', '268'), ('KM', '269'), ('SH', '290'),
    ('ER', '291'), ('AW', '297'), ('FO', '298'), ('GL', '299'), ('GI', '350'), ('PT', '351'),
    ('LU', '352'), ('IE', '353'), ('IS', '354'), ('AL', '355'), ('MT', '356'), ('CY', '357'),
    ('FI', '358'), ('AX', '358'), ('BG', '359'), ('LT', '370'), ('LV', '371'), ('EE', '372'),
    ('MD', '373'), ('AM', '374'), ('BY', '375'), ('AD', '376'), ('MC', '377'), ('SM', '378'),
    ('UA', '380'), ('RS', '381'), ('ME', '382'), ('XK', '383'), ('HR', '385'), ('SI', '386'),
    ('BA', '387'), ('MK', '389'), ('CZ', '420'), ('SK', '421'), ('LI', '423'), ('FK', '500'),
    ('GS', '500'), ('BZ', '501'), ('GT', '502'), ('SV', '503'), ('HN', '504'), ('NI', '505'),
    ('CR', '506'), ('PA', '507'), ('PM', '508'), ('HT', '509'), ('GP', '590'), ('BL', '590'),
    ('MF', '590'), ('BO', '591'), ('GY', '592'), ('EC', '593'), ('GF', '594'), ('PY', '595'),
    ('MQ', '596'), ('SR', '597'), ('UY', '598'), ('CW', '599'), ('BQ', '599'), ('TL', '670'),
    ('NF', '672'), ('AQ', '672'), ('BN', '673'), ('NR', '674'), ('PG', '675'), ('TO', '676'),
    ('SB', '677'), ('VU', '678'), ('FJ', '679'), ('PW', '680'), ('WF', '681'), ('CK', '682'),
    ('NU', '683'), ('WS', '685'), ('KI', '686'), ('NC', '687'), ('TV', '688'), ('PF', '689'),
    ('TK', '690'), ('FM', '691'), ('MH', '692'), ('KP', '850'), ('HK', '852'), ('MO', '853'),
    ('KH', '855'), ('LA', '856'), ('BD', '880'), ('TW', '886'), ('MV', '960'), ('LB', '961'),
    ('JO', '962'), ('SY', '963'), ('IQ', '964'), ('KW', '965'), ('SA', '966'), ('YE', '967'),
    ('OM', '968'), ('PS', '970'), ('AE', '971'), ('IL', '972'), ('BH', '973'), ('QA', '974'),
    ('BT', '975'), ('MN', '976'), ('NP', '977'), ('TJ', '992'), ('TM', '993'), ('AZ', '994'),
    ('GE', '995'), ('KG', '996'), ('UZ', '998')
),
home AS (
  SELECT cc.code FROM home_country h JOIN calling_codes cc ON cc.iso = h.iso
)
SELECT c.id, c.name, c.email, c.phone
FROM customers_customer c
CROSS JOIN wanted w
CROSS JOIN LATERAL (
  SELECT ltrim(regexp_replace(c.phone, '[^0-9]', '', 'g'), '0') AS n
) k
LEFT JOIN home ON TRUE
WHERE c.hub_id = :hub_id AND c.is_deleted = 0
  AND length(w.d) >= 7 AND length(k.n) >= 7
  AND (
    k.n = w.d
    OR w.d = home.code || k.n
    OR k.n = home.code || w.d
  )
ORDER BY c.name, c.id
