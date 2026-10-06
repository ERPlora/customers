// The Customers table finds a card by its phone however the phone is typed (customers#126).
//
// Cards keep their phone in E.164 (`+34600111222`, customers#121) and the list search is a plain
// «contains» on the hub, so «600 111 222» — the way people say a number — found nobody while
// «600111222» did. The till's and the merge panel's search boxes already send a phone-only term as
// its digits (`ui/lib/phone-search.ts`); the table's search box and its «Phone» filter now send the
// same thing. Judged on what the hub RECEIVES (`queryPage`), and the box keeps what was typed.
import { beforeEach, describe, expect, it } from 'vitest';
import '../components/erp-customers-list/erp-customers-list';

/** The `search` and `filters` of every page the screen asked the hub for, in call order. */
const asked: Array<{ search?: string; filters: Record<string, unknown> }> = [];

beforeEach(() => {
  document.body.replaceChildren();
  asked.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => (name === 'customers.stats' ? [{ total: 0, active: 0, vip: 0, total_revenue: 0 }] : []),
    queryAll: async () => [],
    queryPage: async (name: string, params: { search?: string; filters?: Record<string, unknown> }) => {
      if (name === 'customers.list') asked.push({ search: params.search, filters: structuredClone(params.filters ?? {}) });
      return { rows: [], total: 0, limit: 50, offset: 0 };
    },
    command: async () => ({}),
    hasPermission: () => true,
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
    currency: 'EUR',
    formatMoney: (minor: number) => `MONEY(${minor})`,
    currencyDecimals: 2,
  };
});

type Mounted = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };

async function settle(el: Mounted): Promise<void> {
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
}

async function mount(): Promise<Mounted> {
  const el = document.createElement('erp-customers-list') as Mounted;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

/** Fires what `ok-data-table` emits when the search box changes. */
async function search(el: Mounted, typed: string): Promise<string | undefined> {
  el.shadowRoot.querySelector('ok-data-table')!.dispatchEvent(new CustomEvent('searchChange', { detail: typed }));
  await settle(el);
  return asked[asked.length - 1].search;
}

/** Fires what `ok-data-table` emits when a column filter is typed. */
async function filter(el: Mounted, col: string, value: unknown): Promise<Record<string, unknown>> {
  el.shadowRoot.querySelector('ok-data-table')!.dispatchEvent(new CustomEvent('filterChange', { detail: { col, value } }));
  await settle(el);
  return asked[asked.length - 1].filters;
}

describe('the Customers table search finds a phone however it is typed (customers#126)', () => {
  it('«600 111 222» asks for its digits, which are a piece of the stored +34600111222', async () => {
    const el = await mount();
    expect(await search(el, '600 111 222')).toBe('600111222');
  });

  it('dashes, dots, brackets and an international prefix are read the same way', async () => {
    const el = await mount();
    expect(await search(el, '600-111-222')).toBe('600111222');
    expect(await search(el, '0034 600 111 222')).toBe('34600111222');
    expect(await search(el, '+34 600.111.222')).toBe('34600111222');
    expect(await search(el, '+44 (0)7700 900123')).toBe('447700900123');
    expect(await search(el, '07700 900123')).toBe('7700900123');
  });

  it('a name, an email or a tax id with letters travels as typed', async () => {
    const el = await mount();
    expect(await search(el, 'García')).toBe('García');
    expect(await search(el, 'ana@example.com')).toBe('ana@example.com');
    expect(await search(el, 'B-12345678')).toBe('B-12345678');
  });

  it('clearing the box clears the search instead of searching for something else', async () => {
    const el = await mount();
    await search(el, '600 111 222');
    expect(await search(el, '')).toBeFalsy();
  });

  it('the «Phone» filter is read the same way; the other columns travel untouched', async () => {
    const el = await mount();
    expect(await filter(el, 'phone', '600 111 222')).toEqual({ phone: '600111222' });
    expect(await filter(el, 'name', '600 111')).toEqual({ phone: '600111222', name: '600 111' });
    expect(await filter(el, 'email', 'ana 600')).toEqual({ phone: '600111222', name: '600 111', email: 'ana 600' });
    expect(await filter(el, 'phone', '')).toEqual({ name: '600 111', email: 'ana 600' });
  });

  it('a cleared «Phone» filter (null) clears it, never a crash', async () => {
    const el = await mount();
    await filter(el, 'phone', '600 111 222');
    expect(await filter(el, 'phone', null)).toEqual({});
  });

  it('typed in the real search box: asks for the digits and the box still shows what was typed', async () => {
    const el = await mount();
    type Table = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };
    const table = el.shadowRoot.querySelector('ok-data-table') as Table;
    await table.updateComplete;
    const box = table.shadowRoot.querySelector('ion-searchbar') as unknown as HTMLInputElement;
    expect(box).toBeTruthy();
    box.value = '600 111 222';
    box.dispatchEvent(new CustomEvent('ionInput', { bubbles: true, composed: true }));
    await settle(el);
    await table.updateComplete;
    expect(asked[asked.length - 1].search).toBe('600111222');
    expect(String(box.value)).toBe('600 111 222');
  });
});
