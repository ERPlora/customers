// customers#95 — the trash can of a row asked its question in a panel painted on the page: a
// `<section>` with an `<h3>` and two buttons, no role, no focus move. A screen reader pressing the
// trash heard nothing, and a role-based test (`getByRole('alertdialog')`) found nothing to answer.
//
// Every back office of the sector (Square, Shopify, Odoo, Lightspeed) asks in a modal dialog. The
// four screens of this module (customers — from the row AND from the sheet —, custom fields,
// groups, tags) now ask through `presentConfirmAlert`: a GLOBAL `<ion-alert>` on `document.body`,
// which Ionic paints as `role="alertdialog"` named by its header. The QA hooks of the old panel
// (`*-delete-submit` / `*-delete-cancel`) travel to the dialog's buttons, so no spec breaks.
//
// The refusal of a confirmed delete keeps living on the PAGE (pm#478, form-error-in-panel.test.ts):
// the dialog has closed by then, and a message under its backdrop would be just as invisible.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import es from '../../locales/es.json';

type AlertButton = { text: string; role?: string; htmlAttributes?: Record<string, string>; handler?: () => unknown };
type AlertEl = HTMLElement & { header: string; message: string; buttons: AlertButton[]; isOpen?: boolean };
type Wc = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> } & Record<string, any>;

const CUSTOMER = {
  id: 'c1', name: 'Marta Ribas', email: 'marta@example.com', phone: '600000000', tax_id: '',
  address: '', city: '', postal_code: '', country: '', notes: '', is_active: 1,
  lifecycle_stage: 'lead', source: 'walk_in', company_name: '', birthday: null, anniversary: null,
  preferred_channel: 'none', marketing_consent: 0, consent_date: null, total_purchases: 0,
  total_spent: 0, last_purchase_date: null,
};
const FIELD = { id: 'f1', name: 'Alergias', field_type: 'text', options: '[]', is_required: 0, sort_order: 0, is_active: 1 };
const GROUP = { id: 'g1', name: 'VIP', description: '', color: 'primary', sort_order: 0, discount_percent: 0, is_active: 1 };
const TAG = { id: 't1', name: 'Moroso', color: 'primary', sort_order: 0, is_active: 1 };

let refusal: Error | null = null;
let commands: Array<{ name: string; payload: Record<string, unknown> }> = [];

/** The real `es` catalogue, interpolated: the dialog is checked in the words the person reads. */
function tEs(_c: unknown, key: string, p?: Record<string, unknown>): string {
  let cur: unknown = es;
  for (const part of key.split('.')) cur = cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[part] : undefined;
  const text = typeof cur === 'string' ? cur : key;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (p && k in p ? String(p[k]) : m));
}

beforeEach(() => {
  refusal = null;
  commands = [];
  document.body.querySelectorAll('ion-alert').forEach((a) => a.remove());
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => (name === 'customers.stats' ? [{ total: 1, active: 1, vip: 0, total_revenue: 0 }] : []),
    queryAll: async () => [],
    queryPage: async () => ({ rows: [CUSTOMER], total: 1 }),
    command: async (name: string, payload: Record<string, unknown>) => {
      commands.push({ name, payload });
      if (refusal) throw refusal;
      return {};
    },
    on: () => () => {},
    locale: 'es',
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
    currencyDecimals: 2,
    hasPermission: () => true,
    t: tEs,
  };
});

async function settle(el: Wc): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
  }
}

