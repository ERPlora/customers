// Contrato de la BARRA del CRUD de grupos de clientes.
//
// Un grupo es una FILA de esta tabla, así que darlo de alta es cosa de la tabla: el formulario vive
// DENTRO de `ok-data-table`, en el panel `slot="create"` que despliega el «+» de su barra — igual
// que /employees en el core e `inventory/products`. Aquí el formulario colgaba suelto encima, con un
// botón «Nuevo grupo» y un `<h2>` que repetía el título que ya pinta el topbar del shell.
//
// El mismo panel sirve para EDITAR una fila (la acción «Editar» lo abre relleno): eso obliga a que
// el formulario esté SIEMPRE proyectado en el slot —si solo se pintara al pulsar «Nuevo», el «+» de
// la tabla abriría un panel vacío— y a que el guardado distinga alta de edición.
import { beforeEach, describe, expect, it } from 'vitest';

// Sin `discount_percent`: el grupo dejó de prometer un descuento que no aplica nadie
// (customers#17 — el contrato retirado lo fija `discount-retired.test.ts`).
const GRUPO = {
  id: 'g1', name: 'VIP', description: 'Clientes VIP',
  color: 'primary', sort_order: 1, is_active: 1, customer_count: 3,
};

const comandos: { name: string; payload: Record<string, unknown> }[] = [];

beforeEach(() => {
  comandos.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryPage: async () => ({ rows: [GRUPO], total: 1 }),
    command: async (name: string, payload: Record<string, unknown>) => {
      comandos.push({ name, payload });
      return {};
    },
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

async function montar() {
  await import('./erp-customers-groups');
  const el = document.createElement('erp-customers-groups');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

const tabla = (el: HTMLElement & { shadowRoot: ShadowRoot }) =>
  el.shadowRoot.querySelector('ok-data-table') as (HTMLElement & { addable: boolean; fill: boolean; open: (p?: string) => void; rowClickable: boolean }) | null;

const formulario = (el: HTMLElement & { shadowRoot: ShadowRoot }) =>
  el.shadowRoot.querySelector('form[slot="create"]') as HTMLFormElement | null;

describe('el alta vive DENTRO de la tabla (paridad con /employees e inventory)', () => {
  it('la tabla declara `addable` → pinta el «+» en su barra', async () => {
    const el = await montar();
    expect(tabla(el)?.addable, 'sin `addable` no hay «+» en la barra de la tabla').toBe(true);
  });

  it('la tabla llena el alto de la vista (`fill`)', async () => {
    const el = await montar();
    expect(tabla(el)?.fill, 'sin `fill` la tabla no ocupa el alto (scroll interno + pie fijo)').toBe(true);
  });

  it('el formulario se proyecta SIEMPRE en el panel `create` (el «+» no puede abrir un panel vacío)', async () => {
    const el = await montar();
    const form = formulario(el);
    expect(form, 'el formulario no está en el slot `create` desde el primer render').toBeTruthy();
    expect(form?.closest('ok-data-table'), 'el formulario cuelga fuera de la tabla').toBeTruthy();
  });

  it('no queda NINGÚN control de alta suelto fuera de la tabla', async () => {
    const el = await montar();
    const sueltos = [...el.shadowRoot.querySelectorAll('form, ion-input, ion-select, ion-button')].filter(
      (n) => !n.closest('ok-data-table'),
    );
    expect(sueltos.map((n) => n.tagName.toLowerCase()), 'hay controles de alta fuera de la tabla').toEqual([]);
  });

  it('no repite el título de la vista: lo pinta el topbar del shell', async () => {
    const el = await montar();
    expect(el.shadowRoot.querySelector('h2'), 'la vista duplica el título del topbar').toBeNull();
  });
});

describe('permisos efectivos del usuario', () => {
  it('oculta alta, edición y borrado cuando el usuario solo puede consultar grupos', async () => {
    ((globalThis as Record<string, any>).erplora).hasPermission = () => false;
    const el = await montar();
    expect(tabla(el)?.addable).toBe(false);
    expect((tabla(el) as unknown as { actions: unknown[] }).actions).toEqual([]);
  });
});

describe('alta y edición comparten el panel de la tabla', () => {
  it('el alta manda customers.groups.create', async () => {
    const el = await montar();
    const wc = el as unknown as { fName: string };
    wc.fName = 'VIP';
    formulario(el)!.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));

    const alta = comandos.find((c) => c.name === 'customers.groups.create');
    expect(alta, 'no se mandó el alta del grupo').toBeTruthy();
    expect(alta!.payload.name).toBe('VIP');
  });

  it('«Editar» abre el panel `create` de la tabla con la fila cargada y guarda con groups.update', async () => {
    const el = await montar();
    const t = tabla(el)!;
    const abierto: string[] = [];
    t.open = (p?: string) => abierto.push(p ?? 'create');

    t.dispatchEvent(new CustomEvent('rowAction', { detail: { actionId: 'edit', row: GRUPO } }));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    expect(abierto, 'editar no abre el panel de la tabla').toEqual(['create']);
    expect((el as unknown as { fName: string }).fName, 'el panel no se abre con la fila cargada').toBe('VIP');

    formulario(el)!.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));

    const edicion = comandos.find((c) => c.name === 'customers.groups.update');
    expect(edicion, 'editar una fila creó un grupo nuevo en vez de actualizarla').toBeTruthy();
    expect(edicion!.payload.group_id).toBe('g1');
    expect(comandos.some((c) => c.name === 'customers.groups.create')).toBe(false);
  });
});

// ── pm#155 (outfitkit#67, second half) ────────────────────────────────────────────────────────
//
// At 1440 px the «Actions» column fell off the screen with nothing hinting the table went on to
// the right, so the only door into a group was a button nobody could see. OutfitKit 0.1.44 pins
// that column, but the other half of the fix is opt-in: `rowClickable` turns the whole row into a
// door — the first thing a user tries. The list has to ask for it, and wire `rowClick` to the
// same edit panel the «edit» action opens.
describe('clicking the row opens the group (pm#155)', () => {
  it('the table declares `rowClickable` → the whole row is a door, not just the action button', async () => {
    const el = await montar();
    expect(
      tabla(el)?.rowClickable,
      'without `rowClickable` the row is dead: if the actions column is off-screen there is no way in',
    ).toBe(true);
  });

  it('`rowClick` puts the group in the edit panel, same as the «edit» action', async () => {
    const el = await montar();
    tabla(el)!.dispatchEvent(new CustomEvent('rowClick', { detail: { row: GRUPO } }));
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    const wc = el as unknown as { editing: unknown };
    expect(wc.editing, 'the row was clicked and the edit panel did not take the group').toEqual(GRUPO);
  });
});
