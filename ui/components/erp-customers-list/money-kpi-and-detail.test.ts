// The revenue KPI in the header and «Spent» in the customer detail are painted in the hub's
// currency (customers#104).
//
// The money-display guard (ui/lib/money-display-guard.test.ts) pins that `fmt()` keeps calling
// `erplora().formatMoney(`, but not its call sites: painting `String(s.total_revenue)` in the KPI or
// `${d.total_spent}` in the detail is not hand formatting, so the guard stays green and the owner
// would read «3150» instead of «31,50 €». This file mounts the real screen with known amounts in
// minor units and asserts the text the person sees.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const CUSTOMER = {
  id: 'c1', name: 'Ada Lovelace', email: 'ada@example.com', phone: '600000000', tax_id: '',
  address: '', city: '', postal_code: '', country: '', notes: '', is_active: 1,
  lifecycle_stage: 'lead', source: 'walk_in', company_name: '', birthday: null, anniversary: null,
  preferred_channel: 'none', marketing_consent: 0, consent_date: null, total_purchases: 7,
  total_spent: 12550, last_purchase_date: null,
};

type Screen = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  openDetail(id: string): Promise<void>;
};

beforeEach(() => {
  document.body.innerHTML = '';
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'customers.stats') return [{ total: 1, active: 1, vip: 0, total_revenue: 3150 }];
      if (name === 'customers.get') return [CUSTOMER];
      return [];
    },
    queryPage: async () => ({ rows: [CUSTOMER], total: 1 }),
    queryAll: async () => [],
    command: async () => ({}),
    hasPermission: () => true,
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
    currency: 'EUR',
    // The list declares moneyFilters: the SDK refuses to build it without the currency's decimals.
    currencyDecimals: 2,
    // The same double every test of this screen uses: minor units → «31.50 €».
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
  };
});

async function mount(): Promise<Screen> {
  await import('./erp-customers-list');
  const el = document.createElement('erp-customers-list') as Screen;
  document.body.appendChild(el);
  // connectedCallback is async: the KPI row only exists once customers.stats has answered.
  await vi.waitFor(() => {
    if (!el.shadowRoot?.querySelector('.kpis')) throw new Error('stats not painted yet');
  });
  await el.updateComplete;
  return el;
}

describe('money in the header KPI and the customer detail goes through formatMoney (customers#104)', () => {
  it('the revenue KPI shows total_revenue in the hub currency, not the raw minor units', async () => {
    const el = await mount();
    const kpi = el.shadowRoot.querySelector('[data-testid="customers-list-kpi-revenue"]');
    expect(kpi, 'the revenue KPI is on screen').toBeTruthy();
    expect(kpi!.getAttribute('value')).toBe('31.50 €');
  });

  it('«Spent» in the customer detail shows total_spent in the hub currency', async () => {
    const el = await mount();
    await el.openDetail(CUSTOMER.id);
    await el.updateComplete;
    const rows = [...el.shadowRoot.querySelectorAll('dl.meta > div')];
    const spent = rows.find((r) => r.querySelector('dt')?.textContent?.trim() === 'ui.colSpent');
    expect(spent, 'the detail has a «Spent» row').toBeTruthy();
    expect(spent!.querySelector('dd')?.textContent?.trim()).toBe('125.50 €');
  });
});
