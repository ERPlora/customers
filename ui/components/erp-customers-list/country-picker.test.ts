// The customer's country is PICKED, never typed (customers#72).
//
// It was a free-text box, so each person wrote it their own way — «Francia», «France», «FR», «Fr.»
// or a typo — and since customers#71 the till reads that text to put the right country on a foreign
// customer's invoice. Whatever it could not read went out as Spain. The market (Odoo, Shopify,
// Square) picks the country from a searchable list and stores its code; so does this sheet now,
// with the same `ok-combo` `taxes` already uses for its rules (taxes#41) — 249 options in a plain
// select is a scroll nobody finishes.
//
// Files written before keep working: a legacy text the reader resolves opens as its code, and one
// it cannot resolve is KEPT as it is until somebody picks a country — saving an unrelated field
// never erases it. The CSV import resolves the country the same way and flags the rows it cannot.
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CLIENTE = {
  id: 'c1', name: 'Ada Lovelace', email: 'ada@example.com', phone: '600000000', tax_id: '',
  address: 'Rue de Rivoli 1', city: 'Paris', postal_code: '75001', country: 'Francia', notes: '',
  is_active: 1, lifecycle_stage: 'lead', source: 'walk_in', company_name: '', birthday: null,
  anniversary: null, preferred_channel: 'none', marketing_consent: 0, consent_date: null,
  total_purchases: 0, total_spent: 0, last_purchase_date: null,
};

let ficha: Record<string, unknown> = { ...CLIENTE };
const comandos: { name: string; payload: Record<string, unknown> }[] = [];

beforeEach(() => {
  comandos.length = 0;
  ficha = { ...CLIENTE };
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'customers.get') return [ficha];
      if (name === 'customers.stats') return [{ total: 1, active: 1, vip: 0, total_revenue: 0 }];
      return [];
    },
    queryPage: async () => ({ rows: [ficha], total: 1 }),
    queryAll: async () => [],
    command: async (name: string, payload: Record<string, unknown>) => {
      comandos.push({ name, payload });
      return {};
    },
    hasPermission: () => true,
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
  };
});

type El = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };
type Combo = HTMLElement & { options: { value: string; label: string }[]; value: string };

