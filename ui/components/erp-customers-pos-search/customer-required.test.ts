// customers#62 — con «Exigir cliente en cada venta» (`sales.require_customer`) el TPV no deja
// empezar el cobro sin cliente: avisa y dispara `erp:customer-required` sobre cada relleno del slot
// `sales.pos.assign` (sales#222, `erp-pos-touch.ts` → `askForCustomer`).
//
// `sales` NO conoce a `customers` (ADR-0043): el contrato es el EVENTO —`bubbles: false`, dirigido
// al elemento del relleno, sin `detail`—, nunca el DOM del otro módulo. Sin escucharlo, el cajero
// recibía el aviso y tenía que ir a buscar el icono de cliente a mano; con él el buscador se abre
// solo, que es lo que hacen Odoo (`pos_required_customer` lleva al selector al pulsar Pago) y
// Shopify POS (lo obligatorio se pide DENTRO del flujo de cobro).
//
// Vive en su propio fichero, como `consent.test.ts` o `delete-guard.test.ts` en la lista: el
// contrato general del selector ya tiene el suyo y no hay por qué mezclarlos.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@erplora/outfitkit/ok-spotlight-search', () => ({}));

const ANA = { id: 'cus-1', name: 'Ana García', phone: '600111222', email: 'ana@example.com' };

const consultas: { name: string; params?: Record<string, unknown> }[] = [];

beforeEach(() => {
  consultas.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string, params?: Record<string, unknown>) => {
      consultas.push({ name, params });
      return name === 'customers.list' ? [ANA] : [];
    },
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

type WC = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> } & Record<string, unknown>;

async function montar(): Promise<WC> {
  await import('./erp-customers-pos-search');
  const el = document.createElement('erp-customers-pos-search') as unknown as WC;
  document.body.appendChild(el);
  await flush(el);
  return el;
}

async function flush(el: WC) {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
}

/** Tal cual lo emite `erp-pos-touch`: sin detail, sin burbujear, sobre el elemento del relleno. */
const exigirCliente = (el: WC) => el.dispatchEvent(new CustomEvent('erp:customer-required', { bubbles: false }));

const busquedas = () => consultas.filter((c) => c.name === 'customers.list').length;

describe('el buscador se abre solo cuando la venta EXIGE cliente (customers#62)', () => {
  it('al recibir `erp:customer-required` queda abierto y ha pedido customers.list', async () => {
    const el = await montar();
    expect(busquedas(), 'de partida no ha buscado nada').toBe(0);

    exigirCliente(el);
    await flush(el);

    expect(el.open, 'el buscador queda abierto sin que el cajero lo toque').toBe(true);
    expect(
      (el.shadowRoot.querySelector('ok-spotlight-search') as unknown as { open?: boolean })?.open,
      'y el chrome de OutfitKit también: es quien pinta el overlay',
    ).toBe(true);
    expect(busquedas(), 'con su carga inicial').toBe(1);
    expect(el.shadowRoot.querySelectorAll('ion-item').length, 'con los resultados ya pintados').toBe(1);
  });

  it('recibirlo dos veces no duplica la búsqueda', async () => {
    const el = await montar();
    exigirCliente(el);
    await flush(el);
    exigirCliente(el);
    await flush(el);

    expect(busquedas(), 'idempotente: el TPV puede reavisar en cada intento de cobro').toBe(1);
    expect(el.open).toBe(true);
  });

  it('sin el evento nada cambia: el buscador sigue cerrado y no consulta', async () => {
    const el = await montar();
    await flush(el);

    expect(el.open).toBe(false);
    expect(busquedas()).toBe(0);
  });
});
