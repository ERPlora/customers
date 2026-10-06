-- customers._phones_to_e164 — customers#121: the cards a hub already has get their phone in E.164.
--
-- Since customers#121 every write of a card saves its phone through the handler, in E.164
-- (`+34600111222`) or not at all. The cards typed before that keep «600 111 222», «0034 600…» or
-- «07700 900123», and whoever copies that text (Appointments into the appointment, and from there
-- the «appointment confirmed» WhatsApp notice) compares it and finds nobody. This rewrites them
-- with the handler's rules (`handler/src/phone.rs`), on the handler's table: the
-- `customers_e164_regions` list below is `handler/src/phone_metadata.rs` row by row, printed by
-- `cargo run -q -- sql` in `handler/tools/phone-metadata` (the battery
-- `tests/phone_e164_backfill.pg.test.py` fails if they drift).
--
-- Why a command and not a migration: a number without prefix is read in the HUB's country, and a
-- migration has no `:hub_id` to read it with (the hub also refuses a migration that names
-- `hub_settings`). Guessing Spain would turn a British «600 111 222» into a Spanish number, which
-- is somebody else. So the scheduled task `phones_to_e164` runs this per hub, in system context
-- (`:hub_id` of the hub, `:current_user_id` empty): the first tick after the update rewrites the
-- old cards, every later tick finds nothing to do. The prose of each step is at the end of the file.
WITH customers_e164_regions (iso, code, trunk, idd, lengths) AS (
  VALUES
    ('001', '979', '', '', '{9}'::int[]),
    ('AC', '247', '', '00', '{5,6}'::int[]),
    ('AD', '376', '', '00', '{6,8,9}'::int[]),
    ('AE', '971', '0', '00', '{5,6,7,8,9,10,11,12}'::int[]),
    ('AF', '93', '0', '00', '{9}'::int[]),
    ('AG', '1', '1', '011', '{10}'::int[]),
    ('AI', '1', '1', '011', '{10}'::int[]),
    ('AL', '355', '0', '00', '{6,7,8,9}'::int[]),
    ('AM', '374', '0', '00', '{8}'::int[]),
    ('AO', '244', '', '00', '{9}'::int[]),
    ('AR', '54', '0', '00', '{10,11}'::int[]),
    ('AS', '1', '1', '011', '{10}'::int[]),
    ('AT', '43', '0', '00', '{4,5,6,7,8,9,10,11,12,13}'::int[]),
    ('AU', '61', '0', '0011', '{5,6,7,8,9,10,12}'::int[]),
    ('AW', '297', '', '00', '{7}'::int[]),
    ('AX', '358', '0', '00', '{5,6,7,8,9,10,11,12}'::int[]),
    ('AZ', '994', '0', '00', '{9}'::int[]),
    ('BA', '387', '0', '00', '{8,9}'::int[]),
    ('BB', '1', '1', '011', '{10}'::int[]),
    ('BD', '880', '0', '00', '{6,7,8,9,10}'::int[]),
    ('BE', '32', '0', '00', '{8,9}'::int[]),
    ('BF', '226', '', '00', '{8}'::int[]),
    ('BG', '359', '0', '00', '{6,7,8,9,12}'::int[]),
    ('BH', '973', '', '00', '{8}'::int[]),
    ('BI', '257', '', '00', '{8}'::int[]),
    ('BJ', '229', '', '00', '{8,10}'::int[]),
    ('BL', '590', '0', '00', '{9}'::int[]),
    ('BM', '1', '1', '011', '{10}'::int[]),
    ('BN', '673', '', '00', '{7}'::int[]),
    ('BO', '591', '0', '', '{8,9}'::int[]),
    ('BQ', '599', '', '00', '{7}'::int[]),
    ('BR', '55', '0', '', '{8,9,10,11}'::int[]),
    ('BS', '1', '1', '011', '{10}'::int[]),
    ('BT', '975', '', '00', '{7,8}'::int[]),
    ('BW', '267', '', '00', '{7,8,10}'::int[]),
    ('BY', '375', '8', '810', '{6,7,8,9,10,11}'::int[]),
    ('BZ', '501', '', '00', '{7,11}'::int[]),
    ('CA', '1', '1', '011', '{7,10}'::int[]),
    ('CC', '61', '0', '0011', '{6,7,8,9,10,12}'::int[]),
    ('CD', '243', '0', '00', '{7,8,9,10}'::int[]),
    ('CF', '236', '', '00', '{8}'::int[]),
    ('CG', '242', '', '00', '{9}'::int[]),
    ('CH', '41', '0', '00', '{9,12}'::int[]),
    ('CI', '225', '', '00', '{10}'::int[]),
    ('CK', '682', '', '00', '{5}'::int[]),
    ('CL', '56', '', '', '{9,10,11}'::int[]),
    ('CM', '237', '', '00', '{8,9}'::int[]),
    ('CN', '86', '0', '00', '{7,8,9,10,11,12}'::int[]),
    ('CO', '57', '0', '', '{8,10,11}'::int[]),
    ('CR', '506', '', '00', '{8,10}'::int[]),
    ('CU', '53', '0', '119', '{6,7,8,10}'::int[]),
    ('CV', '238', '', '0', '{7}'::int[]),
    ('CW', '599', '', '00', '{7,8}'::int[]),
    ('CX', '61', '0', '0011', '{6,7,8,9,10,12}'::int[]),
    ('CY', '357', '', '00', '{8}'::int[]),
    ('CZ', '420', '', '00', '{9,10,11,12}'::int[]),
    ('DE', '49', '0', '00', '{4,5,6,7,8,9,10,11,12,13,14,15}'::int[]),
    ('DJ', '253', '', '00', '{8}'::int[]),
    ('DK', '45', '', '00', '{8}'::int[]),
    ('DM', '1', '1', '011', '{10}'::int[]),
    ('DO', '1', '1', '011', '{10}'::int[]),
    ('DZ', '213', '0', '00', '{8,9}'::int[]),
    ('EC', '593', '0', '00', '{8,9,10,11}'::int[]),
    ('EE', '372', '', '00', '{7,8,10}'::int[]),
    ('EG', '20', '0', '00', '{8,9,10}'::int[]),
    ('EH', '212', '0', '00', '{9}'::int[]),
    ('ER', '291', '0', '00', '{7}'::int[]),
    ('ES', '34', '', '00', '{9}'::int[]),
    ('ET', '251', '0', '00', '{9}'::int[]),
    ('FI', '358', '0', '00', '{5,6,7,8,9,10,11,12}'::int[]),
    ('FJ', '679', '', '00', '{7,11}'::int[]),
    ('FK', '500', '', '00', '{5}'::int[]),
    ('FM', '691', '', '00', '{7}'::int[]),
    ('FO', '298', '', '00', '{6}'::int[]),
    ('FR', '33', '0', '00', '{9}'::int[]),
    ('GA', '241', '', '00', '{7,8}'::int[]),
    ('GB', '44', '0', '00', '{7,9,10}'::int[]),
    ('GD', '1', '1', '011', '{10}'::int[]),
    ('GE', '995', '0', '00', '{9}'::int[]),
    ('GF', '594', '0', '00', '{9}'::int[]),
    ('GG', '44', '0', '00', '{7,9,10}'::int[]),
    ('GH', '233', '0', '00', '{8,9}'::int[]),
    ('GI', '350', '', '00', '{8}'::int[]),
    ('GL', '299', '', '00', '{6}'::int[]),
    ('GM', '220', '', '00', '{7}'::int[]),
    ('GN', '224', '', '00', '{8,9}'::int[]),
    ('GP', '590', '0', '00', '{9}'::int[]),
    ('GQ', '240', '', '00', '{9}'::int[]),
    ('GR', '30', '', '00', '{10,11,12}'::int[]),
    ('GT', '502', '', '00', '{8,11}'::int[]),
    ('GU', '1', '1', '011', '{10}'::int[]),
    ('GW', '245', '', '00', '{7,9}'::int[]),
    ('GY', '592', '', '001', '{7}'::int[]),
    ('HK', '852', '', '00', '{5,6,7,8,9,11}'::int[]),
    ('HN', '504', '', '00', '{8,11}'::int[]),
    ('HR', '385', '0', '00', '{7,8,9}'::int[]),
    ('HT', '509', '', '00', '{8}'::int[]),
    ('HU', '36', '06', '00', '{8,9}'::int[]),
    ('ID', '62', '0', '', '{7,8,9,10,11,12,13,14,15,16,17}'::int[]),
    ('IE', '353', '0', '00', '{7,8,9,10}'::int[]),
    ('IL', '972', '0', '', '{7,8,9,10,11,12}'::int[]),
    ('IM', '44', '0', '00', '{10}'::int[]),
    ('IN', '91', '0', '00', '{8,9,10,11,12,13}'::int[]),
    ('IO', '246', '', '00', '{7}'::int[]),
    ('IQ', '964', '0', '00', '{8,9,10}'::int[]),
    ('IR', '98', '0', '00', '{4,5,6,7,10}'::int[]),
    ('IS', '354', '', '00', '{7,9}'::int[]),
    ('IT', '39', '', '00', '{6,7,8,9,10,11,12}'::int[]),
    ('JE', '44', '0', '00', '{10}'::int[]),
    ('JM', '1', '1', '011', '{10}'::int[]),
    ('JO', '962', '0', '00', '{8,9}'::int[]),
    ('JP', '81', '0', '010', '{8,9,10,11,12,13,14,15,16,17}'::int[]),
    ('KE', '254', '0', '000', '{7,8,9,10}'::int[]),
    ('KG', '996', '0', '00', '{9,10}'::int[]),
    ('KH', '855', '0', '', '{8,9,10}'::int[]),
    ('KI', '686', '0', '00', '{5,8}'::int[]),
    ('KM', '269', '', '00', '{7}'::int[]),
    ('KN', '1', '1', '011', '{10}'::int[]),
    ('KP', '850', '0', '', '{8,10}'::int[]),
    ('KR', '82', '0', '', '{5,6,8,9,10,11,12,13,14}'::int[]),
    ('KW', '965', '', '00', '{7,8}'::int[]),
    ('KY', '1', '1', '011', '{10}'::int[]),
    ('KZ', '7', '8', '810', '{10,14}'::int[]),
    ('LA', '856', '0', '00', '{8,9,10}'::int[]),
    ('LB', '961', '0', '00', '{7,8}'::int[]),
    ('LC', '1', '1', '011', '{10}'::int[]),
    ('LI', '423', '0', '00', '{7,9}'::int[]),
    ('LK', '94', '0', '00', '{9}'::int[]),
    ('LR', '231', '0', '00', '{7,8,9}'::int[]),
    ('LS', '266', '', '00', '{8}'::int[]),
    ('LT', '370', '0', '00', '{8}'::int[]),
    ('LU', '352', '', '00', '{4,5,6,7,8,9,10,11}'::int[]),
    ('LV', '371', '', '00', '{8}'::int[]),
    ('LY', '218', '0', '00', '{9}'::int[]),
    ('MA', '212', '0', '00', '{9}'::int[]),
    ('MC', '377', '0', '00', '{8,9}'::int[]),
    ('MD', '373', '0', '00', '{8}'::int[]),
    ('ME', '382', '0', '00', '{8,9}'::int[]),
    ('MF', '590', '0', '00', '{9}'::int[]),
    ('MG', '261', '0', '00', '{9}'::int[]),
    ('MH', '692', '1', '011', '{7}'::int[]),
    ('MK', '389', '0', '00', '{8}'::int[]),
    ('ML', '223', '', '00', '{8}'::int[]),
    ('MM', '95', '0', '00', '{6,7,8,9,10}'::int[]),
    ('MN', '976', '0', '001', '{8,9,10}'::int[]),
    ('MO', '853', '', '00', '{7,8}'::int[]),
    ('MP', '1', '1', '011', '{10}'::int[]),
    ('MQ', '596', '0', '00', '{9}'::int[]),
    ('MR', '222', '', '00', '{8}'::int[]),
    ('MS', '1', '1', '011', '{10}'::int[]),
    ('MT', '356', '', '00', '{8}'::int[]),
    ('MU', '230', '', '020', '{7,8,10}'::int[]),
    ('MV', '960', '', '00', '{7,10}'::int[]),
    ('MW', '265', '0', '00', '{7,9}'::int[]),
    ('MX', '52', '', '00', '{10}'::int[]),
    ('MY', '60', '0', '00', '{8,9,10}'::int[]),
    ('MZ', '258', '', '00', '{8,9}'::int[]),
    ('NA', '264', '0', '00', '{8,9}'::int[]),
    ('NC', '687', '', '00', '{6}'::int[]),
    ('NE', '227', '', '00', '{8}'::int[]),
    ('NF', '672', '', '00', '{6}'::int[]),
    ('NG', '234', '0', '009', '{10,11,12,13,14}'::int[]),
    ('NI', '505', '', '00', '{8}'::int[]),
    ('NL', '31', '0', '00', '{5,6,7,8,9,10,11}'::int[]),
    ('NO', '47', '', '00', '{5,8}'::int[]),
    ('NP', '977', '0', '00', '{8,10,11}'::int[]),
    ('NR', '674', '', '00', '{7}'::int[]),
    ('NU', '683', '', '00', '{4,7}'::int[]),
    ('NZ', '64', '0', '00', '{5,6,7,8,9,10}'::int[]),
    ('OM', '968', '', '00', '{7,8,9}'::int[]),
    ('PA', '507', '', '00', '{7,8,10,11}'::int[]),
    ('PE', '51', '0', '00', '{8,9}'::int[]),
    ('PF', '689', '', '00', '{6,8,9}'::int[]),
    ('PG', '675', '', '00', '{7,8}'::int[]),
    ('PH', '63', '0', '00', '{6,8,9,10,11,12,13}'::int[]),
    ('PK', '92', '0', '00', '{8,9,10,11,12}'::int[]),
    ('PL', '48', '', '00', '{6,7,8,9,10}'::int[]),
    ('PM', '508', '0', '00', '{6,9}'::int[]),
    ('PR', '1', '1', '011', '{10}'::int[]),
    ('PS', '970', '0', '00', '{8,9,10}'::int[]),
    ('PT', '351', '', '00', '{9}'::int[]),
    ('PW', '680', '', '', '{7}'::int[]),
    ('PY', '595', '0', '00', '{6,7,8,9,10,11}'::int[]),
    ('QA', '974', '', '00', '{7,8,9,11}'::int[]),
    ('RE', '262', '0', '00', '{9}'::int[]),
    ('RO', '40', '0', '00', '{6,9}'::int[]),
    ('RS', '381', '0', '00', '{6,7,8,9,10,11,12}'::int[]),
    ('RU', '7', '8', '810', '{10,14}'::int[]),
    ('RW', '250', '0', '00', '{8,9}'::int[]),
    ('SA', '966', '0', '00', '{9,10}'::int[]),
    ('SB', '677', '', '', '{5,7}'::int[]),
    ('SC', '248', '', '00', '{7}'::int[]),
    ('SD', '249', '0', '00', '{9}'::int[]),
    ('SE', '46', '0', '00', '{6,7,8,9,10,12}'::int[]),
    ('SG', '65', '', '', '{8,10,11}'::int[]),
    ('SH', '290', '', '00', '{4,5}'::int[]),
    ('SI', '386', '0', '00', '{5,6,7,8}'::int[]),
    ('SJ', '47', '', '00', '{5,8}'::int[]),
    ('SK', '421', '0', '00', '{6,7,9}'::int[]),
    ('SL', '232', '0', '00', '{8}'::int[]),
    ('SM', '378', '', '00', '{8,10}'::int[]),
    ('SN', '221', '', '00', '{9}'::int[]),
    ('SO', '252', '0', '00', '{6,7,8,9}'::int[]),
    ('SR', '597', '', '00', '{6,7}'::int[]),
    ('SS', '211', '0', '00', '{9}'::int[]),
    ('ST', '239', '', '00', '{7}'::int[]),
    ('SV', '503', '', '00', '{7,8,11}'::int[]),
    ('SX', '1', '1', '011', '{10}'::int[]),
    ('SY', '963', '0', '00', '{8,9}'::int[]),
    ('SZ', '268', '', '00', '{8,9}'::int[]),
    ('TA', '290', '', '00', '{4}'::int[]),
    ('TC', '1', '1', '011', '{10}'::int[]),
    ('TD', '235', '', '00', '{8}'::int[]),
    ('TG', '228', '', '00', '{8}'::int[]),
    ('TH', '66', '0', '', '{8,9,10,13}'::int[]),
    ('TJ', '992', '', '810', '{9}'::int[]),
    ('TK', '690', '', '00', '{4,5,6,7}'::int[]),
    ('TL', '670', '', '00', '{7,8}'::int[]),
    ('TM', '993', '8', '810', '{8}'::int[]),
    ('TN', '216', '', '00', '{8}'::int[]),
    ('TO', '676', '', '00', '{5,7}'::int[]),
    ('TR', '90', '0', '00', '{7,10,12,13}'::int[]),
    ('TT', '1', '1', '011', '{10}'::int[]),
    ('TV', '688', '', '00', '{5,6,7}'::int[]),
    ('TW', '886', '0', '', '{7,8,9,10,11}'::int[]),
    ('TZ', '255', '0', '', '{9}'::int[]),
    ('UA', '380', '0', '00', '{9,10}'::int[]),
    ('UG', '256', '0', '', '{9}'::int[]),
    ('US', '1', '1', '011', '{10}'::int[]),
    ('UY', '598', '0', '00', '{4,5,6,7,8,9,10,11,12,13}'::int[]),
    ('UZ', '998', '', '00', '{9}'::int[]),
    ('VA', '39', '', '00', '{6,7,8,9,10,11,12}'::int[]),
    ('VC', '1', '1', '011', '{10}'::int[]),
    ('VE', '58', '0', '00', '{10}'::int[]),
    ('VG', '1', '1', '011', '{10}'::int[]),
    ('VI', '1', '1', '011', '{10}'::int[]),
    ('VN', '84', '0', '00', '{7,8,9,10}'::int[]),
    ('VU', '678', '', '00', '{5,7}'::int[]),
    ('WF', '681', '', '00', '{6,9}'::int[]),
    ('WS', '685', '', '0', '{5,6,7,10}'::int[]),
    ('XK', '383', '0', '00', '{8,9,10,11,12}'::int[]),
    ('YE', '967', '0', '00', '{7,8,9}'::int[]),
    ('YT', '262', '0', '00', '{9}'::int[]),
    ('ZA', '27', '0', '00', '{5,6,7,8,9,10}'::int[]),
    ('ZM', '260', '0', '00', '{9}'::int[]),
    ('ZW', '263', '0', '00', '{5,6,7,8,9,10}'::int[])
),
customers_e164_codes AS (
  SELECT r.code,
         (array_agg(r.trunk ORDER BY r.iso))[1] AS trunk,
         array_agg(DISTINCT l.n) AS lengths
    FROM customers_e164_regions r
   CROSS JOIN LATERAL unnest(r.lengths) AS l(n)
   GROUP BY r.code
),
customers_e164_home AS (
  SELECT r.code, r.trunk, r.idd
    FROM customers_e164_regions r
   WHERE r.iso = COALESCE(
           (SELECT x.iso
              FROM hub_settings s
              JOIN customers_e164_regions x ON x.iso = UPPER(TRIM(s.value))
             WHERE s.hub_id = :hub_id AND s.key = 'country_code'),
           'ES')
),
customers_e164_cards AS (
  SELECT c.hub_id, c.id, c.phone, m.code AS home_code, m.trunk AS home_trunk, m.idd AS home_idd,
         regexp_replace(c.phone, '[^0-9]', '', 'g') AS d,
         strpos(c.phone, '+') > 0 AS plus
    FROM customers_customer c
   CROSS JOIN customers_e164_home m
   WHERE c.hub_id = :hub_id
     AND btrim(c.phone, E' \t\n\r\u00a0')
         ~ '^[- \t./()\u00a0]*(\+[- \t./()\u00a0]*)?[0-9][0-9 \t./()\u00a0-]*$'
),
customers_e164_routed AS (
  SELECT k.*,
         CASE WHEN k.plus THEN k.d
              WHEN k.home_idd <> ''
               AND length(k.d) > length(k.home_idd)
               AND left(k.d, length(k.home_idd)) = k.home_idd
              THEN substr(k.d, length(k.home_idd) + 1)
         END AS intl
    FROM customers_e164_cards k
),
customers_e164_readings AS (
  SELECT r.hub_id, r.id, r.phone, 1 AS pref, c.code, c.trunk, c.lengths,
         substr(r.intl, length(c.code) + 1) AS rest
    FROM customers_e164_routed r
    JOIN customers_e164_codes c ON length(c.code) <= length(r.intl) AND left(r.intl, length(c.code)) = c.code
   WHERE r.intl IS NOT NULL
  UNION ALL
  SELECT r.hub_id, r.id, r.phone, 1, c.code, r.home_trunk, c.lengths, r.d
    FROM customers_e164_routed r
    JOIN customers_e164_codes c ON c.code = r.home_code
   WHERE r.intl IS NULL
  UNION ALL
  SELECT r.hub_id, r.id, r.phone, 2, c.code, '', c.lengths, substr(r.d, length(c.code) + 1)
    FROM customers_e164_routed r
    JOIN customers_e164_codes c ON c.code = r.home_code
   WHERE r.intl IS NULL
     AND left(r.d, length(c.code)) = c.code
),
customers_e164_national AS (
  SELECT x.hub_id, x.id, x.phone, x.pref, x.code, x.lengths,
         CASE WHEN x.trunk <> ''
               AND left(x.rest, length(x.trunk)) = x.trunk
               AND (x.trunk = '0' OR NOT (length(x.rest) = ANY (x.lengths)))
              THEN substr(x.rest, length(x.trunk) + 1)
              ELSE x.rest
         END AS nat
    FROM customers_e164_readings x
),
customers_e164_rewritten AS (
  SELECT DISTINCT ON (n.hub_id, n.id) n.hub_id, n.id, n.phone, '+' || n.code || n.nat AS e164
    FROM customers_e164_national n
   WHERE length(n.nat) = ANY (n.lengths)
   ORDER BY n.hub_id, n.id, n.pref
),
customers_e164_backed AS (
  INSERT INTO customers_phone_backup
         (id, hub_id, customer_id, phone, e164, created_by, updated_by, created_at, updated_at)
  SELECT 'phone-backup-' || w.id, w.hub_id, w.id, w.phone, w.e164,
         :current_user_id, :current_user_id, :now, :now
    FROM customers_e164_rewritten w
   WHERE w.e164 <> w.phone
  ON CONFLICT (hub_id, customer_id) DO NOTHING
  RETURNING hub_id, customer_id, e164
)
UPDATE customers_customer c
   SET phone = b.e164
  FROM customers_e164_backed b
 WHERE c.id = b.customer_id
   AND c.hub_id = :hub_id;

