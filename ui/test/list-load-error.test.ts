// A list that could not load must not read «No customers» + «0 records» (hub#2328, pm#530).
//
// The shell's `<ok-data-table>` (OutfitKit ≥ 0.1.113) paints a failed load itself: «could not
// load», the reason and a Retry button. Every list screen of this module hands it the controller's
// `error` and reloads on its `retry` event — and drops its own red banner, which would say the
// same thing twice. But a module paints with the SHELL's OutfitKit (ADR-0451): on a hub whose
// table has no `error` property the banner is the only place the reason is shown, so it stays.
//
// The shell's table is stood in for by a bare element registered BEFORE the screens load (as the
// shell does at boot; the screens' own `define()` then loses, like in the hub). Its `error`
// property is added or removed per test, which is exactly what `dataTableShowsLoadError()` reads.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

class ShellTable extends HTMLElement {}
const errors = new WeakMap<HTMLElement, unknown>();

function shellTableKnowsErrors(yes: boolean) {
  if (yes) {
    Object.defineProperty(ShellTable.prototype, 'error', {
      configurable: true,
      get(this: HTMLElement) { return errors.get(this) ?? ''; },
      set(this: HTMLElement, v: unknown) { errors.set(this, v); },
    });
  } else {
    delete (ShellTable.prototype as { error?: unknown }).error;
  }
}

const SCREENS = [
  { tag: 'erp-customers-list', load: () => import('../components/erp-customers-list/erp-customers-list'), table: 'customers-list-table', banner: 'customers-list-load-error' },
  { tag: 'erp-customers-groups', load: () => import('../components/erp-customers-groups/erp-customers-groups'), table: 'customers-groups-table', banner: 'customers-groups-load-error' },
  { tag: 'erp-customers-tags', load: () => import('../components/erp-customers-tags/erp-customers-tags'), table: 'customers-tags-table', banner: 'customers-tags-load-error' },
  { tag: 'erp-customers-fields', load: () => import('../components/erp-customers-fields/erp-customers-fields'), table: 'customers-fields-table', banner: 'customers-fields-load-error' },
] as const;

let hubAnswers = false;
let pageCalls = 0;
let queryCalls: string[] = [];

beforeAll(async () => {
  customElements.define('ok-data-table', ShellTable);
  for (const s of SCREENS) await s.load();
});

beforeEach(() => {
  document.body.innerHTML = '';
  hubAnswers = false;
  pageCalls = 0;
  queryCalls = [];
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      queryCalls.push(name);
      if (!hubAnswers) throw new Error('The hub is not responding.');
      return name === 'customers.stats' ? [{ total: 1, active: 1, vip: 0, total_revenue: 0 }] : [];
    },
    queryPage: async () => {
      pageCalls++;
      if (!hubAnswers) throw new Error('The hub is not responding.');
      return { rows: [{ id: 'r1', name: 'Ada' }], total: 1 };
    },
    queryAll: async () => [],
    command: async () => ({}),
    hasPermission: () => true,
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
    currency: 'EUR',
    currencyDecimals: 2,
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
  };
});

type Screen = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };

async function mountFailed(tag: string, tableId: string): Promise<{ el: Screen; table: HTMLElement }> {
  const el = document.createElement(tag) as Screen;
  document.body.appendChild(el);
  await vi.waitFor(() => {
    if (pageCalls === 0) throw new Error('the list has not asked for its page yet');
  });
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  const table = el.shadowRoot.querySelector<HTMLElement>(`ok-data-table[testid="${tableId}"]`);
  expect(table, `${tag} paints its table`).toBeTruthy();
  return { el, table: table! };
}

describe.each(SCREENS)('$tag — a list that could not load (hub#2328)', (s) => {
  it('hands the reason to the shell table and paints no second banner', async () => {
    shellTableKnowsErrors(true);
    const { el, table } = await mountFailed(s.tag, s.table);
    expect((table as unknown as { error: string }).error).toBe('The hub is not responding.');
    expect(el.shadowRoot.querySelector(`[data-testid="${s.banner}"]`), 'the reason would be said twice').toBeNull();
  });

  it('Retry on the table asks the hub again and paints the rows that now arrive', async () => {
    shellTableKnowsErrors(true);
    const { el, table } = await mountFailed(s.tag, s.table);
    const before = pageCalls;
    hubAnswers = true;
    table.dispatchEvent(new CustomEvent('retry', { detail: {} }));
    await vi.waitFor(() => {
      if (pageCalls === before) throw new Error('Retry did not ask the hub again');
    });
    await vi.waitFor(async () => {
      await el.updateComplete;
      if ((table as unknown as { error: string }).error !== '') throw new Error('the error is still on the table');
    });
    expect((table as unknown as { rows: unknown[] }).rows).toEqual([{ id: 'r1', name: 'Ada' }]);
  });

  it('on a shell whose table cannot paint the error, keeps its own banner with the reason', async () => {
    shellTableKnowsErrors(false);
    const { el } = await mountFailed(s.tag, s.table);
    const banner = el.shadowRoot.querySelector(`[data-testid="${s.banner}"]`);
    expect(banner, 'an older hub would show the failure nowhere').toBeTruthy();
    expect(banner!.textContent).toContain('The hub is not responding.');
  });
});

describe('erp-customers-list — Retry brings back everything the failure left out (hub#2328)', () => {
  it('Retry also asks for the header figures again, as every other refresh of this screen does', async () => {
    shellTableKnowsErrors(true);
    const { el, table } = await mountFailed('erp-customers-list', 'customers-list-table');
    expect(el.shadowRoot.querySelector('.kpis'), 'the figures failed with the list').toBeNull();
    hubAnswers = true;
    table.dispatchEvent(new CustomEvent('retry', { detail: {} }));
    await vi.waitFor(async () => {
      await el.updateComplete;
      if (!el.shadowRoot.querySelector('.kpis')) throw new Error('the header figures did not come back');
    });
    expect(queryCalls.filter((n) => n === 'customers.stats').length).toBeGreaterThanOrEqual(2);
  });
});
