// «Merge with…» on the customer sheet (customers#86): the button that switches the merge on.
//
// The data half already exists: `customers.merge` (customers#87) folds the absorbed sheet into the
// surviving one and emits `customer.merged`, and every module that keeps a customer re-points its
// rows on that event. This file pins the screen that drives it, the way Square, Shopify and Odoo
// do it: from the sheet you are on, pick the duplicate, read what is going to happen, confirm.
//
// The sheet that is OPEN survives. The duplicate you pick is the one that disappears. A choice of
// «which one survives» would be one more decision at the counter; opening the other sheet and
// merging from there covers that case with the same two clicks.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

const ANA = {
  id: 'c1', name: 'Ana García', email: 'ana@example.com', phone: '600000000', tax_id: '',
  address: '', city: '', postal_code: '', country: '', notes: '', is_active: 1,
  lifecycle_stage: 'lead', source: 'walk_in', company_name: '', birthday: null, anniversary: null,
  preferred_channel: 'none', marketing_consent: 0, consent_date: null, total_purchases: 0,
  total_spent: 0, last_purchase_date: null,
};
const ANA_WHATSAPP = { ...ANA, id: 'c2', name: 'ana garcia', email: '', phone: '600000001' };
const LUIS = { ...ANA, id: 'c3', name: 'Luis Pérez', email: 'luis@example.com', phone: '611111111' };

type Call = { name: string; params: Record<string, unknown> };
let queries: Call[] = [];
let commands: Call[] = [];
let candidates: () => Promise<unknown> = async () => ({ rows: [ANA, ANA_WHATSAPP, LUIS], total: 3 });
let merge: () => Promise<unknown> = async () => ({});
let perms: Set<string> | null = null;

