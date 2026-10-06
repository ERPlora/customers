// customers#121 — cards keep their phone in E.164 (`+34600111222`), and the list search is a plain
// «contains». A cashier who types the number the way people say it («600 111 222», «0034 600…»,
// «07700 900123») would find nobody, so the module's own search boxes send a phone-looking term as
// the digits that follow the international prefix and the national zero: a «contains» on those
// digits finds the E.164 phone. Anything that is not only a phone (a name, an email, a tax id with
// letters) is sent as typed.
import { describe, expect, it } from 'vitest';
import { searchTerm } from './phone-search';

describe('searchTerm', () => {
  it('sends a spaced or punctuated phone as its digits', () => {
    expect(searchTerm('600 111 222')).toBe('600111222');
    expect(searchTerm('600-111-222')).toBe('600111222');
    expect(searchTerm('600.111.222')).toBe('600111222');
    expect(searchTerm('(600) 111/222')).toBe('600111222');
    expect(searchTerm(' 600 111 ')).toBe('600111');
  });

  it('drops the + and keeps the calling code, which the E.164 phone carries', () => {
    expect(searchTerm('+34 600 111 222')).toBe('34600111222');
  });

  it('drops the 00 international prefix and the national zero, which the E.164 phone does not carry', () => {
    expect(searchTerm('0034 600 111 222')).toBe('34600111222');
    expect(searchTerm('07700 900123')).toBe('7700900123');
    expect(searchTerm('+44 (0)7700 900123')).toBe('447700900123');
  });

  it('leaves anything that is not only a phone as typed', () => {
    expect(searchTerm('Ana García')).toBe('Ana García');
    expect(searchTerm('ana@example.com')).toBe('ana@example.com');
    expect(searchTerm('12345678Z')).toBe('12345678Z');
    expect(searchTerm('Calle 5')).toBe('Calle 5');
    expect(searchTerm('')).toBe('');
    expect(searchTerm('+')).toBe('+');
  });

  it('never turns a term into an empty search, which would list everybody', () => {
    expect(searchTerm('00')).toBe('00');
    expect(searchTerm('0 0 0')).toBe('000');
  });
});
