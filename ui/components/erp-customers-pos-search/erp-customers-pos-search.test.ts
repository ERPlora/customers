// Contrato del selector de CLIENTE del TPV (slot `sales.pos.assign`, ADR-0043 B).
//
// El POS agrega mesa y cliente en UN modal de pestañas; este WC es el CONTENIDO de la pestaña
// "Cliente": se monta INLINE (sin botón-trigger ni modal propio), precarga los clientes al montar,
// el cajero busca y pulsa uno → asocia la venta al cliente.
//
// Y al asociarlo viaja el SNAPSHOT FISCAL (ADR-0132): sin `customer_tax_id`/`customer_address` en el
// evento, la factura emitida desde el TPV sale sin NIF ni dirección aunque el cliente los tenga en su
// ficha. `customers.list` no trae la dirección → hay que pedir la ficha completa (`customers.get`).
//
// Nada de `ion-modal` (los overlays de Ionic en un shadow root de Lit se re-parentan a <body> y
// pierden el CSS, ADR-0028); el modal lo pone el POS, aquí solo va el picker.
import { beforeEach, describe, expect, it } from 'vitest';

const ANA = { id: 'cus-1', name: 'Ana García', phone: '600111222', email: 'ana@example.com' };

const ANA_FICHA = {
  ...ANA,
  tax_id: '12345678Z',
  address: 'Calle Mayor 1',
  city: 'Madrid',
  postal_code: '28013',
  country: 'ES',
};

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

describe('erp-customers-pos-search', () => {
  it('se monta INLINE: buscador + listado precargado, sin botón-trigger ni overlay propio', async () => {
    const el = await montar();
    expect(el.shadowRoot.querySelector('ion-button.trigger'), 'no debe haber botón-trigger').toBeNull();
    expect(el.shadowRoot.querySelector('.scrim'), 'no debe haber overlay propio').toBeNull();
    expect(el.shadowRoot.querySelector('ion-searchbar'), 'lleva su buscador').toBeTruthy();
    expect(el.shadowRoot.querySelectorAll('ion-item').length, 'precarga clientes al montar').toBe(1);
  });

  it('al elegir cliente emite el snapshot FISCAL, no solo el nombre', async () => {
    const el = await montar();
    const emitidos: Record<string, unknown>[] = [];
    el.addEventListener('erp:customer-context', (e) => emitidos.push((e as CustomEvent).detail));

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

    el.shadowRoot.querySelector<HTMLElement>('ion-item')!.click();
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    el.shadowRoot.querySelector<HTMLElement>('.clear')!.click();
    await new Promise((r) => setTimeout(r, 0));

    // Si el NIF sobreviviera al «quitar cliente», la siguiente factura saldría con el NIF del anterior.
    expect(emitidos.at(-1)).toEqual({
      customer_id: null, customer_name: '', customer_tax_id: '', customer_address: '',
    });
  });
});