beforeEach(() => {
  queries = [];
  commands = [];
  candidates = async () => ({ rows: [ANA, ANA_WHATSAPP, LUIS], total: 3 });
  merge = async () => ({});
  perms = null;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string, params: Record<string, unknown> = {}) => {
      queries.push({ name, params });
      if (name === 'customers.stats') return [{ total: 3, active: 3, vip: 0, total_revenue: 0 }];
      if (name === 'customers.get') return [ANA];
      if (name === 'customers.list') return candidates();
      return [];
    },
    queryPage: async () => ({ rows: [ANA, ANA_WHATSAPP, LUIS], total: 3 }),
    queryAll: async () => [],
    command: async (name: string, params: Record<string, unknown> = {}) => {
      commands.push({ name, params });
      if (name === 'customers.merge') return merge();
      return {};
    },
    hasPermission: (p: string) => (perms ? perms.has(p) : true),
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${Object.values(params).join('|')}` : key,
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
    // The real client always exposes it; the list controller needs it for its money filters.
    currencyDecimals: 2,
  };
});

type Sheet = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  detail: unknown;
  formError: string;
  formMsg: string;
};

const settle = async (el: Sheet) => {
  for (let i = 0; i < 4; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
  }
};

async function openSheet(): Promise<Sheet> {
  await import('./erp-customers-list');
  const el = document.createElement('erp-customers-list') as Sheet;
  document.body.appendChild(el);
  await settle(el);
  el.detail = { ...ANA };
  await settle(el);
  return el;
}

const $ = (el: Sheet, id: string) => el.shadowRoot.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

async function click(el: Sheet, id: string) {
  const node = $(el, id);
  expect(node, `${id} is not on screen`).toBeTruthy();
  node!.click();
  await settle(el);
}

async function openMerge(el: Sheet) {
  await click(el, 'customers-list-merge');
}

describe('the sheet offers «Merge with…» only to who may merge (customers#86)', () => {
  it('shows the action on the open sheet', async () => {
    const el = await openSheet();
    expect($(el, 'customers-list-merge')).toBeTruthy();
  });

  it('hides it without customers.merge_customer (cashier / employee)', async () => {
    perms = new Set(['customers.view_customer', 'customers.change_customer', 'customers.delete_customer']);
    const el = await openSheet();
    expect($(el, 'customers-list-merge'), 'a role without the key would only meet a refusal').toBeNull();
  });
});

describe('picking the duplicate', () => {
  it('lists the other customers of the business, never the open sheet itself', async () => {
    const el = await openSheet();
    await openMerge(el);
    expect(queries.some((q) => q.name === 'customers.list'), 'the candidates come from customers.list').toBe(true);
    expect($(el, 'customers-list-merge-candidate-c2')).toBeTruthy();
    expect($(el, 'customers-list-merge-candidate-c3')).toBeTruthy();
    expect($(el, 'customers-list-merge-candidate-c1'), 'a sheet cannot be merged into itself').toBeNull();
  });

  it('searches by what the operator types', async () => {
    const el = await openSheet();
    await openMerge(el);
    const input = $(el, 'customers-list-merge-search') as HTMLElement & { value: string };
    expect(input, 'no search box').toBeTruthy();
    input.value = 'ana';
    input.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'ana' } }));
    await new Promise((r) => setTimeout(r, 400));
    await settle(el);
    const last = queries.filter((q) => q.name === 'customers.list').at(-1);
    expect(last?.params.search).toBe('ana');
  });

  it('finds an E.164 phone typed with spaces (customers#121)', async () => {
    const el = await openSheet();
    await openMerge(el);
    const input = $(el, 'customers-list-merge-search') as HTMLElement & { value: string };
    input.value = '600 111 222';
    input.dispatchEvent(new CustomEvent('ionInput', { detail: { value: '600 111 222' } }));
    await new Promise((r) => setTimeout(r, 400));
    await settle(el);
    const last = queries.filter((q) => q.name === 'customers.list').at(-1);
    expect(last?.params.search, 'the card holds +34600111222: only the digits are a piece of it').toBe('600111222');
    expect(input.value, 'the box keeps what was typed').toBe('600 111 222');
  });

  it('says so when there is no other customer to merge', async () => {
    candidates = async () => ({ rows: [ANA], total: 1 });
    const el = await openSheet();
    await openMerge(el);
    expect($(el, 'customers-list-merge-empty'), 'the only row is the open sheet: nothing to pick').toBeTruthy();
  });

  it('says so when the search fails, and retries', async () => {
    candidates = async () => { throw new Error('network down'); };
    const el = await openSheet();
    await openMerge(el);
    expect($(el, 'customers-list-merge-error'), 'a failed search must not read as «no duplicates»').toBeTruthy();
    expect($(el, 'customers-list-merge-empty')).toBeNull();
    candidates = async () => ({ rows: [ANA, ANA_WHATSAPP], total: 2 });
    await click(el, 'customers-list-merge-retry');
    expect($(el, 'customers-list-merge-error')).toBeNull();
    expect($(el, 'customers-list-merge-candidate-c2')).toBeTruthy();
  });

  it('shows the loading state while the search is in flight', async () => {
    let release: (v: unknown) => void = () => {};
    candidates = () => new Promise((r) => { release = r; });
    const el = await openSheet();
    await openMerge(el);
    expect($(el, 'customers-list-merge-searching')).toBeTruthy();
    release({ rows: [ANA, ANA_WHATSAPP], total: 2 });
    await settle(el);
    expect($(el, 'customers-list-merge-searching')).toBeNull();
  });
});

describe('confirming the merge', () => {
  async function pickWhatsappDuplicate(): Promise<Sheet> {
    const el = await openSheet();
    await openMerge(el);
    await click(el, 'customers-list-merge-candidate-c2');
    return el;
  }

  it('nothing is merged by picking: a confirmation names both sheets first', async () => {
    const el = await pickWhatsappDuplicate();
    expect(commands.filter((c) => c.name === 'customers.merge'), 'picking is not confirming').toEqual([]);
    const confirm = $(el, 'customers-list-merge-confirm');
    expect(confirm, 'no confirmation step').toBeTruthy();
    expect(confirm!.textContent).toContain('ana garcia');
    expect(confirm!.textContent).toContain('Ana García');
    expect($(el, 'customers-list-merge-submit')).toBeTruthy();
  });

  it('the open sheet survives and the picked one is absorbed', async () => {
    const el = await pickWhatsappDuplicate();
    await click(el, 'customers-list-merge-submit');
    expect(commands.filter((c) => c.name === 'customers.merge')).toEqual([
      { name: 'customers.merge', params: { surviving_id: 'c1', absorbed_id: 'c2' } },
    ]);
  });

  it('after merging: announces it, closes the panel and reloads the surviving sheet', async () => {
    const el = await pickWhatsappDuplicate();
    const getsBefore = queries.filter((q) => q.name === 'customers.get').length;
    await click(el, 'customers-list-merge-submit');
    expect(el.formError).toBe('');
    expect(el.formMsg).toContain('ui.customerMerged');
    expect(el.formMsg).toContain('ana garcia');
    expect($(el, 'customers-list-merge-confirm'), 'the panel stays open after a merge that went through').toBeNull();
    const gets = queries.filter((q) => q.name === 'customers.get');
    expect(gets.length, 'the survivor gained fields and history: the sheet must be re-read').toBeGreaterThan(getsBefore);
    expect(gets.at(-1)?.params).toEqual({ customer_id: 'c1' });
  });

  it('a refusal is read in the operator language and nothing is announced', async () => {
    merge = async () => {
      throw Object.assign(new Error('Those customers cannot be merged: both must exist in this business, be different and not deleted.'), {
        code: 'customers.customer_unavailable',
      });
    };
    const el = await pickWhatsappDuplicate();
    await click(el, 'customers-list-merge-submit');
    expect(el.formError).toBe('Ese cliente no está disponible en este negocio.');
    expect(el.formMsg).toBe('');
    expect($(el, 'customers-list-merge-confirm'), 'the operator can still cancel or pick another').toBeTruthy();
  });

  it('cancel leaves both sheets as they were', async () => {
    const el = await pickWhatsappDuplicate();
    await click(el, 'customers-list-merge-cancel');
    expect($(el, 'customers-list-merge-confirm')).toBeNull();
    expect(commands.filter((c) => c.name === 'customers.merge')).toEqual([]);
  });
});

describe('the candidate list follows the LAST search, not the last answer (rv-88)', () => {
  it('drops a stale answer that lands after a newer search', async () => {
    // The first search (empty term) is slow; the operator types «ana» and that answer lands
    // first. When the slow one finally arrives it must NOT paint over the newer, narrower list.
    const pending: Array<(v: unknown) => void> = [];
    candidates = () => new Promise((r) => { pending.push(r); });
    const el = await openSheet();
    await openMerge(el);
    const input = $(el, 'customers-list-merge-search') as HTMLElement & { value: string };
    input.value = 'ana';
    input.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'ana' } }));
    await new Promise((r) => setTimeout(r, 400));
    await settle(el);
    expect(pending.length, 'two searches in flight: the initial one and «ana»').toBe(2);
    pending[1]({ rows: [ANA, ANA_WHATSAPP], total: 2 });
    await settle(el);
    expect($(el, 'customers-list-merge-candidate-c2')).toBeTruthy();
    pending[0]({ rows: [ANA, ANA_WHATSAPP, LUIS], total: 3 });
    await settle(el);
    expect($(el, 'customers-list-merge-candidate-c3'), 'the stale (broader) answer painted over the newer search').toBeNull();
    expect($(el, 'customers-list-merge-candidate-c2')).toBeTruthy();
  });
});

describe('a merge done elsewhere reaches this screen (rv-88)', () => {
  it('reloads the list and the KPIs when customer.merged is published', async () => {
    const handlers: Record<string, () => void> = {};
    const el = await openSheet();
    (globalThis as Record<string, unknown> & { erplora: { on: unknown } }).erplora.on = (name: string, fn: () => void) => {
      handlers[name] = fn;
      return () => {};
    };
    // Re-attach so the subscriptions are taken with the recording `on`.
    el.remove();
    document.body.appendChild(el);
    await settle(el);
    expect(typeof handlers['customer.merged'], 'the screen must listen to customer.merged').toBe('function');
    const statsBefore = queries.filter((q) => q.name === 'customers.stats').length;
    handlers['customer.merged']();
    await settle(el);
    expect(queries.filter((q) => q.name === 'customers.stats').length, 'the KPIs were not re-read').toBeGreaterThan(statsBefore);
  });
});

describe('every sentence of the merge exists in English and in Spanish (ADR-0055)', () => {
  const src = readFileSync(join(import.meta.dirname, 'erp-customers-list.ts'), 'utf8');
  const en = JSON.parse(readFileSync(join(import.meta.dirname, '../../../locales/en.json'), 'utf8')).ui;
  const es = JSON.parse(readFileSync(join(import.meta.dirname, '../../../locales/es.json'), 'utf8')).ui;
  const keys = [...new Set([...src.matchAll(/'ui\.(merge[A-Za-z]*|customerMerged|errMerge[A-Za-z]*)'/g)].map((m) => m[1]))];

  it('the screen uses its own merge keys', () => {
    expect(keys).toEqual(expect.arrayContaining(['customerMerged', 'errMerge']));
  });

  it.each(['en', 'es'])('%s carries every merge key', (lang) => {
    const dict = lang === 'en' ? en : es;
    expect(keys.filter((k) => typeof dict[k] !== 'string' || !dict[k].trim())).toEqual([]);
  });

  it('the Spanish is a translation, not a copy of the English', () => {
    expect(keys.filter((k) => en[k] === es[k])).toEqual([]);
  });
});

describe('the sheet header fits a phone (customers#86)', () => {
  // «Merge with…» is the fifth action on the sheet header. On a 390 px phone the row did not wrap:
  // the customer name was cut and «Erase personal data» fell off the screen (seen on the bench,
  // hub:stable, 2026-09-26). The actions must wrap under the name instead.
  const src = readFileSync(join(import.meta.dirname, 'erp-customers-list.ts'), 'utf8');

  it('the header row wraps its actions', () => {
    const rule = src.match(/\n\s*header \{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toMatch(/flex-wrap:\s*wrap/);
  });
});
