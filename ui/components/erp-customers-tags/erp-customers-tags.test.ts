// Contrato de la BARRA del CRUD de etiquetas de clientes.
//
// Una etiqueta es una FILA de esta tabla: el formulario de alta vive DENTRO de `ok-data-table`, en
// el panel `slot="create"` que despliega el «+» de su barra (paridad con /employees en el core y con
// `inventory/products`). Antes colgaba suelto encima, con un botón «Nueva etiqueta» y un `<h2>` que
// repetía el título del topbar del shell.
//
// El mismo panel edita una fila («Editar» lo abre relleno), así que el formulario tiene que estar
// SIEMPRE proyectado en el slot —si no, el «+» abriría un panel vacío— y el guardado debe distinguir
// alta de edición.
import { beforeEach, describe, expect, it } from 'vitest';

const ETIQUETA = { id: 't1', name: 'Fiel', color: 'success', is_active: 1 };

const comandos: { name: string; payload: Record<string, unknown> }[] = [];

beforeEach(() => {
  comandos.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryPage: async () => ({ rows: [ETIQUETA], total: 1 }),
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
  await import('./erp-customers-tags');
  const el = document.createElement('erp-customers-tags');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

const tabla = (el: HTMLElement & { shadowRoot: ShadowRoot }) =>
  el.shadowRoot.querySelector('ok-data-table') as (HTMLElement & { addable: boolean; fill: boolean; open: (p?: string) => void }) | null;

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

describe('alta y edición comparten el panel de la tabla', () => {
  it('el alta manda customers.tags.create', async () => {
    const el = await montar();
    (el as unknown as { fName: string }).fName = 'Fiel';
    formulario(el)!.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));

    const alta = comandos.find((c) => c.name === 'customers.tags.create');
    expect(alta, 'no se mandó el alta de la etiqueta').toBeTruthy();
    expect(alta!.payload.name).toBe('Fiel');
  });

  it('«Editar» abre el panel `create` de la tabla con la fila cargada y guarda con tags.update', async () => {
    const el = await montar();
    const t = tabla(el)!;
    const abierto: string[] = [];
    t.open = (p?: string) => abierto.push(p ?? 'create');

    t.dispatchEvent(new CustomEvent('rowAction', { detail: { actionId: 'edit', row: ETIQUETA } }));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    expect(abierto, 'editar no abre el panel de la tabla').toEqual(['create']);
    expect((el as unknown as { fName: string }).fName, 'el panel no se abre con la fila cargada').toBe('Fiel');

    formulario(el)!.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));

    const edicion = comandos.find((c) => c.name === 'customers.tags.update');
    expect(edicion, 'editar una fila creó una etiqueta nueva en vez de actualizarla').toBeTruthy();
    expect(edicion!.payload.tag_id).toBe('t1');
    expect(comandos.some((c) => c.name === 'customers.tags.create')).toBe(false);
  });
});
