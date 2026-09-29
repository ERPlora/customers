// customers#94 — a second group with a name that is already taken is refused ON THE NAME FIELD.
//
// The database refuses it (index `uq_customers_group_hub_name_live`, mapped by `on_unique` to
// `customers.group_name_taken`); this file pins what the person sees: the module's own sentence, in
// the active language, under the «Name» field that has to change — the way Shopify, Square and Odoo
// flag a duplicate name — and not a generic banner at the foot of the form. Anything else refused on
// save keeps the pm#478 banner (form-error-in-panel.test.ts).
//
// Asserted against the CATALOGUE entry, never against prose: rewording the sentence must not turn
// this red, and a screen that painted the server's raw detail instead must.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../locales/en.json' with { type: 'json' };
import es from '../../locales/es.json' with { type: 'json' };

const CODE = 'customers.group_name_taken';
const GROUP = { id: 'g1', name: 'VIP', description: '', color: 'primary', sort_order: 0, is_active: 1 };
const sentence = (catalog: { errors?: Record<string, string> }): string => catalog.errors?.[CODE] ?? '';

class DomainError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

let refusal: Error | null = null;
let revealed: Element[] = [];
let locale = 'es';

beforeEach(() => {
  refusal = null;
  revealed = [];
  locale = 'es';
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) {
    revealed.push(this);
  });
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryAll: async () => [],
    queryPage: async () => ({ rows: [GROUP], total: 1 }),
    command: async () => {
      if (refusal) throw refusal;
      return {};
    },
    on: () => () => {},
    get locale() {
      return locale;
    },
    currency: 'EUR',
    currencyDecimals: 2,
    hasPermission: () => true,
    t: (_c: unknown, key: string) => key,
  };
});

type Wc = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> } & Record<string, any>;

async function mount(): Promise<Wc> {
  await import('../components/erp-customers-groups/erp-customers-groups');
  const el = document.createElement('erp-customers-groups') as Wc;
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
const nameField = (el: Wc): HTMLElement =>
  el.shadowRoot.querySelector('form[slot="create"] [data-testid="customers-groups-name"]') as HTMLElement;
const banner = (el: Wc): Element | null => el.shadowRoot.querySelector('[data-testid="customers-groups-form-error"]');
/** Ionic paints `error-text` only when the host carries BOTH classes (Ionic 8 input docs). */
const flagged = (field: HTMLElement): boolean =>
  field.classList.contains('ion-invalid') && field.classList.contains('ion-touched');

async function refuseCreate(el: Wc, name = 'VIP'): Promise<void> {
  el.fName = name;
  refusal = new DomainError(CODE, 'duplicate key value violates unique constraint "uq_customers_group_hub_name_live"');
  await el.save(submitEvent());
  await settle(el);
}

describe('customers#94 · a taken group name is refused on the Name field', () => {
  it('the sentence is declared in both languages and they differ', () => {
    expect(sentence(en)).not.toBe('');
    expect(sentence(es)).not.toBe('');
    expect(sentence(es)).not.toBe(sentence(en));
  });

  it('a refused «Add group» flags the Name field with the Spanish sentence, not a banner', async () => {
    const el = await mount();
    await refuseCreate(el);
    const field = nameField(el);
    expect(field.getAttribute('error-text')).toBe(sentence(es));
    expect(flagged(field), 'without ion-invalid + ion-touched Ionic does not paint the error text').toBe(true);
    expect(banner(el), 'the reason is said once, on the field').toBeNull();
    expect(revealed, 'on a phone sheet the field is brought into view').toContain(field);
  });

  it('with the UI in English the field says the English sentence', async () => {
    locale = 'en';
    const el = await mount();
    await refuseCreate(el);
    expect(nameField(el).getAttribute('error-text')).toBe(sentence(en));
  });

  it('renaming a group onto a taken name flags the field too', async () => {
    const el = await mount();
    await el.startEdit(GROUP);
    el.fName = 'Mayorista';
    refusal = new DomainError(CODE, 'taken');
    await el.save(submitEvent());
    await settle(el);
    expect(nameField(el).getAttribute('error-text')).toBe(sentence(es));
    expect(flagged(nameField(el))).toBe(true);
  });

  it('typing a new name clears the flag', async () => {
    const el = await mount();
    await refuseCreate(el);
    const field = nameField(el);
    (field as HTMLElement & { value?: string }).value = 'VIP 2';
    field.dispatchEvent(new CustomEvent('ionInput'));
    await settle(el);
    expect(flagged(nameField(el))).toBe(false);
    expect(nameField(el).hasAttribute('error-text')).toBe(false);
  });

  it('a save that goes through clears the flag', async () => {
    const el = await mount();
    await refuseCreate(el);
    refusal = null;
    el.fName = 'VIP 2';
    await el.save(submitEvent());
    await settle(el);
    expect(flagged(nameField(el))).toBe(false);
  });

  it('saving again and being refused for ANOTHER reason moves the reason to the banner and unflags the field', async () => {
    const el = await mount();
    await refuseCreate(el);
    refusal = new DomainError('customers.group_unavailable', 'gone');
    await el.save(submitEvent());
    await settle(el);
    expect(flagged(nameField(el)), 'a stale «name taken» would sit next to the real reason').toBe(false);
    expect(banner(el)).not.toBeNull();
  });

  it('cancelling an edit clears the flag', async () => {
    const el = await mount();
    await el.startEdit(GROUP);
    await refuseCreate(el, 'Mayorista');
    expect(flagged(nameField(el))).toBe(true);
    (el.shadowRoot.querySelector('[data-testid="customers-groups-cancel"]') as HTMLElement).click();
    await settle(el);
    expect(flagged(nameField(el))).toBe(false);
  });

  it('opening another group for editing clears the flag', async () => {
    const el = await mount();
    await refuseCreate(el);
    await el.startEdit(GROUP);
    await settle(el);
    expect(flagged(nameField(el))).toBe(false);
  });

  it('any OTHER refusal keeps the banner in the form and leaves the field alone', async () => {
    const el = await mount();
    el.fName = 'VIP';
    refusal = new DomainError('customers.group_unavailable', 'gone');
    await el.save(submitEvent());
    await settle(el);
    expect(banner(el)).not.toBeNull();
    expect(flagged(nameField(el))).toBe(false);
  });
});
