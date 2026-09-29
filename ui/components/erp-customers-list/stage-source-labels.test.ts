// The stage and the source of a customer are shown in the hub's language (customers#93).
//
// Both are stored as closed codes (`lead`, `walk_in`, `counter`…) and used to reach the screen raw:
// a Spanish sheet read «ETAPA Lead · ORIGEN walk_in», the create/edit form pre-filled a text box
// with `walk_in`, and the consent history ended every line with «(counter)». This file mounts the
// real screen with the REAL catalogues behind `t()` and asserts what the person reads: every code
// goes through its `en` + `es` label, and a code never leaks through as text.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const LOCALES = join(import.meta.dirname, '../../../locales');
const read = (lang: string): Record<string, string> =>
  JSON.parse(readFileSync(join(LOCALES, `${lang}.json`), 'utf8')).ui;
const en = read('en');
const es = read('es');

const STAGES = ['lead', 'prospect', 'first_purchase', 'active', 'at_risk', 'dormant', 'churned', 'vip'];
/** What a person can pick for «Source» on the sheet. */
const PICKABLE_SOURCES = ['walk_in', 'phone', 'whatsapp', 'website', 'social', 'referral', 'other'];
/** What the system writes on its own (CSV import, bulk_create default). */
const SYSTEM_SOURCES = ['import'];
/** `consent_grant.json` / `consent_withdraw.json` enum + the migrated legacy tick (004). */
const CONSENT_SOURCES = ['counter', 'web_form', 'phone', 'email', 'import', 'receipt', 'legacy_boolean'];
/** Words that are the same in both languages on purpose — anything else equal to `en` is untranslated. */
const SAME_IN_BOTH = new Set(['VIP', 'WhatsApp']);

const camel = (code: string): string =>
  code.split('_').map((p) => p[0].toUpperCase() + p.slice(1)).join('');

const CUSTOMER = {
  id: 'c1', name: 'Ada Lovelace', email: 'ada@example.com', phone: '600000000', tax_id: '',
  address: '', city: '', postal_code: '', country: '', notes: '', is_active: 1,
  lifecycle_stage: 'lead', source: 'walk_in', company_name: '', birthday: null, anniversary: null,
  preferred_channel: 'none', marketing_consent: 0, consent_date: null, total_purchases: 0,
  total_spent: 0, last_purchase_date: null,
};

const FACT = {
  id: 'f1', purpose: 'marketing', channel: 'email', contact_point: 'ada@example.com', state: 'granted',
  source: 'counter', notice_text: '', notice_version: 'v1', occurred_at: '2026-09-25T10:00:00Z',
  recorded_by: '', evidence: '', reason: '',
};

type Screen = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  openDetail(id: string): Promise<void>;
};

let customer: Record<string, unknown> = CUSTOMER;
let history: Record<string, unknown>[] = [FACT];
let sent: Array<{ name: string; payload: Record<string, unknown> }> = [];

/** `t()` of the real SDK, reduced: walks `ui.<key>` in the active locale's catalogue. */
function install(locale: 'es' | 'en') {
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'customers.stats') return [{ total: 1, active: 1, vip: 0, total_revenue: 0 }];
      if (name === 'customers.get') return [customer];
      if (name === 'customers.consent.history') return history;
      return [];
    },
    queryPage: async () => ({ rows: [customer], total: 1 }),
    queryAll: async () => [],
    command: async (name: string, payload: Record<string, unknown>) => {
      sent.push({ name, payload });
      return {};
    },
    hasPermission: () => true,
    on: () => () => {},
    locale,
    t: (catalog: Record<string, unknown>, key: string) => {
      const hit = key.split('.').reduce<unknown>(
        (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
        catalog[locale],
      );
      return typeof hit === 'string' ? hit : key;
    },
    currency: 'EUR',
    currencyDecimals: 2,
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
  customer = { ...CUSTOMER };
  history = [FACT];
  sent = [];
  install('es');
});

async function mount(): Promise<Screen> {
  await import('./erp-customers-list');
  const el = document.createElement('erp-customers-list') as Screen;
  document.body.appendChild(el);
  await vi.waitFor(() => {
    if (!el.shadowRoot?.querySelector('.kpis')) throw new Error('stats not painted yet');
  });
  await el.updateComplete;
  return el;
}

async function openSheet(): Promise<Screen> {
  const el = await mount();
  await el.openDetail(CUSTOMER.id);
  await el.updateComplete;
  return el;
}

