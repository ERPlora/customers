// The edit form has to be VISIBLE as a form (customers#48).
//
// QA opened Ver → Editar and found the labels floating on the page background with no input box
// around them: nothing to tell the user what was editable or where to click. Ionic 8 implements
// `fill` for `md` only (`const hasOutlineFill = mode === 'md' && this.fill === 'outline';`), and
// the Hub pins Ionic to `ios` globally (ADR-0143, hub#760), so every `fill="outline"` in a module
// was a silent no-op — no error, no warning, just a form that looks like static text.
//
// `tests/ionic_fill_needs_md.test.py` guards the SOURCE of the whole module (and runs in the gate).
// This one goes through the render: it mounts the component, opens the sheet in edit mode and looks
// at what the controls actually carry, so the guard cannot be satisfied by a `mode="md"` that never
// reaches the DOM.
import { beforeEach, describe, expect, it } from 'vitest';

const CLIENTE = {
  id: 'c1', name: 'Ada Lovelace', email: 'ada@example.com', phone: '600000000', tax_id: '',
  address: '', city: '', postal_code: '', country: '', notes: '', is_active: 1,
  lifecycle_stage: 'lead', source: 'walk_in', company_name: '', birthday: null, anniversary: null,
  preferred_channel: 'none', marketing_consent: 0, consent_date: null, total_purchases: 0,
  total_spent: 0, last_purchase_date: null,
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'customers.stats') return [{ total: 1, active: 1, vip: 0, total_revenue: 0 }];
      if (name === 'customers.get') return [CLIENTE];
      if (name === 'customers.fields.values') {
        return [{ id: 'f1', name: 'Tinte habitual', field_type: 'text', options: '', is_required: 0, sort_order: 1, value: '6.34' }];
      }
      return [];
    },
    queryPage: async () => ({ rows: [CLIENTE], total: 1 }),
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

async function montar() {
  await import('./erp-customers-list');
  const el = document.createElement('erp-customers-list');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

const CONTROLS = 'ion-input, ion-select, ion-textarea';

/** Every control that asks for a box, and whether it will actually get one. */
function filled(root: ParentNode): Element[] {
  return [...root.querySelectorAll(CONTROLS)].filter((n) => n.hasAttribute('fill'));
}

function withoutMd(root: ParentNode): string[] {
  return filled(root)
    .filter((n) => n.getAttribute('mode') !== 'md')
    .map((n) => `${n.tagName.toLowerCase()}[label=${n.getAttribute('label') ?? '?'}]`);
}

describe('un control con `fill` pinta su caja: mode="md" (customers#48)', () => {
  it('el formulario de EDICIÓN de la ficha no deja ni un campo sin caja', async () => {
    const el = await montar();
    await (el as unknown as { openDetail(id: string): Promise<void> }).openDetail(CLIENTE.id);
    (el as unknown as { startEdit(): void }).startEdit();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    const form = el.shadowRoot.querySelector('form');
    expect(form, 'el formulario de edición no se ha pintado').toBeTruthy();
    expect(filled(form!).length, 'el formulario de edición ha dejado de declarar `fill`').toBeGreaterThan(10);
    expect(
      withoutMd(form!),
      'en modo `ios` (ADR-0143) estos controles se pintan SIN caja: el usuario no ve dónde escribir',
    ).toEqual([]);
  });

  it('el panel de alta tampoco', async () => {
    const el = await montar();
    const form = el.shadowRoot.querySelector('form[slot="create"]');
    expect(form, 'el panel de alta no se ha pintado').toBeTruthy();
    expect(filled(form!).length).toBeGreaterThan(0);
    expect(withoutMd(form!)).toEqual([]);
  });

  it('ni un solo control de la pantalla se queda con un `fill` que no pinta', async () => {
    const el = await montar();
    await (el as unknown as { openDetail(id: string): Promise<void> }).openDetail(CLIENTE.id);
    (el as unknown as { startEdit(): void }).startEdit();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    expect(withoutMd(el.shadowRoot)).toEqual([]);
  });
});
