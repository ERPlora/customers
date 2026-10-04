// customers#95 — the group and tag checkboxes of the customer sheet had NO accessible name: the
// name was written NEXT to the `<ion-checkbox>`, inside a native `<label class="check">`. A native
// label cannot reach the `<input>` Ionic keeps in the checkbox's shadow root, so a screen reader
// announced «checkbox, not checked» four times and `getByRole('checkbox', { name: 'VIP' })` found
// nothing. Ionic's own way is the label as the checkbox's CONTENT (its default slot), which it wires
// to that input. The «Active» box of the edit form had the same defect.
//
// Two checks: the sheet as rendered (each box carries exactly its own name), and a guard of the
// PATTERN over every component of the module, so the next checkbox is born named.
import { beforeEach, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

type Wc = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> } & Record<string, any>;

const CUSTOMER = {
  id: 'c1', name: 'Jordi Puig', email: '', phone: '', tax_id: '', address: '', city: '', postal_code: '',
  country: '', notes: '', is_active: 1, lifecycle_stage: 'lead', source: 'walk_in', company_name: '',
  birthday: null, anniversary: null, preferred_channel: 'none', marketing_consent: 0, consent_date: null,
  total_purchases: 0, total_spent: 0, last_purchase_date: null,
};
const GROUPS = [{ id: 'g1', name: 'VIP' }, { id: 'g2', name: 'Mayoristas' }];
const TAGS = [{ id: 't1', name: 'Moroso' }, { id: 't2', name: 'Fiel' }];

beforeEach(() => {
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'customers.stats') return [{ total: 1, active: 1, vip: 0, total_revenue: 0 }];
      if (name === 'customers.get') return [CUSTOMER];
      if (name === 'customers.groups.list') return GROUPS;
      if (name === 'customers.tags.list') return TAGS;
      return [];
    },
    queryAll: async (name: string) => (name === 'customers.groups.list' ? GROUPS : name === 'customers.tags.list' ? TAGS : []),
    queryPage: async () => ({ rows: [CUSTOMER], total: 1 }),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
    currencyDecimals: 2,
    hasPermission: () => true,
    t: (_c: unknown, key: string) => key,
  };
});

async function settle(el: Wc): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
  }
}

async function sheet(): Promise<Wc> {
  await import('../components/erp-customers-list/erp-customers-list');
  const el = document.createElement('erp-customers-list') as Wc;
  document.body.appendChild(el);
  await settle(el);
  // The sheet as it opens: the customer, and the groups/tags of the hub to tick.
  el.detail = CUSTOMER;
  el.groups = GROUPS;
  el.tags = TAGS;
  await settle(el);
  return el;
}

/** The name Ionic gives the checkbox's input: the text slotted INTO the checkbox, or its aria-label. */
const ownName = (box: Element): string =>
  (box.getAttribute('aria-label') ?? box.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('customers#95 · every checkbox of the sheet is named after what it ticks', () => {
  it.each([
    ['groups', GROUPS],
    ['tags', TAGS],
  ] as const)('the %s boxes carry their own name, inside the checkbox', async (kind, items) => {
    const el = await sheet();
    for (const it of items) {
      const box = el.shadowRoot.querySelector(`[data-testid="customers-list-membership-${kind}-item-${it.id}"]`);
      expect(box, `the box of ${it.name}`).toBeTruthy();
      expect(ownName(box!), `${it.name}: a screen reader reads THIS`).toBe(it.name);
    }
  });

  it('the label sits after the box, as before (Ionic would put it first by default)', async () => {
    const el = await sheet();
    const box = el.shadowRoot.querySelector('[data-testid="customers-list-membership-groups-item-g1"]')!;
    expect(box.getAttribute('label-placement')).toBe('end');
    expect(box.getAttribute('justify')).toBe('start');
  });

  it('the «Active» box of the edit form is named too', async () => {
    const el = await sheet();
    el.startEdit();
    await settle(el);
    const box = el.shadowRoot.querySelector('[data-testid="customers-list-edit-active"]');
    expect(box).toBeTruthy();
    expect(ownName(box!)).toBe('ui.fieldActive');
  });
});

/** Every component source of the module (tests excluded). */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return sources(p);
    return n.endsWith('.ts') && !n.endsWith('.test.ts') ? [p] : [];
  });
}

/**
 * Every `<ion-checkbox>` of a Lit source as `{ open, content, line }`. The opening tag is cut by
 * scanning, not by `[^>]*`: an attribute like `@ionChange=${(e) => …}` holds a `>` of its own.
 */
function checkboxes(src: string): Array<{ open: string; content: string; line: number }> {
  const found: Array<{ open: string; content: string; line: number }> = [];
  for (let at = src.indexOf('<ion-checkbox'); at !== -1; at = src.indexOf('<ion-checkbox', at + 1)) {
    let depth = 0;
    let quote = '';
    let end = -1;
    for (let i = at; i < src.length && end === -1; i++) {
      const ch = src[i];
      if (quote) {
        if (ch === quote) quote = '';
      } else if (ch === '$' && src[i + 1] === '{') {
        depth++;
        i++;
      } else if (ch === '{' && depth > 0) depth++;
      else if (ch === '}' && depth > 0) depth--;
      else if (depth === 0 && (ch === '"' || ch === "'")) quote = ch;
      else if (depth === 0 && ch === '>') end = i;
    }
    if (end === -1) continue;
    const close = src.indexOf('</ion-checkbox>', end);
    found.push({
      open: src.slice(at, end + 1),
      content: close === -1 ? '' : src.slice(end + 1, close),
      line: src.slice(0, at).split('\n').length,
    });
  }
  return found;
}

const named = (cb: { open: string; content: string }): boolean => /\baria-label=/.test(cb.open) || cb.content.trim() !== '';

describe('customers#95 · guard: no checkbox is born without a name', () => {
  const root = join(__dirname, '..', 'components');

  it('no <ion-checkbox> is empty: its label goes INSIDE it (or it carries aria-label)', () => {
    const files = sources(root);
    expect(files.length, 'the guard reads the real components').toBeGreaterThan(3);
    const offenders = files.flatMap((file) =>
      checkboxes(readFileSync(file, 'utf8'))
        .filter((cb) => !named(cb))
        .map((cb) => `${file.slice(root.length + 1)}:${cb.line}`),
    );
    expect(offenders, 'a native <label> next to the box does not reach the input inside its shadow root').toEqual([]);
  });

  it('the guard catches the positive: an empty checkbox beside a native label, arrow handler included', () => {
    const bad = '<label class="check"><ion-checkbox .checked=${x} @ionChange=${(e: any) => (y = e.target.checked)}></ion-checkbox> ${name}</label>';
    const good = '<ion-checkbox .checked=${x} @ionChange=${(e: any) => (y = e.target.checked)}>${name}</ion-checkbox>';
    const labelled = '<ion-checkbox aria-label=${name} .checked=${x}></ion-checkbox>';
    expect(checkboxes(bad).map(named)).toEqual([false]);
    expect(checkboxes(good).map(named)).toEqual([true]);
    expect(checkboxes(labelled).map(named)).toEqual([true]);
  });
});