async function mount(tag: string, path: string): Promise<Wc> {
  await import(path);
  const el = document.createElement(tag) as Wc;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

const dialog = (surface: string): AlertEl | null =>
  document.body.querySelector(`ion-alert[data-testid="${surface}-delete-confirm"]`) as AlertEl | null;

/** Presses a button of the open dialog the way Ionic does: its handler, then the dismissal. */
async function press(el: Wc, surface: string, role: 'cancel' | 'destructive'): Promise<void> {
  const alert = dialog(surface);
  expect(alert, 'the delete confirmation is open').toBeTruthy();
  const btn = alert?.buttons.find((b) => b.role === role);
  expect(btn, `the «${role}» button of the confirmation`).toBeTruthy();
  await btn?.handler?.();
  alert?.dispatchEvent(new CustomEvent('ionAlertDidDismiss', { detail: { role } }));
  await settle(el);
}

const SCREENS = [
  {
    surface: 'customers-list', tag: 'erp-customers-list', path: '../components/erp-customers-list/erp-customers-list',
    row: CUSTOMER, command: 'customers.delete', payload: { customer_id: 'c1' },
    title: es.ui.deleteCustomerTitle, message: es.ui.deleteCustomerConfirm.replace('{name}', 'Marta Ribas'), pageError: 'customers-list-form-error',
  },
  {
    surface: 'customers-fields', tag: 'erp-customers-fields', path: '../components/erp-customers-fields/erp-customers-fields',
    row: FIELD, command: 'customers.fields.delete', payload: { field_id: 'f1' },
    title: es.ui.deleteFieldTitle, message: es.ui.deleteFieldConfirm.replace('{name}', 'Alergias'), pageError: 'customers-fields-page-error',
  },
  {
    surface: 'customers-groups', tag: 'erp-customers-groups', path: '../components/erp-customers-groups/erp-customers-groups',
    row: GROUP, command: 'customers.groups.delete', payload: { group_id: 'g1' },
    title: es.ui.deleteGroupTitle, message: es.ui.deleteGroupConfirm.replace('{name}', 'VIP'), pageError: 'customers-groups-page-error',
  },
  {
    surface: 'customers-tags', tag: 'erp-customers-tags', path: '../components/erp-customers-tags/erp-customers-tags',
    row: TAG, command: 'customers.tags.delete', payload: { tag_id: 't1' },
    title: es.ui.deleteTagTitle, message: es.ui.deleteTagConfirm.replace('{name}', 'Moroso'), pageError: 'customers-tags-page-error',
  },
] as const;

describe.each(SCREENS)('customers#95 · $surface: the trash can asks in a dialog', (s) => {
  const trash = (el: Wc) => el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'delete', row: s.row } }));

  it('opens a global alert dialog — not a panel on the page — in Spanish, with its QA hooks', async () => {
    const el = await mount(s.tag, s.path);
    trash(el);
    await settle(el);
    expect(commands.filter((c) => c.name === s.command), 'nothing is deleted on the first tap').toEqual([]);
    expect(el.shadowRoot.querySelector(`[data-testid="${s.surface}-delete-submit"]`), 'no inline panel on the page').toBeNull();
    expect(el.shadowRoot.querySelector('ion-alert'), 'no inline alert inside the shadow root (hub#2162)').toBeNull();
    const alert = dialog(s.surface);
    expect(alert, 'a GLOBAL ion-alert — Ionic paints it role="alertdialog"').toBeTruthy();
    expect(alert?.parentElement).toBe(document.body);
    expect(alert?.isOpen, 'it is actually shown').toBe(true);
    expect(alert?.header, 'the dialog is named by its title').toBe(s.title);
    expect(alert?.message, 'it names the row it is about to delete').toBe(s.message);
    expect(alert?.buttons.map((b) => [b.role, b.text, b.htmlAttributes?.['data-testid']])).toEqual([
      ['cancel', es.ui.cancel, `${s.surface}-delete-cancel`],
      ['destructive', es.ui.delete, `${s.surface}-delete-submit`],
    ]);
  });

  it('«Delete» deletes THAT row and the dialog goes away', async () => {
    const el = await mount(s.tag, s.path);
    trash(el);
    await settle(el);
    await press(el, s.surface, 'destructive');
    expect(commands.filter((c) => c.name === s.command).map((c) => c.payload)).toEqual([s.payload]);
    expect(dialog(s.surface)).toBeNull();
    expect(el.pendingDelete).toBeNull();
  });

  it('«Cancel» deletes nothing and the dialog goes away', async () => {
    const el = await mount(s.tag, s.path);
    trash(el);
    await settle(el);
    await press(el, s.surface, 'cancel');
    expect(commands.filter((c) => c.name === s.command)).toEqual([]);
    expect(dialog(s.surface)).toBeNull();
    expect(el.pendingDelete).toBeNull();
  });

  it('Esc / tapping outside deletes nothing, and the trash can opens it again afterwards', async () => {
    const el = await mount(s.tag, s.path);
    trash(el);
    await settle(el);
    dialog(s.surface)?.dispatchEvent(new CustomEvent('ionAlertDidDismiss', { detail: { role: 'backdrop' } }));
    await settle(el);
    expect(commands.filter((c) => c.name === s.command)).toEqual([]);
    expect(dialog(s.surface)).toBeNull();
    trash(el);
    await settle(el);
    expect(dialog(s.surface), 'the same row can be asked about again').toBeTruthy();
  });

  it('a refused delete closes the dialog and explains itself on the page; asking again works', async () => {
    const el = await mount(s.tag, s.path);
    trash(el);
    await settle(el);
    refusal = Object.assign(new Error('refused'), { code: 'customers.in_use' });
    await press(el, s.surface, 'destructive');
    expect(dialog(s.surface), 'the answer was given: the dialog is closed').toBeNull();
    expect(el.shadowRoot.querySelector(`[data-testid="${s.pageError}"]`), 'the refusal is on the page').not.toBeNull();
    refusal = null;
    trash(el);
    await settle(el);
    await press(el, s.surface, 'destructive');
    expect(commands.filter((c) => c.name === s.command)).toHaveLength(2);
    expect(el.shadowRoot.querySelector(`[data-testid="${s.pageError}"]`), 'the red of the first try is gone').toBeNull();
  });

  it('«Delete» answers the question by itself: it does not wait for Ionic to report the dialog gone', async () => {
    const el = await mount(s.tag, s.path);
    trash(el);
    await settle(el);
    await dialog(s.surface)?.buttons.find((b) => b.role === 'destructive')?.handler?.();
    await settle(el);
    expect(el.pendingDelete, 'the question was answered').toBeNull();
    expect(dialog(s.surface), 'and its dialog is closed').toBeNull();
    expect(commands.filter((c) => c.name === s.command)).toEqual([{ name: s.command, payload: s.payload }]);
  });

  it('leaving the screen with the question open takes the dialog with it', async () => {
    const el = await mount(s.tag, s.path);
    trash(el);
    await settle(el);
    expect(dialog(s.surface)).toBeTruthy();
    el.remove();
    await new Promise((r) => setTimeout(r, 0));
    expect(dialog(s.surface), 'no orphan dialog over the next screen').toBeNull();
  });
});

