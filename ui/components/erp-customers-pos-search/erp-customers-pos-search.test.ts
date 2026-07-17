// Contrato del selector de CLIENTE del TPV (slot `sales.pos.assign`, ADR-0043 B).
//
// El POS monta ESTE WC en el header como UN botón-icono, independiente del de mesa (sin mezclar
// funcionalidades). El botón abre SU propio modal con buscador + lista (`ion-list`); al elegir un
// cliente emite `erp:customer-context` y CIERRA el modal.
//
// Y al asociarlo viaja el SNAPSHOT FISCAL (ADR-0132): sin `customer_tax_id`/`customer_address` en el
// evento, la factura emitida desde el TPV sale sin NIF ni dirección aunque el cliente los tenga en su
// ficha. `customers.list` no trae la dirección → hay que pedir la ficha completa (`customers.get`).
//
// Nada de `ion-modal` (los overlays de Ionic en un shadow root de Lit se re-parentan a <body> y
// pierden el CSS, ADR-0028); el overlay es propio (scrim + panel).
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

/** Abre el modal del selector (pulsa el botón-icono) y espera a que pinte la lista. */
async function abrir(el: HTMLElement & { shadowRoot: ShadowRoot }) {
  el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
}

describe('erp-customers-pos-search', () => {
  it('el disparador es un botón-icono y el modal (<dialog>) arranca cerrado', async () => {
    const el = await montar();
    const boton = el.shadowRoot.querySelector('ion-button.trigger');
    expect(boton, 'debe haber un botón-trigger de cliente').toBeTruthy();
    expect(boton?.querySelector('ion-icon[slot="icon-only"]'), 'icono, sin texto').toBeTruthy();
    expect(boton?.getAttribute('aria-label'), 'con nombre accesible (ADR-0133)').toBeTruthy();
    expect(el.shadowRoot.querySelector('dialog'), 'el picker usa <dialog> nativo').toBeTruthy();
    expect((el as unknown as { open: boolean }).open, 'cerrado al montar').toBe(false);
  });

  it('abre su modal con buscador + lista Ionic al pulsar', async () => {
    const el = await montar();
    await abrir(el);
    expect((el as unknown as { open: boolean }).open, 'se abre al pulsar').toBe(true);
    const dialogo = el.shadowRoot.querySelector('dialog');
    expect(dialogo?.querySelector('ion-searchbar'), 'lleva buscador').toBeTruthy();
    expect(dialogo?.querySelectorAll('ion-item').length, 'lista Ionic de clientes').toBe(1);
  });

  it('al elegir cliente emite el snapshot FISCAL y cierra el modal', async () => {
    const el = await montar();
    const emitidos: Record<string, unknown>[] = [];
    el.addEventListener('erp:customer-context', (e) => emitidos.push((e as CustomEvent).detail));

    await abrir(el);
    el.shadowRoot.querySelector<HTMLElement>('ion-item')!.click();
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    expect(consultas.some((c) => c.name === 'customers.get')).toBe(true);
    expect(emitidos[0]).toEqual({
      customer_id: 'cus-1',
      customer_name: 'Ana García',
      customer_tax_id: '12345678Z',
      customer_address: 'Calle Mayor 1, 28013 Madrid, ES',
    });
    expect((el as unknown as { open: boolean }).open, 'al elegir se cierra el modal').toBe(false);
  });

  it('al quitar el cliente vacía también el snapshot fiscal', async () => {
    const el = await montar();
    const emitidos: Record<string, unknown>[] = [];
    el.addEventListener('erp:customer-context', (e) => emitidos.push((e as CustomEvent).detail));

    await abrir(el);
    el.shadowRoot.querySelector<HTMLElement>('ion-item')!.click();
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    // Elegir cliente cierra el modal; para quitarlo se reabre desde el mismo botón.
    await abrir(el);
    el.shadowRoot.querySelector<HTMLElement>('.clear')!.click();
    await new Promise((r) => setTimeout(r, 0));

    // Si el NIF sobreviviera al «quitar cliente», la siguiente factura saldría con el NIF del anterior.
    expect(emitidos.at(-1)).toEqual({
      customer_id: null, customer_name: '', customer_tax_id: '', customer_address: '',
    });
  });
});
