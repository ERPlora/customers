// customers#68 (ADR-0398) — the sentence a DECLARED domain code carries.
//
// `module.json → errors` declares which codes this module provides; `locales/<lang>.json →
// errors.<code>` carries their text, in English (source) and Spanish (ADR-0055). This is the
// reader every screen shares, so the four of them stopped keeping four copies of it.
//
// It reads the catalogue OBJECT and never `ErploraClient.t()`, and that is not a shortcut: `t()`
// splits its key on `.` and WALKS the path, which only worked while the texts sat in a nested
// `errors.customers.<name>` bucket. Under the flat contract the walk dies on the second segment and
// the lookup returns the raw key forever — silently, in front of the operator.
//
// It also stays here rather than leaning on the SDK: since hub#1570 the shell speaks a module's
// refusal on its own, but `module.json` cannot demand a minimum shell version, so on a hub whose
// SDK predates it this file is the only thing between a Spanish counter and the handler's English.
// The two paths are written to produce the SAME sentence (see the `{message}` splice below), so
// whichever one answers first, the operator reads the same words — and when BOTH answer (an
// up-to-date shell already spoke the refusal before this screen caught it), the sentence is
// spliced once, not twice: see `alreadySpoken`.

/** `catalog` is `{ <lang>: { errors: { "<module>.<code>": "…" } } }` — what the WC imports. */
type Catalogs = Record<string, unknown>;

/** The source language of every string (ADR-0055): the fallback when the active one is missing. */
const SOURCE_LANG = 'en';

function textFor(catalog: Catalogs, lang: string, code: string): string {
  const dict = catalog[lang] as { errors?: Record<string, unknown> } | undefined;
  const text = dict?.errors?.[code];
  return typeof text === 'string' && text.trim() ? text : '';
}

/**
 * The declared sentence for the code an error carries, or `''` when there is none.
 *
 * `''` and not the message on purpose: the caller knows which screen it is and picks its own
 * fallback. Handing back `e.message` here would put the server's detail — written for whoever reads
 * the log, in the language the handler happened to be written in — back on screen through the very
 * door this closed.
 *
 * `{message}` is spliced with the handler's own detail exactly as `refusalText()` does in the hub
 * SDK: the module owns the sentence, the handler owns which field and which value, and codes like
 * `customers.field_required` are worthless without the second half.
 */
export function domainErrorText(catalog: Catalogs, locale: string, e: unknown): string {
  const code = (e as { code?: unknown } | null | undefined)?.code;
  if (typeof code !== 'string' || !code) return '';
  const text = textFor(catalog, locale, code) || textFor(catalog, SOURCE_LANG, code);
  if (!text.includes(PLACEHOLDER)) return text;
  const message = e instanceof Error ? e.message : '';
  if (alreadySpoken(catalog, code, message)) return message;
  return text.replaceAll(PLACEHOLDER, message);
}

/** The slot a declared sentence leaves for the handler's own detail (`refusalText()` in the SDK). */
const PLACEHOLDER = '{message}';

/**
 * Has the shell's SDK already spoken this refusal with the module's own sentence?
 *
 * Since hub#1570 `unwrap()` in the SDK throws a module's refusal with `e.message` REPLACED by the
 * declared text, `{message}` already spliced (`refusalText()`). Splicing it again here would read
 * «Falta un campo obligatorio: Falta un campo obligatorio: …» on every shell that is up to date —
 * the very shell this catalogue is published for. A message that already fits one of the module's
 * own templates, in whichever language the shell spoke it, IS the spoken sentence: it stays as it
 * arrived. The handler's raw detail (`\`Birthday\` must be a date …`) never fits a template, so
 * an older shell that hands it over untouched still gets it spliced below.
 */
function alreadySpoken(catalog: Catalogs, code: string, message: string): boolean {
  if (!message) return false;
  for (const lang of Object.keys(catalog)) {
    const template = textFor(catalog, lang, code);
    const at = template.indexOf(PLACEHOLDER);
    if (at < 0) continue;
    const prefix = template.slice(0, at);
    const suffix = template.slice(at + PLACEHOLDER.length);
    if (message.length < prefix.length + suffix.length) continue;
    if (message.startsWith(prefix) && message.endsWith(suffix)) return true;
  }
  return false;
}
