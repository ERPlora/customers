// La UI ya NO promete un descuento por grupo (customers#17).
//
// Un grupo de clientes ofrecía un `discount_percent` que no aplica nadie: `sales` no depende de
// `customers` (`depends_on: ["inventory", "taxes"]`), ningún módulo lee `customers.groups.*` y
// `pricing` no tiene un solo consumidor en el proyecto. El porcentaje no llegaba a ninguna venta
// por ningún camino — pero se enseñaba en el sitio más visible: al asignar un cliente a un grupo,
// el selector de membresías pintaba literalmente `VIP (−10%)`.
//
// Aunque alguien lo consumiera, el dato es ambiguo por diseño: un cliente puede estar en VARIOS
// grupos y no hay prioridad, acumulación, exclusión, vigencia ni tope. 5 % + 10 % no tiene
// respuesta. El grupo es SEGMENTACIÓN de identidad; el cálculo monetario es de `pricing`.
//
// Este fichero fija las tres bocas por las que salía, en los dos componentes:
//   1. la columna «Descuento %» de la tabla de grupos (ordenable y filtrable por rango),
//   2. el campo 0-100 del formulario de alta/edición,
//   3. el sufijo `(−10%)` del selector de membresías de la ficha del cliente.
//
// La columna de BD se queda (contrato externo, no se dropea): eso lo guarda
// `tests/group_discount_retired.pg.test.py`, que además comprueba que editar un grupo con 10 %
// no escribe 0 encima.
import { beforeEach, describe, expect, it } from 'vitest';

const GRUPO = {
  id: 'g1', name: 'VIP', description: 'Clientes VIP', discount_percent: 10,
  color: 'primary', sort_order: 1, is_active: 1, customer_count: 3,
};

const comandos: { name: string; payload: Record<string, unknown> }[] = [];

beforeEach(() => {
  comandos.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryAll: async () => [GRUPO],
    queryPage: async () => ({ rows: [GRUPO], total: 1 }),
    command: async (name: string, payload: Record<string, unknown>) => {
      comandos.push({ name, payload });
      return {};
    },
    hasPermission: () => true,
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
  };
});

async function montar(tag: 'erp-customers-groups' | 'erp-customers-list') {
  if (tag === 'erp-customers-groups') await import('./erp-customers-groups');
  else await import('../erp-customers-list/erp-customers-list');
  const el = document.createElement(tag);
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

describe('la tabla de grupos no tiene columna de descuento', () => {
  it('ninguna columna declara `discount_percent` (ni ordenable ni filtrable)', async () => {
    const el = await montar('erp-customers-groups');
    const tabla = el.shadowRoot.querySelector('ok-data-table') as unknown as {
      columns: Array<{ key: string }>;
    };
    expect(
      tabla.columns.map((c) => c.key),
      'la tabla sigue ofreciendo el descuento como columna',
    ).not.toContain('discount_percent');
  });

  it('el formulario de alta/edición no tiene el campo del porcentaje', async () => {
    const el = await montar('erp-customers-groups');
    const form = el.shadowRoot.querySelector('form[slot="create"]')!;
    const etiquetas = [...form.querySelectorAll('ion-input')].map((i) => i.getAttribute('label'));
    expect(etiquetas, 'el formulario sigue pidiendo un descuento').not.toContain('ui.fieldDiscount');
    // Un `type="number"` con `max="100"` era el campo del porcentaje; el de orden no lleva tope.
    const topeCien = [...form.querySelectorAll('ion-input[type="number"]')].filter(
      (i) => i.getAttribute('max') === '100',
    );
    expect(topeCien.length, 'queda un input 0-100 en el formulario de grupos').toBe(0);
  });

  it('el alta ya NO manda `discount_percent` en el payload', async () => {
    const el = await montar('erp-customers-groups');
    (el as unknown as { fName: string }).fName = 'VIP';
    el.shadowRoot.querySelector('form[slot="create"]')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));

    const alta = comandos.find((c) => c.name === 'customers.groups.create');
    expect(alta, 'no se mandó el alta del grupo').toBeTruthy();
    expect(
      Object.keys(alta!.payload),
      'el alta sigue mandando un descuento que nadie aplica',
    ).not.toContain('discount_percent');
  });

  it('la edición tampoco lo manda — si lo mandara vacío escribiría 0 encima del valor guardado', async () => {
    const el = await montar('erp-customers-groups');
    const tabla = el.shadowRoot.querySelector('ok-data-table') as unknown as { open: (p?: string) => void };
    tabla.open = () => {};
    (el as unknown as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot
      .querySelector('ok-data-table')!
      .dispatchEvent(new CustomEvent('rowAction', { detail: { actionId: 'edit', row: GRUPO } }));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    el.shadowRoot.querySelector('form[slot="create"]')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));

    const edicion = comandos.find((c) => c.name === 'customers.groups.update');
    expect(edicion, 'editar no mandó customers.groups.update').toBeTruthy();
    expect(
      Object.keys(edicion!.payload),
      'la edición sigue mandando el descuento',
    ).not.toContain('discount_percent');
  });
});

describe('el selector de membresías de la ficha no pinta `VIP (−10%)`', () => {
  it('enseña el nombre del grupo y nada más', async () => {
    const el = await montar('erp-customers-list');
    const wc = el as unknown as { detail: unknown; groups: unknown[]; groupIds: string[] };
    wc.detail = { id: 'c1', name: 'Ada', lifecycle_stage: 'lead', is_active: 1 };
    wc.groups = [GRUPO];
    wc.groupIds = [];
    (el as unknown as { requestUpdate(): void }).requestUpdate();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    const texto = el.shadowRoot.textContent ?? '';
    expect(texto, 'la ficha no llegó a pintar el grupo').toContain('VIP');
    expect(texto, 'el selector sigue prometiendo un descuento que nadie aplica').not.toContain('−10');
    expect(texto).not.toContain('(−');
  });
});
