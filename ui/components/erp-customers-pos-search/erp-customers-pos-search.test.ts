// Contrato del selector de CLIENTE del TPV (slot `sales.pos.assign`, ADR-0043 B).
//
// El CHROME del buscador lo aporta `ok-spotlight-search` (OutfitKit) — su comportamiento se testea
// en su propio repo. AQUÍ se fija el contrato PROPIO de este WC: carga clientes al abrir, y al elegir
// uno emite `erp:customer-context` con el SNAPSHOT FISCAL (ADR-0132) — sin `customer_tax_id`/
// `customer_address` la factura del TPV saldría sin NIF ni dirección. Se mockea el ok-spotlight-search
// (evita su cadena de iconos y deja los resultados proyectados como hijos consultables).
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@erplora/outfitkit/ok-spotlight-search', () => ({}));

const ANA = { id: 'cus-1', name: 'Ana García', phone: '600111222', email: 'ana@example.com' };
const ANA_FICHA = { ...ANA, tax_id: '12345678Z', address: 'Calle Mayor 1', city: 'Madrid', postal_code: '28013', country: 'ES' };

const consultas: { name: string; params?: Record<string, unknown> }[] = [];

beforeEach(() => {
  consultas.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string, params?: Record<string, unknown>) => {
      consultas.push({ name, params });
      if (name === 'customers.get') return [ANA_FICHA];
      if (name === 'customers.list') return [ANA];
      return [];
    },
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

async function montar() {
  await import('./erp-customers-pos-search');
  const el = document.createElement('erp-customers-pos-search');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

/** Simula que el ok-spotlight-search se abre (emite ok-open{true}) → el WC carga los clientes. */
async function abrir(el: HTMLElement & { shadowRoot: ShadowRoot }) {
  const sp = el.shadowRoot.querySelector('ok-spotlight-search')!;
  sp.dispatchEvent(new CustomEvent('ok-open', { detail: { open: true } }));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
}

describe('erp-customers-pos-search', () => {
  it('delega el chrome en ok-spotlight-search, con trigger de cliente', async () => {
    const el = await montar();
    const sp = el.shadowRoot.querySelector('ok-spotlight-search');
    expect(sp, 'usa el ok-spotlight-search de OutfitKit').toBeTruthy();
    expect(sp!.getAttribute('trigger-icon'), 'trigger de cliente sin asignar').toBe('person-add-outline');
  });

  it('al abrir carga clientes y los proyecta como lista Ionic', async () => {
    const el = await montar();
    await abrir(el);
    expect(consultas.some((c) => c.name === 'customers.list'), 'busca al abrir').toBe(true);
    expect(el.shadowRoot.querySelectorAll('ion-item').length, 'lista Ionic de clientes').toBe(1);
  });

  it('al elegir cliente emite el snapshot FISCAL, no solo el nombre', async () => {
    const el = await montar();
    const emitidos: Record<string, unknown>[] = [];
    el.addEventListener('erp:customer-context', (e) => emitidos.push((e as CustomEvent).detail));

    await abrir(el);
    el.shadowRoot.querySelector<HTMLElement>('ion-item')!.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(consultas.some((c) => c.name === 'customers.get')).toBe(true);
    expect(emitidos[0]).toEqual({
      customer_id: 'cus-1',
      customer_name: 'Ana García',
      customer_tax_id: '12345678Z',
      customer_address: 'Calle Mayor 1, 28013 Madrid, ES',
    });
  });

  it('al quitar el cliente vacía también el snapshot fiscal', async () => {
    const el = await montar();
    const emitidos: Record<string, unknown>[] = [];
    el.addEventListener('erp:customer-context', (e) => emitidos.push((e as CustomEvent).detail));

    await abrir(el);
    el.shadowRoot.querySelector<HTMLElement>('ion-item')!.click();
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    // Con cliente elegido aparece "Quitar cliente" en el slot footer.
    el.shadowRoot.querySelector<HTMLElement>('.clear')!.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(emitidos.at(-1)).toEqual({
      customer_id: null, customer_name: '', customer_tax_id: '', customer_address: '',
    });
  });
});

// customers#18 — the selector must never DEGRADE SILENTLY. Two `.catch(() => [])` turned "Customers
// is down" and "no permission" into "no matches", and a failed `customers.get` let the sale go on
// with a customer WITHOUT fiscal snapshot. Market (Square, Toast, Lightspeed, Shopify POS, Fresha):
// visible error with retry, and «+ new customer» inline from the search itself (name/phone).
describe('estados diferenciados y alta rápida (customers#18)', () => {
  type WC = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> } & Record<string, unknown>;
  const flush = async (el: WC) => { await el.updateComplete; await new Promise((r) => setTimeout(r, 0)); await el.updateComplete; };
  const sdk = () => (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;

  it('un 500 en la búsqueda muestra ERROR con reintento (no «sin resultados»)', async () => {
    sdk().query = async (name: string) => { if (name === 'customers.list') throw new Error('boom'); return []; };
    const el = (await montar()) as WC;
    await abrir(el);
    expect(el.state, 'estado error, no empty').toBe('error');
    expect(el.shadowRoot.querySelector('ok-empty-state'), 'no se pinta "sin resultados"').toBeNull();
    expect(el.shadowRoot.querySelector('ok-inline-feedback[tone="danger"]'), 'error visible').toBeTruthy();
    expect(el.shadowRoot.querySelector('.retry'), 'botón de reintento').toBeTruthy();
  });

  it('un permission_denied muestra FALTA DE PERMISO, sin reintento', async () => {
    sdk().query = async (name: string) => {
      if (name === 'customers.list') throw Object.assign(new Error('nope'), { code: 'permission_denied' });
      return [];
    };
    const el = (await montar()) as WC;
    await abrir(el);
    expect(el.state).toBe('forbidden');
    expect(el.shadowRoot.querySelector('.retry')).toBeNull();
  });

  it('reintentar conserva el término y una respuesta VIEJA no pisa a la nueva', async () => {
    let calls = 0;
    const gates: Array<() => void> = [];
    sdk().query = async (name: string, params?: Record<string, unknown>) => {
      if (name !== 'customers.list') return [];
      calls += 1;
      const term = String(params?.search ?? '');
      await new Promise<void>((r) => gates.push(r));
      return [{ id: `c-${term}`, name: `Result for ${term}` }];
    };
    const el = (await montar()) as WC;
    await abrir(el); // 1st call, term ''
    (el.onInput as (v: string) => void)('an');
    await new Promise((r) => setTimeout(r, 350)); // debounce → 2nd call, term 'an'
    expect(calls).toBe(2);
    gates[1](); await flush(el); // newest resolves first
    gates[0](); await flush(el); // stale resolves last
    const items = [...el.shadowRoot.querySelectorAll('ion-item h3')].map((n) => n.textContent);
    expect(items, 'the stale answer must not overwrite the newest').toEqual(['Result for an']);
    expect(el.q).toBe('an');
  });

  it('si customers.get falla NO se emite selección: error visible, la venta no sigue sin snapshot', async () => {
    sdk().query = async (name: string) => {
      if (name === 'customers.get') throw new Error('down');
      if (name === 'customers.list') return [ANA];
      return [];
    };
    const el = (await montar()) as WC;
    const emitidos: unknown[] = [];
    el.addEventListener('erp:customer-context', (e) => emitidos.push((e as CustomEvent).detail));
    await abrir(el);
    el.shadowRoot.querySelector<HTMLElement>('ion-item')!.click();
    await flush(el);
    expect(emitidos, 'nothing emitted without the fiscal snapshot').toEqual([]);
    expect(el.selectedId, 'no customer stays selected').toBeUndefined();
    expect(el.shadowRoot.querySelector('ok-inline-feedback[tone="danger"]')).toBeTruthy();
  });

  it('alta rápida desde el buscador: nombre/teléfono → customers.create → selección con snapshot', async () => {
    const comandos: { name: string; payload: Record<string, unknown> }[] = [];
    sdk().hasPermission = () => true;
    sdk().command = async (name: string, payload: Record<string, unknown>) => {
      comandos.push({ name, payload });
      return { ok: true, new_ids: ['cus-new'] };
    };
    sdk().query = async (name: string, params?: Record<string, unknown>) => {
      if (name === 'customers.list') return [];
      if (name === 'customers.get') return [{ id: params?.customer_id, name: 'Luis', phone: '600', tax_id: '', address: '', city: '', postal_code: '', country: '' }];
      return [];
    };
    const el = (await montar()) as WC;
    const emitidos: Record<string, unknown>[] = [];
    el.addEventListener('erp:customer-context', (e) => emitidos.push((e as CustomEvent).detail));
    await abrir(el);
    (el.onInput as (v: string) => void)('Luis');
    await new Promise((r) => setTimeout(r, 350));
    await flush(el);
    const add = el.shadowRoot.querySelector<HTMLElement>('.quick-add');
    expect(add, '«+ new customer» inline when the search has a term').toBeTruthy();
    add!.click();
    await flush(el);
    (el.quickPhone = '600');
    await (el.quickCreate as () => Promise<void>)();
    await flush(el);
    expect(comandos.map((c) => c.name)).toEqual(['customers.create']);
    expect(comandos[0].payload).toMatchObject({ name: 'Luis', phone: '600' });
    expect(emitidos.at(-1)).toMatchObject({ customer_id: 'cus-new', customer_name: 'Luis' });
  });

  it('sin permiso de alta no hay alta rápida', async () => {
    sdk().hasPermission = (p: string) => p !== 'customers.add_customer';
    const el = (await montar()) as WC;
    await abrir(el);
    (el.onInput as (v: string) => void)('Luis');
    await new Promise((r) => setTimeout(r, 350));
    await flush(el);
    expect(el.shadowRoot.querySelector('.quick-add')).toBeNull();
  });
});
