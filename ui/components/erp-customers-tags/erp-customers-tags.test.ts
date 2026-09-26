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
  it('oculta alta, edición y borrado cuando el usuario solo puede consultar etiquetas', async () => {
    ((globalThis as Record<string, any>).erplora).hasPermission = () => false;
    const el = await montar();
    expect(tabla(el)?.addable).toBe(false);
    expect((tabla(el) as unknown as { actions: unknown[] }).actions).toEqual([]);
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

    expect(abierto, 'editar no abre el panel de la tabla en modo edición (pm#450)').toEqual(['edit']);
    expect((el as unknown as { fName: string }).fName, 'el panel no se abre con la fila cargada').toBe('Fiel');

    formulario(el)!.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));

    const edicion = comandos.find((c) => c.name === 'customers.tags.update');
    expect(edicion, 'editar una fila creó una etiqueta nueva en vez de actualizarla').toBeTruthy();
    expect(edicion!.payload.tag_id).toBe('t1');
    expect(comandos.some((c) => c.name === 'customers.tags.create')).toBe(false);
  });
});

// ── pm#155 (outfitkit#67, second half) ────────────────────────────────────────────────────────
//
// At 1440 px the «Actions» column fell off the screen with nothing hinting the table went on to
// the right, so the only door into a tag was a button nobody could see. OutfitKit 0.1.44 pins
// that column, but the other half of the fix is opt-in: `rowClickable` turns the whole row into a
// door — the first thing a user tries. The list has to ask for it, and wire `rowClick` to the
// same edit panel the «edit» action opens.
describe('clicking the row opens the tag (pm#155)', () => {
  it('the table declares `rowClickable` → the whole row is a door, not just the action button', async () => {
    const el = await montar();
    expect(
      tabla(el)?.rowClickable,
      'without `rowClickable` the row is dead: if the actions column is off-screen there is no way in',
    ).toBe(true);
  });

  it('`rowClick` puts the tag in the edit panel, same as the «edit» action', async () => {
    const el = await montar();
    tabla(el)!.dispatchEvent(new CustomEvent('rowClick', { detail: { row: ETIQUETA } }));
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    const wc = el as unknown as { editing: unknown };
    expect(wc.editing, 'the row was clicked and the edit panel did not take the tag').toEqual(ETIQUETA);
  });
});

// pm#450 (outfitkit#150): editing opened the table's panel in «create» mode, so its header said
// «New» while the body said «Edit · <name>». The screen now opens it in «edit» mode with that title
// and only keeps the body line when the shell's table cannot title the panel.
describe('editing titles the panel header, not its body (pm#450)', () => {
  type Table = HTMLElement & { open: (panel?: unknown, opts?: { title?: string }) => void; shadowRoot: ShadowRoot };
  type Mounted = HTMLElement & { shadowRoot: ShadowRoot };
  const table = (el: Mounted) => el.shadowRoot.querySelector('ok-data-table') as Table;
  const TITLE = 'ui.editTagTitle · Fiel';
  const line = (el: Mounted) => el.shadowRoot.querySelector('form[slot="create"] [data-testid="customers-tags-editing"]') as HTMLElement | null;
  const settle = async (el: Mounted) => {
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  };
  const edit = async (el: Mounted) => {
    table(el).dispatchEvent(new CustomEvent('rowAction', { detail: { actionId: 'edit', row: ETIQUETA } }));
    await settle(el);
  };

  beforeEach(() => {
    // Interpolate `{name}` so the title can be asserted whole.
    ((globalThis as Record<string, any>).erplora).t = (_c: unknown, key: string, p?: Record<string, unknown>) =>
      p && 'name' in p ? `${key} · ${String(p.name)}` : key;
  });

  it("opens the panel with open('edit', { title }) — the editing title in the header", async () => {
    const el = await montar();
    const calls: unknown[][] = [];
    table(el).open = (panel?: unknown, opts?: { title?: string }) => void calls.push([panel, opts]);
    await edit(el);
    expect(calls).toEqual([['edit', { title: TITLE }]]);
  });

  // The header only carries the title with OutfitKit >= 0.1.94 (outfitkit#150); an older shell
  // (hub:stable ships 0.1.73) ignores it and keeps «New». The body line only goes away when the
  // table REALLY painted the title — its dialog is labelled with it — never on faith.
  const shellTable = (el: Mounted, honoursTitle: boolean) => {
    const t = table(el);
    const dialog = document.createElement('aside');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', 'Form');
    const root = document.createElement('div');
    root.appendChild(dialog);
    Object.defineProperty(t, 'shadowRoot', { value: root, configurable: true });
    // Like the real Lit table, open() only schedules the render: the dialog is labelled on the next
    // microtask and `updateComplete` resolves once it is. Reading the label before awaiting it sees
    // the old «Form» and would keep the line even when the header carries the title.
    let rendered: Promise<void> = Promise.resolve();
    Object.defineProperty(t, 'updateComplete', { get: () => rendered, configurable: true });
    t.open = (_panel?: unknown, opts?: { title?: string }) => {
      rendered = Promise.resolve().then(() => {
        if (honoursTitle && opts?.title) dialog.setAttribute('aria-label', opts.title);
      });
    };
  };

  it('the form body no longer repeats the editing title once the header carries it', async () => {
    const el = await montar();
    shellTable(el, true);
    await edit(el);
    expect(line(el)).toBeNull();
    expect(formulario(el)!.textContent).not.toContain('ui.editTagTitle');
  });

  it('with a shell whose table ignores the title (OutfitKit < 0.1.94), the body keeps the editing line', async () => {
    const el = await montar();
    shellTable(el, false);
    await edit(el);
    expect(line(el), 'the header says «New»: without this line nothing says it is an edit').toBeTruthy();
    expect(line(el)!.textContent).toContain(TITLE);
  });

  it('«Cancel» (back to a clean form) hides the fallback line again', async () => {
    const el = await montar();
    shellTable(el, false);
    await edit(el);
    (el.shadowRoot.querySelector('[data-testid="customers-tags-cancel"]') as HTMLElement).click();
    await settle(el);
    expect(line(el)).toBeNull();
  });

  it('«Add» after an edit opens a CLEAN create form', async () => {
    const el = await montar();
    await edit(el);
    const add = table(el).shadowRoot.querySelector('[data-testid="customers-tags-table-add"]') as HTMLElement;
    expect(add, 'the table paints its «Add» button').toBeTruthy();
    add.click();
    await settle(el);
    const wc = el as unknown as { editing: unknown; fName: string };
    expect(wc.editing, 'a submit here would UPDATE the edited row under a «New» header').toBeNull();
    expect(wc.fName).toBe('');
  });

  it('a click INSIDE the edit form (a field, the table) does not drop the edit — only «Add» does', async () => {
    const el = await montar();
    await edit(el);
    (el.shadowRoot.querySelector('[data-testid="customers-tags-name"]') as HTMLElement).click();
    table(el).click();
    await settle(el);
    expect((el as unknown as { editing: unknown }).editing, 'the table host hears every click of the projected form').toEqual(ETIQUETA);
  });

  it('«Add» with no edit in progress keeps what was typed', async () => {
    const el = await montar();
    (el as unknown as { fName: string }).fName = 'Borrador';
    (table(el).shadowRoot.querySelector('[data-testid="customers-tags-table-add"]') as HTMLElement).click();
    await settle(el);
    expect((el as unknown as { fName: string }).fName).toBe('Borrador');
  });
});