async function montar(): Promise<El> {
  await import('./erp-customers-list');
  const el = document.createElement('erp-customers-list') as El;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const elegir = async (el: El, combo: Combo, value: string) => {
  combo.dispatchEvent(new CustomEvent('ok-change', { detail: { value }, bubbles: true, composed: true }));
  await el.updateComplete;
};

async function editar(el: El): Promise<Combo> {
  const wc = el as unknown as { openDetail(id: string): Promise<void>; startEdit(): void };
  await wc.openDetail(CLIENTE.id);
  wc.startEdit();
  await el.updateComplete;
  const combo = el.shadowRoot.querySelector('form [data-sheet-field="country"]') as Combo | null;
  expect(combo, 'the edit form has no country field').toBeTruthy();
  return combo!;
}

const guardar = async (el: El) =>
  (el as unknown as { saveEdit(e: Event): Promise<void> }).saveEdit(new Event('submit'));

describe('the add panel picks the country from a list (customers#72)', () => {
  it('the country is a searchable combo, not a text box, with Spain first', async () => {
    const el = await montar();
    const combo = el.shadowRoot.querySelector('form[slot="create"] [data-sheet-field="country"]') as Combo | null;
    expect(combo?.tagName, 'the country must be picked, not typed').toBe('OK-COMBO');
    const values = combo!.options.map((o) => o.value).filter(Boolean);
    expect(values[0]).toBe('ES');
    expect(combo!.options.find((o) => o.value === 'FR')?.label).toBe('Francia (FR)');
  });

  it('what travels in customers.create is the ISO code', async () => {
    const el = await montar();
    const form = el.shadowRoot.querySelector('form[slot="create"]')!;
    const name = form.querySelector('[data-sheet-field="name"]') as HTMLInputElement;
    name.value = 'Jean';
    name.dispatchEvent(new CustomEvent('ionInput', { bubbles: true }));
    await elegir(el, form.querySelector('[data-sheet-field="country"]') as Combo, 'FR');
    await (el as unknown as { create(e: Event): Promise<void> }).create(new Event('submit'));
    expect(comandos[0].payload.country).toBe('FR');
  });
});

describe('editing a file written before the picker (customers#72)', () => {
  it('a country the reader resolves opens as its code and saves as the code', async () => {
    const el = await montar();
    const combo = await editar(el);
    expect(combo.value).toBe('FR');
    await guardar(el);
    expect(comandos.find((c) => c.name === 'customers.update_with_fields')?.payload.country).toBe('FR');
  });

  it('text the reader cannot resolve is kept, shown, and saved untouched', async () => {
    ficha = { ...CLIENTE, country: 'Narnia' };
    const el = await montar();
    const combo = await editar(el);
    expect(combo.value).toBe('Narnia');
    expect(combo.options.find((o) => o.value === 'Narnia')?.label, 'the legacy text must stay visible').toBe('Narnia');
    await guardar(el);
    expect(comandos.find((c) => c.name === 'customers.update_with_fields')?.payload.country).toBe('Narnia');
  });

  it('picking a country replaces the legacy text', async () => {
    ficha = { ...CLIENTE, country: 'Narnia' };
    const el = await montar();
    await elegir(el, await editar(el), 'PT');
    await guardar(el);
    expect(comandos.find((c) => c.name === 'customers.update_with_fields')?.payload.country).toBe('PT');
  });

  it('the country can be cleared', async () => {
    const el = await montar();
    const combo = await editar(el);
    const none = combo.options.find((o) => o.value === '');
    expect(none?.label, 'there must be a way back to «no country»').toBe('ui.countryNone');
    await elegir(el, combo, '');
    await guardar(el);
    expect(comandos.find((c) => c.name === 'customers.update_with_fields')?.payload.country).toBe('');
  });
});

describe('the sheet reads the country by its name (customers#72)', () => {
  it('a stored code is shown as the country name, not the code', async () => {
    ficha = { ...CLIENTE, country: 'FR' };
    const el = await montar();
    await (el as unknown as { openDetail(id: string): Promise<void> }).openDetail(CLIENTE.id);
    await el.updateComplete;
    const text = el.shadowRoot.textContent ?? '';
    expect(text).toContain('Rue de Rivoli 1, 75001, Paris, Francia');
  });
});

describe('the CSV import resolves the country like the till does (customers#72)', () => {
  type Report = { created: number; skipped: unknown[]; warnings: { row: number; reason: string }[] };
  const importar = async (el: El, rows: Record<string, string>[]) => {
    const wc = el as unknown as { onCsvImport(e: CustomEvent): Promise<void>; importReport: Report | null };
    await wc.onCsvImport(new CustomEvent('csvImport', { detail: { rows } }));
    await el.updateComplete;
    return wc.importReport!;
  };
  const items = () =>
    comandos.filter((c) => c.name === 'customers.bulk_create').flatMap((c) => c.payload.items as Record<string, unknown>[]);

  it('a country name or code in the «País» column is stored as its ISO code', async () => {
    const el = await montar();
    await importar(el, [{ Nombre: 'Jean', 'País': 'Francia' }, { Nombre: 'Hans', 'País': 'de' }, { Nombre: 'Ana', 'País': '' }]);
    expect(items().map((i) => i.country)).toEqual(['FR', 'DE', '']);
  });

  it('a row whose country it cannot read is imported, keeps its text, and is flagged in the report', async () => {
    const el = await montar();
    const report = await importar(el, [{ Nombre: 'Jean', 'País': 'Francia' }, { Nombre: 'Lucy', 'País': 'Narnia' }]);
    expect(report.created).toBe(2);
    expect(items()[1].country, 'the text is not thrown away').toBe('Narnia');
    expect(report.warnings).toEqual([{ row: 2, reason: 'ui.importReasonCountry' }]);
    expect(el.shadowRoot.querySelector('.import-report')?.textContent).toContain('ui.importReasonCountry');
  });
});

describe('every new string ships in en and es (customers#72)', () => {
  const read = (f: string) =>
    (JSON.parse(readFileSync(join(__dirname, '../../../locales', f), 'utf8')) as { ui: Record<string, string> }).ui;
  it.each(['countryNone', 'countrySearch', 'countryNoMatch', 'importReasonCountry'])('%s', (key) => {
    expect(read('en.json')[key], `en: ui.${key}`).toBeTruthy();
    expect(read('es.json')[key], `es: ui.${key}`).toBeTruthy();
    expect(read('es.json')[key]).not.toBe(read('en.json')[key]);
  });
});
