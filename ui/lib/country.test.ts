// customers#71 — the customer file keeps the country as free text (form and CSV «País»), but the
// till's invoice needs an ISO 3166 alpha-2 code. `countryCode` turns what the file holds into that
// code, reading country names from the runtime (`Intl.DisplayNames`), never from a list in here.
import { describe, expect, it } from 'vitest';
import { countryCode, countryName, countryOptions } from './country';

describe('countryCode', () => {
  it('keeps an ISO alpha-2 code, whatever its case or padding', () => {
    expect(countryCode('FR')).toBe('FR');
    expect(countryCode(' de ')).toBe('DE');
    expect(countryCode('es')).toBe('ES');
  });

  it('turns a retired code into the country it stands for today', () => {
    expect(countryCode('UK')).toBe('GB');
    expect(countryCode('FX')).toBe('FR');
  });

  it('reads the country name in Spanish or English, accents and case aside', () => {
    expect(countryCode('Francia')).toBe('FR');
    expect(countryCode('France')).toBe('FR');
    expect(countryCode('alemania')).toBe('DE');
    expect(countryCode('España')).toBe('ES');
    expect(countryCode('ESPANA')).toBe('ES');
    expect(countryCode('Estados Unidos')).toBe('US');
    expect(countryCode('United Kingdom')).toBe('GB');
  });

  it("also reads the name in the user's own language", () => {
    expect(countryCode('Deutschland')).toBe('');
    expect(countryCode('Deutschland', 'de')).toBe('DE');
  });

  it('gives nothing for an empty value or one that names no country', () => {
    expect(countryCode('')).toBe('');
    expect(countryCode(undefined)).toBe('');
    expect(countryCode('Narnia')).toBe('');
    expect(countryCode('ZZ')).toBe('');
    expect(countryCode('Calle Mayor 1')).toBe('');
  });
});

// customers#72 — the file's country is PICKED from a list, never typed: the picker's options and
// the name the sheet shows for a stored code.
describe('countryOptions', () => {
  it('puts Spain first and the rest by name in the reader\'s language', () => {
    const es = countryOptions('es');
    expect(es[0]).toEqual({ value: 'ES', label: 'España (ES)' });
    const rest = es.slice(1).map((o) => o.label);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, 'es')));
    expect(es.find((o) => o.value === 'FR')?.label).toBe('Francia (FR)');
    expect(countryOptions('en').find((o) => o.value === 'DE')?.label).toBe('Germany (DE)');
  });

  it('offers every country the till can read, once, and nothing that is not one', () => {
    const values = countryOptions('es').map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values.length).toBeGreaterThan(240);
    for (const v of values) expect(countryCode(v)).toBe(v);
    expect(values).not.toContain('EU');
    expect(values).not.toContain('ZZ');
    expect(values).not.toContain('UK');
  });
});

describe('countryName', () => {
  it('names a stored code in the reader\'s language', () => {
    expect(countryName('FR', 'es')).toBe('Francia');
    expect(countryName('FR', 'en')).toBe('France');
  });

  it('names what a legacy free-text file resolves to, and keeps text it cannot read', () => {
    expect(countryName('france', 'es')).toBe('Francia');
    expect(countryName('Narnia', 'es')).toBe('Narnia');
    expect(countryName('', 'es')).toBe('');
    expect(countryName(null, 'es')).toBe('');
  });
});
