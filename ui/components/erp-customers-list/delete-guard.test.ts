// A refused delete has to READ like a refusal, in the operator's language (customers#49).
//
// `customers.delete` now carries an `expect_rows` guard: when the id matches no row of this hub the
// runtime rolls the transaction back and answers `customers.customer_unavailable` — instead of the
// old `ok: true` that also published `customer.deleted` for a customer that was still alive.
//
// That rejection reaches this screen. Printing `e.message` would put the manifest's English
// sentence on a Spanish counter, so the sheet translates it the same way every other business
// rejection is translated here: through `errors.<code>` in the module catalogue (hub#139).
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
    query: async (name: string) => (name === 'customers.stats' ? [{ total: 1, active: 1, vip: 0, total_revenue: 0 }] : []),
    queryPage: async () => ({ rows: [CLIENTE], total: 1 }),
    queryAll: async () => [],
    command: async () => ({}),
    hasPermission: () => true,
    on: () => () => {},
    locale: 'es',
    // The real `t()` SPLITS the key on `.` and walks the catalogue, so under the FLAT contract
    // (ADR-0398) nothing under `errors.` resolves through it any more: it hands back the raw key.
    // This mock says exactly that. Answering one hard-coded `errors.…` key — which is what it used
    // to do — kept this test green against a catalogue no shell could actually read, and that is
    // how the nested shape survived unnoticed. The sentence below must now come from the module's
    // own locales, through `ui/lib/domain-error-text`.
    t: (_catalog: unknown, key: string, params?: Record<string, unknown>) =>
      `${key}${params?.name ? `:${params.name}` : ''}`,
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

describe('un borrado que no borra nada se cuenta traducido (customers#49)', () => {
  it('el código customers.customer_unavailable se pinta por su clave del catálogo, no en inglés', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.command = async () => {
      throw Object.assign(
        new Error('That customer is not available: it does not exist in this business.'),
        { code: 'customers.customer_unavailable' },
      );
    };
    const el = await montar();
    const wc = el as unknown as {
      pendingDelete: unknown;
      confirmDelete(): Promise<void>;
      formError: string;
      formMsg: string;
    };
    wc.pendingDelete = CLIENTE;
    await wc.confirmDelete();

    expect(wc.formError).toBe('Ese cliente no está disponible en este negocio.');
    expect(wc.formError, 'the manifest sentence must not leak untranslated').not.toContain('is not available: it does not exist');
    expect(wc.formMsg, 'nothing was deleted, so nothing may be announced as deleted').toBe('');
  });

  it('el camino feliz sigue confirmando el borrado', async () => {
    const el = await montar();
    const wc = el as unknown as {
      pendingDelete: unknown;
      confirmDelete(): Promise<void>;
      formError: string;
      formMsg: string;
    };
    wc.pendingDelete = CLIENTE;
    await wc.confirmDelete();

    expect(wc.formError).toBe('');
    expect(wc.formMsg).toContain('ui.customerDeleted');
    expect(wc.pendingDelete).toBeNull();
  });
});
