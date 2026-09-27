// pm#478 (out of staff#72) — on a phone, a refused save in Customers showed NOTHING: the person
// pressed «Add» or «Save» and the screen stayed as it was.
//
// The refusal did arrive and was translated; it was painted in the wrong place. Every form of this
// module lives in the `create` panel of its `ok-data-table`, and under 834 px that panel is a
// FULL-SCREEN sheet (`position: fixed; inset: 0; z-index: 1000`, outfitkit#75). The error banner was
// a child of the PAGE, so on a phone it sat under the sheet, out of sight. On a desktop the panel
// sits beside the table and the banner happened to be visible, which is why only mobile saw it.
//
// The rule this file fixes, for the four screens (customers, custom fields, groups, tags) — the same
// one Personal follows since staff#72:
//
//   · what goes wrong while SAVING the panel's form is painted INSIDE that form, next to the button
//     that was pressed, and scrolled into view — it travels with the panel whatever the width;
//   · what goes wrong in a ROW action (delete, confirmed on the page) stays on the PAGE: no panel is
//     open then, and a message inside a closed panel is just as invisible.
//
// It is what Square, Shopify and Odoo do in their side/sheet forms: the error of a submit lives in
// the form that was submitted.
import { beforeEach, describe, expect, it, vi } from 'vitest';

class DomainError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const CUSTOMER = {
  id: 'c1', name: 'Ada Lovelace', email: 'ada@example.com', phone: '600000000', tax_id: '',
  address: '', city: '', postal_code: '', country: '', notes: '', is_active: 1,
  lifecycle_stage: 'lead', source: 'walk_in', company_name: '', birthday: null, anniversary: null,
  preferred_channel: 'none', marketing_consent: 0, consent_date: null, total_purchases: 0,
  total_spent: 0, last_purchase_date: null,
};
const FIELD = { id: 'f1', name: 'Allergies', field_type: 'text', options: '[]', is_required: 0, sort_order: 0, is_active: 1 };
const GROUP = { id: 'g1', name: 'VIP', description: '', color: 'primary', sort_order: 0, is_active: 1 };
const TAG = { id: 't1', name: 'Regular', color: 'primary', is_active: 1 };

let refusal: Error | null = null;
/** Every element the component scrolled into view AFTER it had painted itself, in order. Scrolling a
 *  banner that has not rendered yet measures a 0-px box: the sheet stops with the banner still half
 *  under the tab bar (seen in the staff#72 bench at 390 px). */
let revealed: Element[] = [];

beforeEach(() => {
  refusal = null;
  revealed = [];
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) {
    if ((this as HTMLElement & { hasUpdated?: boolean }).hasUpdated !== false) revealed.push(this);
  });
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => (name === 'customers.stats' ? [{ total: 1, active: 1, vip: 0, total_revenue: 0 }] : []),
    queryAll: async () => [],
    queryPage: async () => ({ rows: [CUSTOMER], total: 1 }),
    command: async () => {
      if (refusal) throw refusal;
      return {};
    },
    on: () => () => {},
    locale: 'es',
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
    // The real client always exposes it; the list controller needs it for its money filters.
    currencyDecimals: 2,
    hasPermission: () => true,
    t: (_c: unknown, key: string) => key,
  };
});

type Wc = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> } & Record<string, any>;

async function mount(tag: string, path: string): Promise<Wc> {
  await import(path);
  const el = document.createElement(tag) as Wc;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

async function settle(el: Wc): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
  }
}

const submitEvent = (): Event => new Event('submit', { cancelable: true });

/** The error banner INSIDE the panel's form, or null. */
const inForm = (el: Wc, testid: string): Element | null =>
  el.shadowRoot.querySelector(`form[slot="create"] [data-testid="${testid}"]`);

/** The banner inside the form AND scrolled into view: pressing the button at the foot of a long
 *  form, the banner that appears above it is pushed half off a phone screen otherwise. */
const inFormAndRevealed = (el: Wc, testid: string): Element | null => {
  const banner = inForm(el, testid);
  return banner && revealed.includes(banner) ? banner : null;
};

/** The error banner on the PAGE (outside the panel), or null. */
const onPage = (el: Wc, testid: string): Element | null => {
  const banner = el.shadowRoot.querySelector(`[data-testid="${testid}"]`);
  return banner && !banner.closest('form[slot="create"]') ? banner : null;
};

