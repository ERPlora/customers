// Contrato del selector de CLIENTE del TPV (slot `sales.pos.customer_context`, ADR-0043).
//
// El cajero pulsa un ICONO (no un botón de texto: en el TPV el espacio es la barra de contexto del
// carrito, y la convención de ERPlora es icono + aria-label — ADR-0133), se abre un `ion-modal` con
// buscador + listado, busca al cliente y lo pulsa. Eso asocia la venta al cliente.
//
// Y al asociarlo viaja el SNAPSHOT FISCAL (ADR-0132): sin `customer_tax_id`/`customer_address` en el
// evento, la factura emitida desde el TPV sale sin NIF ni dirección aunque el cliente los tenga en su
// ficha. `customers.list` no trae la dirección → hay que pedir la ficha completa (`customers.get`).
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  it('el disparador es un icono, no un botón de texto', async () => {
    const el = await montar();
    const boton = el.shadowRoot.querySelector('ion-button.trigger');
    expect(boton).toBeTruthy();
    // Icono proyectado en el slot `icon-only` de Ionic → el botón no renderiza etiqueta.
    expect(boton?.querySelector('ion-icon[slot="icon-only"]')).toBeTruthy();
    expect(boton?.textContent?.trim()).toBe('');
    // Pero SÍ tiene nombre accesible: icon-only sin aria-label es un botón mudo (ADR-0133).
    expect(boton?.getAttribute('aria-label')).toBeTruthy();
  });

  // NO es un `ion-modal`, y es a propósito: un overlay de Ionic declarado dentro de un shadow root
  // de Lit se RE-PARENTA a <body> al presentarse (ADR-0028) → los estilos del `static styles` dejan
  // de aplicar y la lista sale sin formato. El overlay es propio (scrim + panel), como en el resto
  // del repo. El contrato es el COMPORTAMIENTO (diálogo con buscador y listado), no la etiqueta.
  it('abre un overlay con buscador y listado', async () => {
    const el = await montar();
    el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    const dialogo = el.shadowRoot.querySelector('[role="dialog"]');
    expect(dialogo).toBeTruthy();
    expect(dialogo?.querySelector('ion-searchbar')).toBeTruthy();
    expect(dialogo?.querySelectorAll('.item').length).toBe(1);
  });

  it('al elegir cliente emite el snapshot FISCAL, no solo el nombre', async () => {
    const el = await montar();
    const emitidos: Record<string, unknown>[] = [];
    el.addEventListener('erp:customer-context', (e) => emitidos.push((e as CustomEvent).detail));

    el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    el.shadowRoot.querySelector<HTMLElement>('.item')!.click();
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

    el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    el.shadowRoot.querySelector<HTMLElement>('.item')!.click();
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    // Elegir cliente CIERRA el overlay (el cajero vuelve al cobro). Para quitarlo se reabre el
    // selector desde el mismo icono y se pulsa «quitar cliente».
    el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
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