function metaValue(el: Screen, label: string): string | undefined {
  const row = [...el.shadowRoot.querySelectorAll('dl.meta > div')]
    .find((r) => r.querySelector('dt')?.textContent?.trim() === label);
  return row?.querySelector('dd')?.textContent?.trim();
}

function selectOptions(el: Screen, testid: string): Array<{ value: string; label: string }> {
  const select = el.shadowRoot.querySelector(`[data-testid="${testid}"]`);
  expect(select, `${testid} is on screen`).toBeTruthy();
  expect(select!.tagName, `${testid} is a closed list, not a text box`).toBe('ION-SELECT');
  return [...select!.querySelectorAll('ion-select-option')].map((o) => ({
    value: o.getAttribute('value') ?? '',
    label: o.textContent?.trim() ?? '',
  }));
}

describe('the catalogues carry a label for every stage and source code (customers#93)', () => {
  const groups: Array<[string, string, string[]]> = [
    ['stage', 'stage', STAGES],
    ['source', 'source', [...PICKABLE_SOURCES, ...SYSTEM_SOURCES]],
    ['consent source', 'consentSource', CONSENT_SOURCES],
  ];
  for (const [what, prefix, codes] of groups) {
    it(`every ${what} has a non-blank en + es label that is not its code`, () => {
      for (const code of codes) {
        const key = `${prefix}${camel(code)}`;
        for (const [lang, cat] of [['en', en], ['es', es]] as const) {
          expect(cat[key]?.trim(), `${lang}: ui.${key}`).toBeTruthy();
          expect(cat[key], `${lang}: ui.${key} is the raw code`).not.toBe(code);
        }
        if (!SAME_IN_BOTH.has(en[key])) {
          expect(es[key], `es: ui.${key} is still the English «${en[key]}»`).not.toBe(en[key]);
        }
      }
    });

    it(`two ${what} codes never share a label (a column that cannot tell them apart)`, () => {
      for (const cat of [en, es]) {
        const labels = codes.map((code) => cat[`${prefix}${camel(code)}`]);
        expect(new Set(labels).size).toBe(labels.length);
      }
    });
  }
});

describe('the customer sheet shows stage and source in the hub language (customers#93)', () => {
  it('ETAPA and ORIGEN read the Spanish labels, not «Lead» / «walk_in»', async () => {
    const el = await openSheet();
    expect(metaValue(el, es.colStage)).toBe(es.stageLead);
    expect(metaValue(el, es.fieldSource)).toBe(es.sourceWalkIn);
    const meta = el.shadowRoot.querySelector('dl.meta')!.textContent!;
    expect(meta).not.toContain('walk_in');
    expect(meta).not.toMatch(/\bLead\b/);
  });

  it('the same sheet in English reads the English labels', async () => {
    install('en');
    const el = await openSheet();
    expect(metaValue(el, en.colStage)).toBe(en.stageLead);
    expect(metaValue(el, en.fieldSource)).toBe(en.sourceWalkIn);
  });

  it('a customer created by a CSV import reads «Importación», not «import»', async () => {
    customer = { ...CUSTOMER, source: 'import' };
    const el = await openSheet();
    expect(metaValue(el, es.fieldSource)).toBe(es.sourceImport);
  });

  it('a source typed by hand before the list existed is kept as the person wrote it', async () => {
    customer = { ...CUSTOMER, source: 'Feria de bodas' };
    const el = await openSheet();
    expect(metaValue(el, es.fieldSource)).toBe('Feria de bodas');
  });

  it('an empty source reads «—»', async () => {
    customer = { ...CUSTOMER, source: '' };
    const el = await openSheet();
    expect(metaValue(el, es.fieldSource)).toBe('—');
  });

  it('the consent history says where the decision was taken in words, not «(counter)»', async () => {
    const el = await openSheet();
    const line = el.shadowRoot.querySelector('[data-consent-fact="f1"]')!.textContent!;
    expect(line).toContain(es.consentSourceCounter);
    expect(line).not.toContain('counter');
  });

  it('the migrated legacy tick names itself, not «legacy_boolean»', async () => {
    history = [{ ...FACT, id: 'f2', channel: 'any', state: 'legacy_unverified', source: 'legacy_boolean' }];
    const el = await openSheet();
    const line = el.shadowRoot.querySelector('[data-consent-fact="f2"]')!.textContent!;
    expect(line).toContain(es.consentSourceLegacyBoolean);
    expect(line).not.toContain('legacy_boolean');
  });
});

