// customers#121 — the term the module's own search boxes send to `customers.list`.
//
// Cards keep their phone in E.164 (`+34600111222`) and the list search is a plain «contains», so a
// phone typed the way people say it («600 111 222», «0034 600…», «07700 900123») would find nobody.
// A term made only of a phone's characters is sent as its digits, without the `00` international
// prefix, the national zero or a «(0)»: those digits are always a piece of the E.164 phone. Any
// other term (a name, an email, a tax id with letters) is sent as typed.

const PHONE_ONLY = /^[\d\s+\-().\/]+$/;

export function searchTerm(typed: string): string {
  const text = typed.trim();
  if (!PHONE_ONLY.test(text) || !/\d/.test(text)) return typed;
  const digits = text.replace(/\(0\)/g, '').replace(/\D/g, '');
  return digits.replace(/^0+/, '') || digits;
}