describe('pm#478 · customers: a refused «Add customer» is shown INSIDE the panel form', () => {
  it('the refusal lands in the create form, translated, and is scrolled into view', async () => {
    const el = await mount('erp-customers-list', '../components/erp-customers-list/erp-customers-list');
    el.newForm = { ...el.newForm, name: 'Ada Lovelace', tax_id: 'B12345678' };
    refusal = new DomainError('customers.tax_id_taken', 'tax id taken');
    await el.create(submitEvent());
    await settle(el);
    const banner = inForm(el, 'customers-list-create-error');
    expect(banner, 'on a phone the panel covers the page: the refusal has to travel with the form').not.toBeNull();
    expect(inFormAndRevealed(el, 'customers-list-create-error'), 'and it is scrolled into view').not.toBeNull();
    expect(banner?.textContent?.trim()).toBe('tax id taken');
    expect(onPage(el, 'customers-list-form-error'), 'the page banner under the sheet stays empty').toBeNull();
  });

  it('a refused delete (confirmed on the page, no panel open) stays on the page, not in the form', async () => {
    const el = await mount('erp-customers-list', '../components/erp-customers-list/erp-customers-list');
    el.pendingDelete = CUSTOMER;
    refusal = new DomainError('customers.customer_unavailable', 'unavailable');
    await el.confirmDelete();
    await settle(el);
    expect(onPage(el, 'customers-list-form-error')).not.toBeNull();
    expect(inForm(el, 'customers-list-create-error')).toBeNull();
  });

  it('the page error of a refused delete goes away once a later save succeeds', async () => {
    const el = await mount('erp-customers-list', '../components/erp-customers-list/erp-customers-list');
    el.pendingDelete = CUSTOMER;
    refusal = new DomainError('customers.customer_unavailable', 'unavailable');
    await el.confirmDelete();
    refusal = null;
    el.newForm = { ...el.newForm, name: 'Grace Hopper' };
    await el.create(submitEvent());
    await settle(el);
    expect(onPage(el, 'customers-list-form-error'), 'a stale refusal must not stay red after a save that worked').toBeNull();
  });

  it('a new attempt clears the previous refusal of the form', async () => {
    const el = await mount('erp-customers-list', '../components/erp-customers-list/erp-customers-list');
    el.newForm = { ...el.newForm, name: 'Ada Lovelace' };
    refusal = new DomainError('customers.tax_id_taken', 'tax id taken');
    await el.create(submitEvent());
    refusal = null;
    el.newForm = { ...el.newForm, name: 'Ada Lovelace' };
    await el.create(submitEvent());
    await settle(el);
    expect(inForm(el, 'customers-list-create-error')).toBeNull();
  });
});

const SCREENS = [
  { surface: 'customers-fields', tag: 'erp-customers-fields', path: '../components/erp-customers-fields/erp-customers-fields', row: FIELD },
  { surface: 'customers-groups', tag: 'erp-customers-groups', path: '../components/erp-customers-groups/erp-customers-groups', row: GROUP },
  { surface: 'customers-tags', tag: 'erp-customers-tags', path: '../components/erp-customers-tags/erp-customers-tags', row: TAG },
] as const;

describe.each(SCREENS)('pm#478 · $surface: save refusal in the form, delete refusal on the page', ({ surface, tag, path, row }) => {
  it('a refused «Save» of a new row lands in the form and is scrolled into view', async () => {
    const el = await mount(tag, path);
    el.fName = 'Duplicated';
    refusal = new DomainError('customers.name_taken', 'name taken');
    await el.save(submitEvent());
    await settle(el);
    const banner = inForm(el, `${surface}-form-error`);
    expect(banner, 'on a phone the panel covers the page: the refusal has to travel with the form').not.toBeNull();
    expect(inFormAndRevealed(el, `${surface}-form-error`), 'and it is scrolled into view').not.toBeNull();
    expect(banner?.textContent?.trim()).toBe('name taken');
    expect(onPage(el, `${surface}-page-error`)).toBeNull();
  });

  it('a refused «Save» of an edited row lands in the form too', async () => {
    const el = await mount(tag, path);
    await el.startEdit(row);
    refusal = new DomainError('customers.name_taken', 'name taken');
    await el.save(submitEvent());
    await settle(el);
    expect(inFormAndRevealed(el, `${surface}-form-error`)).not.toBeNull();
  });

  it('a refused delete (confirmed on the page, no panel open) is shown on the page', async () => {
    const el = await mount(tag, path);
    el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'delete', row } }));
    refusal = new DomainError('customers.in_use', 'in use');
    await el.confirmDelete();
    await settle(el);
    expect(onPage(el, `${surface}-page-error`), 'no panel is open: inside the form it would be invisible').not.toBeNull();
    expect(inForm(el, `${surface}-form-error`)).toBeNull();
  });

  it('the page error of a refused delete goes away once a later save succeeds', async () => {
    const el = await mount(tag, path);
    el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'delete', row } }));
    refusal = new DomainError('customers.in_use', 'in use');
    await el.confirmDelete();
    refusal = null;
    el.fName = 'New name';
    await el.save(submitEvent());
    await settle(el);
    expect(onPage(el, `${surface}-page-error`), 'a stale refusal must not stay red after a save that worked').toBeNull();
  });

  it('retrying the refused delete from the same confirmation clears the refusal once it succeeds', async () => {
    const el = await mount(tag, path);
    el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'delete', row } }));
    refusal = new DomainError('customers.in_use', 'in use');
    await el.confirmDelete();
    refusal = null;
    await el.confirmDelete(); // the confirmation is still open after a refusal: «Delete» again
    await settle(el);
    expect(onPage(el, `${surface}-page-error`), 'the red of the first try must not sit next to the success').toBeNull();
  });

  it('asking to delete a row again hides the previous refusal until the new answer arrives', async () => {
    const el = await mount(tag, path);
    el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'delete', row } }));
    refusal = new DomainError('customers.in_use', 'in use');
    await el.confirmDelete();
    el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'delete', row } }));
    await settle(el);
    expect(onPage(el, `${surface}-page-error`)).toBeNull();
  });

  it('opening the panel after a refused delete does not carry that page error into the form', async () => {
    const el = await mount(tag, path);
    el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'delete', row } }));
    refusal = new DomainError('customers.in_use', 'in use');
    await el.confirmDelete();
    await el.startEdit(row);
    await settle(el);
    expect(inForm(el, `${surface}-form-error`)).toBeNull();
  });
});