-- WHAT EACH STEP DOES (prose here, after the statement, so no semicolon hides inside it).
--
-- `customers_e164_codes`: one row per calling code, with the lengths ANY region of that code allows
--   and the trunk prefix they share (the handler's `possible` and `international`).
-- `customers_e164_home`: a number without prefix is read in the hub's country, `country_code` of
--   `hub_settings` trimmed and upper-cased, as the runtime reads it. No row or a code the table does
--   not know → Spain, the handler's `DEFAULT_COUNTRY`. One row: each region is listed once.
-- `customers_e164_cards`: this hub's cards only, and only what the handler would read as a number —
--   digits, spaces, tabs, no-break spaces, `-`, `.`, `/`, parentheses and at most one `+` before the
--   first digit, after trimming. Letters, a second `+` or an empty phone leave the card as it is.
-- `customers_e164_routed`: a `+`, or the international call prefix dialled from the hub's country
--   (`00` in Spain), means the digits start with a calling code.
-- `customers_e164_readings`: the candidate readings, in the handler's order — the international one
--   (the calling code is the first 1–3 digit prefix that is one: E.164 codes are prefix-free), or
--   the national one in the hub's country and, failing that, the hub's own calling code typed
--   without its `+` («34600111222»).
-- `customers_e164_national`: the trunk prefix goes when it is `0` (no country that dials one writes a
--   `0` after its calling code: «+44 (0)7700…», «07700…») and any other trunk only when the number is
--   not possible with it (Russia's «8 800…»).
-- `customers_e164_rewritten`: the first reading whose length is possible for its calling code. A
--   number no reading makes possible («600111», «01234 5678» in the United Kingdom) is left as
--   typed: nothing is thrown away, and the card asks for a valid number the next time it is edited.
-- `customers_e164_backed`: deleted cards are rewritten too (the merge and the erasure read them).
--   Every card that changes leaves its old text in `customers_phone_backup` (migration `009`, whose
--   DOWN puts it back), and only those cards are rewritten, so a second tick changes nothing — also
--   for a card whose copy already exists. `updated_at` of the card is not touched: nobody edited it.
-- Every CTE carries the module's prefix: the hub's write-scope check is lexical and cannot tell a
--   CTE from a table.
