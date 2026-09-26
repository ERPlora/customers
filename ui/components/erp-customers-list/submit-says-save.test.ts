// customers#96: the toolbar «+ Add» OPENS the create panel, and the button that SENDS the form inside
// it was also called «Add». A screen reader heard two «Add» buttons and a test could not tell them
// apart. The submit is «Save», as in every other create form of ERPlora (fields, groups, tags,
// pricing#50, staff#74) and in Odoo, Shopify or Square; «Add» stays for the toolbar button only,
// which ok-data-table labels itself.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

type Wc = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };

beforeEach(() => {
  document.body.innerHTML = '';
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryPage: async () => ({ rows: [], total: 0 }),
    queryAll: async () => [],
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
    hasPermission: () => true,
    t: (_catalog: unknown, key: string) => key,
  };
});

async function mount(): Promise<Wc> {
  await import('./erp-customers-list');
  const el = document.createElement('erp-customers-list') as Wc;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const locale = (lang: 'en' | 'es') =>
  JSON.parse(readFileSync(join(__dirname, '..', '..', '..', 'locales', `${lang}.json`), 'utf8')) as {
    ui: Record<string, string>;
  };

describe('customers#96: the create panel submits with «Save», not a second «Add»', () => {
  it('the submit button of the create panel reads the «Save» key', async () => {
    const el = await mount();
    const submit = el.shadowRoot.querySelector('form[slot="create"] ion-button[type="submit"]');
    expect(submit, 'the create panel has no submit button').toBeTruthy();
    expect(submit?.textContent?.trim()).toBe('ui.save');
  });

  it('«Save» is translated: en «Save», es «Guardar»', () => {
    expect(locale('en').ui.save).toBe('Save');
    expect(locale('es').ui.save).toBe('Guardar');
  });

  it('the orphaned «Add customer» key is gone: nothing in the module is labelled with it any more', () => {
    expect(locale('en').ui.addCustomer).toBeUndefined();
    expect(locale('es').ui.addCustomer).toBeUndefined();
  });
});
