// customers#71 — the customer file keeps the country as free text (form and CSV «País»), but the
// till's invoice needs an ISO 3166 alpha-2 code. `countryCode` turns what the file holds into that
// code, reading country names from the runtime (`Intl.DisplayNames`), never from a list in here.
import { describe, expect, it } from 'vitest';
import { countryCode } from './country';

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