describe('the create and edit forms pick the source from translated options (customers#93)', () => {
  it('create: «Origen» is a list of labels, pre-set to walk-in, with no raw code as text', async () => {
    const el = await mount();
    const options = selectOptions(el, 'customers-list-sheet-create-source');
    expect(options.map((o) => o.value)).toEqual(PICKABLE_SOURCES);
    expect(options.map((o) => o.label)).toEqual(PICKABLE_SOURCES.map((c) => es[`source${camel(c)}`]));
    const select = el.shadowRoot.querySelector('[data-testid="customers-list-sheet-create-source"]') as HTMLElement & { value: string };
    expect(select.value).toBe('walk_in');
  });

  it('edit: the stored code is selected and its label is translated', async () => {
    const el = await openSheet();
    (el.shadowRoot.querySelector('[data-testid="customers-list-edit"]') as HTMLElement).click();
    await el.updateComplete;
    const options = selectOptions(el, 'customers-list-sheet-edit-source');
    expect(options.find((o) => o.value === 'walk_in')?.label).toBe(es.sourceWalkIn);
    const select = el.shadowRoot.querySelector('[data-testid="customers-list-sheet-edit-source"]') as HTMLElement & { value: string };
    expect(select.value).toBe('walk_in');
  });

  it('edit: a system or hand-typed source stays selectable, so saving does not rewrite it', async () => {
    for (const [source, label] of [['import', es.sourceImport], ['Feria de bodas', 'Feria de bodas']]) {
      document.body.innerHTML = '';
      customer = { ...CUSTOMER, source };
      const el = await openSheet();
      (el.shadowRoot.querySelector('[data-testid="customers-list-edit"]') as HTMLElement).click();
      await el.updateComplete;
      const options = selectOptions(el, 'customers-list-sheet-edit-source');
      expect(options.find((o) => o.value === source)?.label, source).toBe(label);
      const select = el.shadowRoot.querySelector('[data-testid="customers-list-sheet-edit-source"]') as HTMLElement & { value: string };
      expect(select.value).toBe(source);
    }
  });

  it('create: the source the person picks is the one `customers.create` receives', async () => {
    const el = await mount();
    const name = el.shadowRoot.querySelector('[data-testid="customers-list-sheet-create-name"]') as HTMLInputElement;
    name.value = 'Ada Lovelace';
    name.dispatchEvent(new CustomEvent('ionInput', { bubbles: true }));
    const select = el.shadowRoot.querySelector('[data-testid="customers-list-sheet-create-source"]') as HTMLElement & { value: string };
    select.value = 'referral';
    select.dispatchEvent(new CustomEvent('ionChange', { bubbles: true }));
    await el.updateComplete;
    await (el as unknown as { create(e: Event): Promise<void> }).create(new Event('submit'));
    expect(sent.map((c) => c.name)).toEqual(['customers.create']);
    expect(sent[0].payload.source).toBe('referral');
  });

  it('edit: saving an imported or hand-typed source without touching it sends it back unchanged', async () => {
    for (const source of ['import', 'Feria de bodas']) {
      document.body.innerHTML = '';
      sent = [];
      customer = { ...CUSTOMER, source };
      const el = await openSheet();
      (el.shadowRoot.querySelector('[data-testid="customers-list-edit"]') as HTMLElement).click();
      await el.updateComplete;
      await (el as unknown as { saveEdit(e: Event): Promise<void> }).saveEdit(new Event('submit'));
      const update = sent.find((c) => c.name === 'customers.update_with_fields');
      expect(update, 'the sheet was saved').toBeTruthy();
      expect(update!.payload.source, source).toBe(source);
    }
  });

  it('the stage options of the form are translated too', async () => {
    const el = await mount();
    const options = selectOptions(el, 'customers-list-sheet-create-lifecycle_stage');
    expect(options.find((o) => o.value === 'lead')?.label).toBe(es.stageLead);
  });
});

describe('the list: the stage column and its filter speak Spanish (customers#93)', () => {
  it('filter options and cell text are the Spanish labels', async () => {
    const el = await mount();
    const table = el.shadowRoot.querySelector('ok-data-table') as HTMLElement & {
      columns: Array<{ key: string; options?: Array<{ value: string; label: string }>; format?: (r: Record<string, unknown>) => string }>;
    };
    const stage = table.columns.find((c) => c.key === 'lifecycle_stage')!;
    expect(stage.options!.map((o) => o.label)).toEqual(STAGES.map((c) => es[`stage${camel(c)}`]));
    expect(stage.format!({ lifecycle_stage: 'lead' })).toBe(es.stageLead);
    expect(stage.options!.map((o) => o.label)).not.toContain('Lead');
  });
});