describe('customers#95 · the customer sheet asks in the same dialog', () => {
  it('without the delete permission no question is asked, whoever set it', async () => {
    const el = await mount('erp-customers-list', '../components/erp-customers-list/erp-customers-list');
    (globalThis as Record<string, any>).erplora.hasPermission = (p: string) => p !== 'customers.delete_customer';
    el.detail = CUSTOMER;
    el.pendingDelete = CUSTOMER;
    await settle(el);
    expect(dialog('customers-list')).toBeNull();
  });

  it('«Delete» on the sheet opens the dialog; confirming deletes it and closes the sheet', async () => {
    const el = await mount('erp-customers-list', '../components/erp-customers-list/erp-customers-list');
    el.detail = CUSTOMER;
    await settle(el);
    (el.shadowRoot.querySelector('[data-testid="customers-list-delete"]') as HTMLElement).click();
    await settle(el);
    expect(el.shadowRoot.querySelector('[data-testid="customers-list-delete-submit"]'), 'no inline panel in the sheet').toBeNull();
    expect(dialog('customers-list')?.message).toBe(es.ui.deleteCustomerConfirm.replace('{name}', 'Marta Ribas'));
    await press(el, 'customers-list', 'destructive');
    expect(commands.filter((c) => c.name === 'customers.delete').map((c) => c.payload)).toEqual([{ customer_id: 'c1' }]);
    expect(el.detail, 'the deleted sheet closes').toBeNull();
  });

  it('a refused delete retried from the sheet leaves no red next to the success', async () => {
    const el = await mount('erp-customers-list', '../components/erp-customers-list/erp-customers-list');
    el.detail = CUSTOMER;
    await settle(el);
    const ask = () => (el.shadowRoot.querySelector('[data-testid="customers-list-delete"]') as HTMLElement).click();
    ask();
    await settle(el);
    refusal = Object.assign(new Error('refused'), { code: 'customers.in_use' });
    await press(el, 'customers-list', 'destructive');
    expect(el.shadowRoot.querySelector('[data-testid="customers-list-form-error"]'), 'the refusal is on the sheet').not.toBeNull();
    refusal = null;
    ask(); // the sheet's «Delete» does not clear the refusal: the confirmed delete has to
    await settle(el);
    await press(el, 'customers-list', 'destructive');
    expect(commands.filter((c) => c.name === 'customers.delete')).toHaveLength(2);
    expect(el.shadowRoot.querySelector('[data-testid="customers-list-form-error"]'), 'the red of the first try is gone').toBeNull();
  });

  it('closing the sheet with the question open closes the dialog too', async () => {
    const el = await mount('erp-customers-list', '../components/erp-customers-list/erp-customers-list');
    el.detail = CUSTOMER;
    await settle(el);
    (el.shadowRoot.querySelector('[data-testid="customers-list-delete"]') as HTMLElement).click();
    await settle(el);
    expect(dialog('customers-list')).toBeTruthy();
    (el.shadowRoot.querySelector('[data-testid="customers-list-back"]') as HTMLElement).click();
    await settle(el);
    expect(dialog('customers-list'), 'a question about a sheet that is no longer on screen').toBeNull();
    expect(commands.filter((c) => c.name === 'customers.delete')).toEqual([]);
  });
});
