// customers#107 — a second tag (or custom field) with a name that is already taken is refused ON THE
// NAME FIELD, the way groups do since customers#94 (group-name-taken.test.ts).
//
// The database refuses it (indexes `uq_customers_tag_hub_name_live` / `uq_customers_field_hub_name_live`,
// mapped by `on_unique` to `customers.tag_name_taken` / `customers.field_name_taken`); this file pins
// what the person sees: the module's own sentence, in the active language, under the «Name» field that
// has to change — not the server's raw detail and not a banner at the foot of the form. Anything else
// refused on save keeps the pm#478 banner, now in the declared sentence too.
//
// Asserted against the CATALOGUE entry, never against prose: rewording the sentence must not turn
// this red, and a screen that painted the server's raw detail instead must.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../locales/en.json' with { type: 'json' };
import es from '../../locales/es.json' with { type: 'json' };

interface Screen {
  noun: string;
  tag: string;
  load: () => Promise<unknown>;
  testid: string;
  code: string;
  unavailable: string;
  row: Record<string, unknown>;
}

const SCREENS: Screen[] = [
  {
    noun: 'tag',
    tag: 'erp-customers-tags',
    load: () => import('../components/erp-customers-tags/erp-customers-tags'),
    testid: 'customers-tags',
    code: 'customers.tag_name_taken',
    unavailable: 'customers.tag_unavailable',
    row: { id: 't1', name: 'Moroso', color: 'danger', is_active: 1 },
  },
  {
    noun: 'field',
    tag: 'erp-customers-fields',
    load: () => import('../components/erp-customers-fields/erp-customers-fields'),
    testid: 'customers-fields',
    code: 'customers.field_name_taken',
    unavailable: 'customers.field_unavailable',
    row: { id: 'f1', name: 'Alergias', field_type: 'text', options: '[]', is_required: 0, sort_order: 0, is_active: 1 },
  },
];

const sentence = (catalog: { errors?: Record<string, string> }, code: string): string => catalog.errors?.[code] ?? '';

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

type Wc = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> } & Record<string, any>;

async function settle(el: Wc): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
  }
}

/** Ionic paints `error-text` only when the host carries BOTH classes (Ionic 8 input docs). */
const flagged = (field: HTMLElement): boolean =>
  field.classList.contains('ion-invalid') && field.classList.contains('ion-touched');

const submitEvent = (): Event => new Event('submit', { cancelable: true });

describe.each(SCREENS)('customers#107 · a taken $noun name is refused on the Name field', (s) => {
  const RAW = `duplicate key value violates unique constraint "uq_customers_${s.noun}_hub_name_live"`;

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
      queryPage: async () => ({ rows: [s.row], total: 1 }),
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

  async function mount(): Promise<Wc> {
    await s.load();
    const el = document.createElement(s.tag) as Wc;
    document.body.appendChild(el);
    await settle(el);
    return el;
  }

  const nameField = (el: Wc): HTMLElement =>
    el.shadowRoot.querySelector(`form[slot="create"] [data-testid="${s.testid}-name"]`) as HTMLElement;
  const banner = (el: Wc): HTMLElement | null => el.shadowRoot.querySelector(`[data-testid="${s.testid}-form-error"]`);

  async function refuseCreate(el: Wc, name = String(s.row.name)): Promise<void> {
    el.fName = name;
    refusal = new DomainError(s.code, RAW);
    await el.save(submitEvent());
    await settle(el);
  }

  it('the sentence is declared in both languages and they differ', () => {
    expect(sentence(en, s.code)).not.toBe('');
    expect(sentence(es, s.code)).not.toBe('');
    expect(sentence(es, s.code)).not.toBe(sentence(en, s.code));
  });

  it('a refused «Add» flags the Name field with the Spanish sentence, not a banner', async () => {
    const el = await mount();
    await refuseCreate(el);
    const field = nameField(el);
    expect(field.getAttribute('error-text')).toBe(sentence(es, s.code));
    expect(flagged(field), 'without ion-invalid + ion-touched Ionic does not paint the error text').toBe(true);
    expect(banner(el), 'the reason is said once, on the field').toBeNull();
    expect(revealed, 'on a phone sheet the field is brought into view').toContain(field);
  });

  it('with the UI in English the field says the English sentence', async () => {
    locale = 'en';
    const el = await mount();
    await refuseCreate(el);
    expect(nameField(el).getAttribute('error-text')).toBe(sentence(en, s.code));
  });

  it('renaming onto a taken name flags the field too', async () => {
    const el = await mount();
    await el.startEdit(s.row);
    await refuseCreate(el, 'Otro');
    expect(nameField(el).getAttribute('error-text')).toBe(sentence(es, s.code));
    expect(flagged(nameField(el))).toBe(true);
  });

  it('typing a new name clears the flag', async () => {
    const el = await mount();
    await refuseCreate(el);
    const field = nameField(el);
    (field as HTMLElement & { value?: string }).value = 'Otro';
    field.dispatchEvent(new CustomEvent('ionInput'));
    await settle(el);
    expect(flagged(nameField(el))).toBe(false);
    expect(nameField(el).hasAttribute('error-text')).toBe(false);
  });

  it('a save that goes through clears the flag', async () => {
    const el = await mount();
    await refuseCreate(el);
    refusal = null;
    el.fName = 'Otro';
    await el.save(submitEvent());
    await settle(el);
    expect(flagged(nameField(el))).toBe(false);
  });

  it('being refused for ANOTHER reason moves it to the banner, in the declared sentence, and unflags the field', async () => {
    const el = await mount();
    await refuseCreate(el);
    refusal = new DomainError(s.unavailable, 'gone');
    await el.save(submitEvent());
    await settle(el);
    expect(flagged(nameField(el)), 'a stale «name taken» would sit next to the real reason').toBe(false);
    expect(banner(el)?.textContent?.trim()).toBe(sentence(es, s.unavailable));
  });

  it('cancelling an edit clears the flag', async () => {
    const el = await mount();
    await el.startEdit(s.row);
    await refuseCreate(el, 'Otro');
    expect(flagged(nameField(el))).toBe(true);
    (el.shadowRoot.querySelector(`[data-testid="${s.testid}-cancel"]`) as HTMLElement).click();
    await settle(el);
    expect(flagged(nameField(el))).toBe(false);
  });

  it('opening a row for editing clears the flag', async () => {
    const el = await mount();
    await refuseCreate(el);
    await el.startEdit(s.row);
    await settle(el);
    expect(flagged(nameField(el))).toBe(false);
  });
});
