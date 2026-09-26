// pm#459: tapping two customers in a row must leave the sheet on the LAST one tapped.
//
// The sheet is filled after network waits (`customers.get`, then its custom-field values, groups,
// consent…). When the first customer's answers arrived after the second's, the sheet showed the
// FIRST customer — or the second customer with the first one's custom-field values — and «Edit»
// then saved them onto the wrong record. Each opening now takes a number and drops its result after
// every wait if a newer opening (or «Close») came in meanwhile: the last tap wins.
import { beforeEach, describe, expect, it } from 'vitest';

const ANA = { id: 'c1', name: 'Ana García', is_active: 1 };
const LUIS = { id: 'c3', name: 'Luis Pérez', is_active: 1 };

type Deferred = { resolve: (v: unknown) => void; reject: (e: unknown) => void };
let held: Record<string, Deferred>;
let holdGet: boolean;
let holdLoadsOf: string | null;
const LOADS = ['customers.fields.values', 'customers.activities', 'customers.consent.state', 'customers.consent.history', 'customers.group_ids', 'customers.tag_ids'];

beforeEach(() => {
  held = {};
  holdGet = true;
  holdLoadsOf = null;
  const hold = (key: string) => new Promise((resolve, reject) => { held[key] = { resolve, reject }; });
  (globalThis as Record<string, unknown>).erplora = {
    query: (name: string, params: Record<string, unknown> = {}) => {
      const id = String(params.customer_id ?? '');
      if (name === 'customers.get') return holdGet ? hold(`get:${id}`) : Promise.resolve([id === ANA.id ? ANA : LUIS]);
      // Everything the sheet loads per customer answers with rows stamped with that customer.
      const stamped: Record<string, unknown[]> = {
        'customers.fields.values': [{ id: 'f1', name: 'Allergy', field_type: 'text', value: `value of ${id}` }],
        'customers.activities': [{ id: `a-${id}`, activity_type: 'note', description: `note of ${id}` }],
        'customers.consent.state': [{ channel: 'email', status: `state of ${id}` }],
        'customers.consent.history': [{ id: `h-${id}` }],
        'customers.group_ids': [{ id: `g-${id}` }],
        'customers.tag_ids': [{ id: `t-${id}` }],
      };
      if (name in stamped) {
        return id === holdLoadsOf ? hold(`${name}:${id}`).then(() => stamped[name]) : Promise.resolve(stamped[name]);
      }
      if (name === 'customers.stats') return Promise.resolve([{ total: 2, active: 2, vip: 0, total_revenue: 0 }]);
      return Promise.resolve([]);
    },
    queryPage: async () => ({ rows: [ANA, LUIS], total: 2 }),
    queryAll: async () => [],
    command: async () => ({}),
    hasPermission: () => true,
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
  };
});

type Sheet = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  detail: { id: string; name: string } | null;
  fieldValues: Array<{ value: string }>;
  activities: Array<{ id: string }>;
  consentState: Array<{ status: string }>;
  consentHistory: Array<{ id: string }>;
  groupIds: string[];
  tagIds: string[];
  formError: string;
};

const settle = async (el: Sheet) => {
  for (let i = 0; i < 4; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
  }
};

async function mount(): Promise<Sheet> {
  await import('./erp-customers-list');
  const el = document.createElement('erp-customers-list') as Sheet;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

const view = (el: Sheet, row: { id: string }) =>
  el.shadowRoot.querySelector('ok-data-table')!.dispatchEvent(
    new CustomEvent('rowClick', { detail: { row } }),
  );

describe('two customers tapped in a row: the last one wins (pm#459)', () => {
  it("the first customer's answer arriving LAST does not take the sheet back", async () => {
    const el = await mount();
    view(el, ANA);
    view(el, LUIS);
    held['get:c3'].resolve([LUIS]);
    await settle(el);
    held['get:c1'].resolve([ANA]);
    await settle(el);
    expect(el.detail?.id, 'the sheet shows the customer tapped FIRST').toBe('c3');
    expect(el.fieldValues.map((f) => f.value)).toEqual(['value of c3']);
  });

  it("the first customer's custom fields, notes, consent and groups arriving LAST do not land on the next sheet", async () => {
    holdGet = false;
    holdLoadsOf = 'c1';
    const el = await mount();
    view(el, ANA);
    await settle(el);
    // The sheet replaces the table: the way to the next customer is «Close», then tap it.
    (el as unknown as { closeDetail(): void }).closeDetail();
    await settle(el);
    view(el, LUIS);
    await settle(el);
    expect(el.detail?.id).toBe('c3');
    for (const name of LOADS) held[`${name}:c1`].resolve(undefined);
    await settle(el);
    expect({
      fieldValues: el.fieldValues.map((f) => f.value),
      activities: el.activities.map((a) => a.id),
      consentState: el.consentState.map((c) => c.status),
      consentHistory: el.consentHistory.map((c) => c.id),
      groupIds: el.groupIds,
      tagIds: el.tagIds,
    }, '«Save» would write Ana\'s values onto Luis').toEqual({
      fieldValues: ['value of c3'],
      activities: ['a-c3'],
      consentState: ['state of c3'],
      consentHistory: ['h-c3'],
      groupIds: ['g-c3'],
      tagIds: ['t-c3'],
    });
  });

  it("the first customer's loads FAILING late do not wipe the next sheet", async () => {
    holdGet = false;
    holdLoadsOf = 'c1';
    const el = await mount();
    view(el, ANA);
    await settle(el);
    (el as unknown as { closeDetail(): void }).closeDetail();
    await settle(el);
    view(el, LUIS);
    await settle(el);
    for (const name of LOADS) held[`${name}:c1`].reject(new Error('network'));
    await settle(el);
    expect({
      fieldValues: el.fieldValues.map((f) => f.value),
      activities: el.activities.map((a) => a.id),
      consentState: el.consentState.map((c) => c.status),
      consentHistory: el.consentHistory.map((c) => c.id),
    }, '«Save» would blank Luis\'s custom fields').toEqual({
      fieldValues: ['value of c3'],
      activities: ['a-c3'],
      consentState: ['state of c3'],
      consentHistory: ['h-c3'],
    });
  });

  it("the first customer's lookup FAILING late puts no error on the next sheet", async () => {
    const el = await mount();
    view(el, ANA);
    view(el, LUIS);
    held['get:c3'].resolve([LUIS]);
    await settle(el);
    held['get:c1'].reject(new Error('network'));
    await settle(el);
    expect(el.detail?.id).toBe('c3');
    expect(el.formError).toBe('');
  });

  it('«Close» while the sheet is still loading keeps it closed', async () => {
    const el = await mount();
    view(el, ANA);
    (el as unknown as { closeDetail(): void }).closeDetail();
    held['get:c1'].resolve([ANA]);
    await settle(el);
    expect(el.detail, 'the closed sheet reopened by itself').toBeNull();
  });
});
