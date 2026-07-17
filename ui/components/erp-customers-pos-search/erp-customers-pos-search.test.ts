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
