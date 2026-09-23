// customers#71 — the customer file keeps its country as free text (the form and the CSV «País»
// column take whatever was typed), while the till's invoice needs an ISO 3166 alpha-2 code
// (`customer_country`, read by `sales`, sales#332). This turns one into the other. Country names
// come from the runtime's `Intl.DisplayNames`, never from a list written here.

/** Region codes CLDR names that are not a country: groupings and pseudo-regions. */
const NOT_A_COUNTRY = new Set(['EU', 'EZ', 'QO', 'UN', 'XA', 'XB', 'ZZ']);

/** The code a region goes by today: CLDR still names retired aliases (FX, UK, DD…) exactly like
 *  the country that replaced them, so «France» would otherwise resolve to FX. */
function canonical(code: string): string {
  try {
    return Intl.getCanonicalLocales(`und-${code}`)[0].slice(4);
  } catch {
    return '';
  }
}

/** Every current alpha-2 region code the runtime can name, generated rather than listed by hand. */
const REGION_CODES: readonly string[] = (() => {
  const names = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
  const out: string[] = [];
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      const name = names.of(code);
      if (name && name !== code && canonical(code) === code && !NOT_A_COUNTRY.has(code)) out.push(code);
    }
  }
  return out;
})();

const CODES = new Set(REGION_CODES);

/** Case, accents and spacing do not make a different country. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const byLanguage = new Map<string, Map<string, string>>();

/** Normalized country name → code, in one language. Built once per language. */
function namesIn(lang: string): Map<string, string> {
  let index = byLanguage.get(lang);
  if (!index) {
    index = new Map();
    try {
      const names = new Intl.DisplayNames([lang], { type: 'region', fallback: 'none' });
      for (const code of REGION_CODES) {
        const name = names.of(code);
        if (name) index.set(normalize(name), code);
      }
    } catch {
      // An invalid language tag names nothing: the other languages still resolve.
    }
    byLanguage.set(lang, index);
  }
  return index;
}

/** The ISO alpha-2 code of the country the file holds — a code or its name in English, Spanish or
 *  the user's language (`lang`) — or '' when it holds nothing that names a country. */
export function countryCode(raw: string | null | undefined, lang?: string): string {
  const text = (raw ?? '').trim();
  if (!text) return '';
  if (/^[a-z]{2}$/i.test(text)) {
    const code = canonical(text.toUpperCase());
    return CODES.has(code) ? code : '';
  }
  const key = normalize(text);
  for (const l of new Set(['es', 'en', ...(lang ? [lang] : [])])) {
    const code = namesIn(l).get(key);
    if (code) return code;
  }
  return '';
}
