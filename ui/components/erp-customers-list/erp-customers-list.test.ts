// Contrato de la BARRA de la lista de clientes.
//
// El alta de un cliente es el alta de UNA FILA de esta tabla, así que vive DENTRO de
// `ok-data-table`: detrás del «+» de su barra de herramientas, que despliega el panel
// `slot="create"`. Es lo que hacen /employees en el core e `inventory/products`; aquí no, aquí el
// formulario colgaba suelto ENCIMA de la tabla, con su propio `<h2>` duplicando el título que ya
// pinta el topbar del shell.
//
// Este fichero fija esa paridad: «+» y formulario dentro de la tabla, nada de controles de alta
// sueltos por fuera, y los filtros de dominio cerrado (la etapa del ciclo de vida) con un `select`
// en vez de texto libre.
import { beforeEach, describe, expect, it } from 'vitest';

const CLIENTE = {
  id: 'c1', name: 'Ada Lovelace', email: 'ada@example.com', phone: '600000000', tax_id: '',
  address: '', city: '', postal_code: '', country: '', notes: '', is_active: 1,
  lifecycle_stage: 'lead', source: 'walk_in', company_name: '', birthday: null, anniversary: null,
  preferred_channel: 'none', marketing_consent: 0, consent_date: null, total_purchases: 0,
  total_spent: 0, last_purchase_date: null,
};

const comandos: { name: string; payload: Record<string, unknown> }[] = [];

beforeEach(() => {
  comandos.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => (name === 'customers.stats' ? [{ total: 1, active: 1, vip: 0, total_revenue: 0 }] : []),
    queryPage: async () => ({ rows: [CLIENTE], total: 1 }),
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
    // The real client always exposes it; the list controller needs it for its money filters.
    currencyDecimals: 2,
  };
});

async function montar() {
  await import('./erp-customers-list');
  const el = document.createElement('erp-customers-list');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

const tabla = (el: HTMLElement & { shadowRoot: ShadowRoot }) =>
  el.shadowRoot.querySelector('ok-data-table') as (HTMLElement & { addable: boolean; fill: boolean; rowClickable: boolean }) | null;

describe('el alta vive DENTRO de la tabla (paridad con /employees e inventory)', () => {
  it('la tabla declara `addable` → pinta el «+» en su barra', async () => {
    const el = await montar();
    expect(tabla(el)?.addable, 'sin `addable` no hay «+» en la barra de la tabla').toBe(true);
  });

  it('la tabla llena el alto de la vista (`fill`)', async () => {
    const el = await montar();
    expect(tabla(el)?.fill, 'sin `fill` la tabla no ocupa el alto (scroll interno + pie fijo)').toBe(true);
  });

  it('el formulario de alta se proyecta en el panel `create` de la tabla', async () => {
    const el = await montar();
    const form = el.shadowRoot.querySelector('form[slot="create"]');
    expect(form, 'el formulario de alta no está en el slot `create`').toBeTruthy();
    expect(form?.closest('ok-data-table'), 'el formulario de alta cuelga fuera de la tabla').toBeTruthy();
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

describe('permisos visibles del CRUD', () => {
  it('la lectura sola oculta altas, importación, exportación y borrado', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.hasPermission = () => false;
    const el = await montar();
    const table = tabla(el) as HTMLElement & {
      addable: boolean;
      importable: boolean;
      exportable: boolean;
      actions: Array<{ id: string }>;
    };
    expect(table.addable).toBe(false);
    expect(table.importable).toBe(false);
    expect(table.exportable).toBe(false);
    expect(table.actions.map((action) => action.id)).toEqual(['view']);
  });
});

describe('los filtros van en la tabla, y los de dominio cerrado son `select`', () => {
  it('la etapa del ciclo de vida se filtra con un select (enum de schemas/create.json)', async () => {
    const el = await montar();
    const cols = (el as unknown as { columns: { key: string; filterType?: string; options?: { value: string }[] }[] }).columns;
    const etapa = cols.find((c) => c.key === 'lifecycle_stage');
    expect(etapa?.filterType, 'la etapa se filtra tecleando texto libre').toBe('select');
    expect(etapa?.options?.map((o) => o.value)).toEqual([
      'lead', 'prospect', 'first_purchase', 'active', 'at_risk', 'dormant', 'churned', 'vip',
    ]);
  });

  it('el gasto total se filtra por rango (el servidor lo soporta con `range`)', async () => {
    const el = await montar();
    const cols = (el as unknown as { columns: { key: string; filterType?: string }[] }).columns;
    expect(cols.find((c) => c.key === 'total_spent')?.filterType).toBe('range');
  });
});

describe('el alta sigue funcionando desde el panel', () => {
  it('crear un cliente manda customers.create con los datos del panel', async () => {
    const el = await montar();
    // Se rellena por el DOM, como una persona: desde customers#51 el alta es la ficha entera y su
    // estado vive en `newForm`, no en dos `@state` sueltos.
    const form = el.shadowRoot.querySelector('form[slot="create"]') as HTMLFormElement;
    for (const [key, value] of [['name', 'Ada Lovelace'], ['email', 'ada@example.com']]) {
      const input = form.querySelector(`[data-sheet-field="${key}"]`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new CustomEvent('ionInput', { bubbles: true }));
    }
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));

    const alta = comandos.find((c) => c.name === 'customers.create');
    expect(alta, 'no se mandó el alta del cliente').toBeTruthy();
    expect(alta!.payload.name).toBe('Ada Lovelace');
    expect(alta!.payload.email).toBe('ada@example.com');
  });
});

// ── Regresión de la migración `page_size` → `queryAll` (ADR-0124) ────────────────────────────
//
// `queryAll()` devuelve **el array** de filas, no el sobre `{rows,total}`. El código siguió leyendo
// `page?.rows`, que sobre un array es `undefined` → `this.groups`/`this.tags` quedaban SIEMPRE
// vacíos. Efecto: en la ficha del cliente salía «No hay grupos definidos» aunque los hubiera, y
// **asignar grupos y etiquetas a un cliente estaba muerto en la UI**. El `catch` mudo lo tapaba.
describe('los grupos y etiquetas de la ficha (regresión queryAll, ADR-0124)', () => {
  it('los grupos y etiquetas que devuelve el servidor LLEGAN al componente', async () => {
    const GRUPOS = [{ id: 'g1', name: 'VIP' }];
    const ETIQUETAS = [{ id: 't1', name: 'Fiel', color: 'success' }];
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.queryAll = async (name: string) =>
      name === 'customers.groups.list' ? GRUPOS : name === 'customers.tags.list' ? ETIQUETAS : [];
    sdk.query = async () => [];

    const el = await montar();
    await (el as unknown as { loadMemberships: (id: string) => Promise<void> }).loadMemberships('c1');

    const wc = el as unknown as { groups: unknown[]; tags: unknown[] };
    expect(wc.groups, 'queryAll devuelve el ARRAY: leer `.rows` sobre él da undefined').toHaveLength(1);
    expect(wc.tags, 'sin esto, asignar etiquetas a un cliente es imposible').toHaveLength(1);
  });
});

// CAMPOS PERSONALIZADOS (ADR-0132). Un salón necesita saber «qué tinte usa, qué color le puse la
// última vez»; un restaurante solo los datos fiscales. No es el mismo cliente, así que los campos
// los define el dueño del hub.
//
// El sistema estaba MUERTO: se podían definir campos (`customers.fields.*`), pero el comando que
// guarda el valor (`_field_value_set`) NO tenía ni un solo llamante en todo el repo, ninguna query
// leía `customers_customerfieldvalue`, y la ficha no los pintaba. Definías el campo y nunca se
// rellenaba. Aquí se fija el contrato que lo resucita.
describe('campos personalizados en la ficha (ADR-0132)', () => {
  const CAMPOS = [
    { id: 'f1', name: 'Tinte habitual', field_type: 'text', options: '[]', is_required: 0, sort_order: 1, value: '6.34' },
    { id: 'f2', name: 'Último color', field_type: 'text', options: '[]', is_required: 0, sort_order: 2, value: '' },
    { id: 'f3', name: 'Tipo de piel', field_type: 'select', options: '["Seca","Grasa"]', is_required: 0, sort_order: 3, value: 'Seca' },
  ];

  let comandos: { name: string; payload: Record<string, unknown> }[];

  beforeEach(() => {
    comandos = [];
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.query = async (name: string) => {
      if (name === 'customers.get') return [CLIENTE];
      if (name === 'customers.fields.values') return CAMPOS;
      if (name === 'customers.stats') return [{ total: 1, active: 1, vip: 0, total_revenue: 0 }];
      return [];
    };
    sdk.command = async (name: string, payload: Record<string, unknown>) => {
      comandos.push({ name, payload });
      return {};
    };
  });

  it('la ficha PIDE los valores de los campos del cliente', async () => {
    const el = await montar();
    await (el as unknown as { openDetail(id: string): Promise<void> }).openDetail(CLIENTE.id);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    const campos = (el as unknown as { fieldValues: unknown[] }).fieldValues;
    expect(campos, 'la ficha debe cargar customers.fields.values').toHaveLength(3);
  });

  it('pinta cada campo según su tipo (un select NO es un input de texto)', async () => {
    const el = await montar();
    await (el as unknown as { openDetail(id: string): Promise<void> }).openDetail(CLIENTE.id);
    (el as unknown as { startEdit(): void }).startEdit();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    const root = (el as unknown as { shadowRoot: ShadowRoot }).shadowRoot;
    const zona = root.querySelector('.custom-fields');
    expect(zona, 'la ficha debe tener zona de campos personalizados').toBeTruthy();
    // `select` con opciones → ion-select. Si se pintara como texto libre, el dominio cerrado se
    // rompe (se podría teclear cualquier cosa).
    expect(zona!.querySelector('ion-select[data-field="f3"]'), 'un campo select se pinta como ion-select').toBeTruthy();
    expect(zona!.querySelector('ion-input[data-field="f1"]'), 'un campo text se pinta como ion-input').toBeTruthy();
  });

  // customers#13: the sheet and its values used to be `customers.update` + N × `_field_value_set`
  // fired in parallel from the browser — if one value failed the base data was already changed, and
  // `required`/type were purely visual. Now the UI calls ONE command; the WASM handler validates
  // every value against the definitions it READS (never trusting the browser) and the host writes
  // sheet + values in one transaction.
  it('guardar la ficha es UN command atómico: customers.update_with_fields con los valores', async () => {
    const el = await montar();
    await (el as unknown as { openDetail(id: string): Promise<void> }).openDetail(CLIENTE.id);
    const wc = el as unknown as {
      startEdit(): void;
      setFieldValue(id: string, v: string): void;
      saveEdit(e: Event): Promise<void>;
    };
    wc.startEdit();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    wc.setFieldValue('f2', 'Caoba');
    await wc.saveEdit(new Event('submit'));

    expect(comandos.map((c) => c.name), 'un solo command: nada de update + N sets').toEqual(['customers.update_with_fields']);
    const p = comandos[0].payload;
    expect(p.customer_id).toBe(CLIENTE.id);
    expect(p.name).toBe(CLIENTE.name);
    const fields = p.fields as { field_id: string; value: string }[];
    expect(fields.find((f) => f.field_id === 'f2')?.value).toBe('Caoba');
    expect(fields.find((f) => f.field_id === 'f1')?.value, 'the untouched value travels too (the sheet is saved whole)').toBe('6.34');
    expect(comandos.some((c) => c.name === 'customers._field_value_set'), 'the private sub-command is never called from the browser').toBe(false);
  });

  it('un rechazo del handler se muestra traducido por su código y la ficha sigue en edición', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.command = async () => {
      throw Object.assign(new Error('`Tinte habitual` is required.'), { code: 'customers.field_required' });
    };
    const el = await montar();
    await (el as unknown as { openDetail(id: string): Promise<void> }).openDetail(CLIENTE.id);
    const wc = el as unknown as { startEdit(): void; saveEdit(e: Event): Promise<void>; editing: boolean; formError: string };
    wc.startEdit();
    await wc.saveEdit(new Event('submit'));
    expect(wc.editing, 'a rejected save keeps the form open to fix it').toBe(true);
    expect(wc.formError).toContain('Falta un campo obligatorio');
    expect(wc.formError).toContain('Tinte habitual');
  });

  // hub#1570: a shell whose SDK indexes this catalogue throws the refusal ALREADY spoken — the
  // module's sentence with `{message}` spliced. The screen paints it once, never with the prefix
  // doubled («Falta un campo obligatorio: Falta un campo obligatorio: …»).
  it('un rechazo que el SDK ya tradujo (hub#1570) se pinta UNA vez, no con el prefijo duplicado', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    const spoken = 'Falta un campo obligatorio: `Tinte habitual` is required.';
    sdk.command = async () => {
      throw Object.assign(new Error(spoken), { code: 'customers.field_required' });
    };
    const el = await montar();
    await (el as unknown as { openDetail(id: string): Promise<void> }).openDetail(CLIENTE.id);
    const wc = el as unknown as { startEdit(): void; saveEdit(e: Event): Promise<void>; formError: string };
    wc.startEdit();
    await wc.saveEdit(new Event('submit'));
    expect(wc.formError).toBe(spoken);
  });
});

describe('el dinero habla céntimos → formatMoney (bug ×100, issue #16)', () => {
  it('total_spent divide céntimos: 12550 → «125.50 €», no «12550.00»', async () => {
    const el = await montar();
    const cols = (el as unknown as { columns: { key: string; format?: (r: unknown) => string }[] }).columns;
    const spent = cols.find((c) => c.key === 'total_spent');
    expect(spent?.format, 'la columna total_spent no tiene formato de dinero').toBeTruthy();
    expect(spent!.format!({ total_spent: 12550 })).toBe('125.50 €');
  });
});

// NOTAS (customers#14). Añadir una nota era DOS commands desde el navegador: `notes.add` y luego
// `activity.add`. Si el segundo fallaba, la nota existía pero desaparecía de la experiencia (la
// ficha solo lee `customers.activities`); y cualquier productor que llamase solo al command de
// dominio (el kernel de automatización lo hizo) escribía una nota invisible. Ahora la proyección
// al timeline la hace el propio command, en su transacción: la UI llama a UNO.
describe('añadir una nota es UN solo command (customers#14)', () => {
  it('addNote llama a customers.notes.add y a nada más', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.query = async (name: string) => (name === 'customers.get' ? [CLIENTE] : []);
    const el = await montar();
    await (el as unknown as { openDetail(id: string): Promise<void> }).openDetail(CLIENTE.id);
    const wc = el as unknown as { newNote: string; addNote(e: Event): Promise<void> };
    wc.newNote = 'Prefiere mesa junto a la ventana';
    await wc.addNote(new Event('submit'));

    expect(comandos.map((c) => c.name)).toEqual(['customers.notes.add']);
    expect(comandos[0].payload.customer_id).toBe(CLIENTE.id);
    expect(comandos[0].payload.content).toBe('Prefiere mesa junto a la ventana');
  });
});

// HOST DE SLOT `customers.detail` (ADR-0043 §3bis; preparación de appointments#46). La ficha de
// cliente expone un punto de extensión para que OTROS módulos cuelguen ahí su bloque (el historial
// de citas de `appointments`) sin que `customers` los conozca: el host resuelve los fillers por
// `erplora.loadSlot('customers.detail')`, los monta y les cuenta QUÉ cliente está abierto por un
// `CustomEvent` (`erp:customer-detail`), nunca por props ni funciones. Aquí solo el host: el
// contenido lo pone quien rellene el slot.
describe('la ficha es HOST del slot customers.detail (ADR-0043)', () => {
  it('resuelve los fillers, los monta en la ficha y les comunica el cliente abierto', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    const slots: string[] = [];
    sdk.loadSlot = async (slot: string) => { slots.push(slot); return [{ component: 'x-appointments-history' }]; };
    sdk.query = async (name: string) => (name === 'customers.get' ? [CLIENTE] : []);
    const recibidos: Record<string, unknown>[] = [];
    document.addEventListener('erp:customer-detail', (e) => recibidos.push((e as CustomEvent).detail));

    const el = await montar();
    await (el as unknown as { openDetail(id: string): Promise<void> }).openDetail(CLIENTE.id);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    expect(slots, 'el host resuelve el slot por su nombre literal').toContain('customers.detail');
    const host = el.shadowRoot.querySelector('.detail-slot');
    expect(host, 'la ficha tiene el contenedor del slot').toBeTruthy();
    const filler = host!.querySelector('x-appointments-history');
    expect(filler, 'el filler se monta dentro del contenedor').toBeTruthy();
    // El filler recibe el cliente por evento en el propio elemento (no burbujea al documento).
    expect(recibidos, 'no burbujea: es un mensaje host→filler').toEqual([]);
    const directos: Record<string, unknown>[] = [];
    filler!.addEventListener('erp:customer-detail', (e) => directos.push((e as CustomEvent).detail));
    await (el as unknown as { openDetail(id: string): Promise<void> }).openDetail(CLIENTE.id);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(directos.at(-1)).toMatchObject({ customer_id: CLIENTE.id, customer_name: CLIENTE.name });
    delete sdk.loadSlot;
  });
});

// IMPORTACIÓN CSV (customers#15). `onCsvImport` recorría las filas en el navegador llamando a
// `customers.create` UNA POR UNA con `catch {}`: las filas inválidas desaparecían sin decir nada y
// una de 500 filas eran 500 commands. El command `customers.bulk_create` (WASM, cap 50, transacción
// por lote) existía y no tenía llamante. Aquí se fija: filas validadas ANTES (nombre obligatorio,
// email con forma), lotes de 50 a `bulk_create`, e INFORME al final (creados / omitidas con motivo /
// lotes fallidos con motivo). Lo «resumible / 10k filas» está aplazado a propósito.
describe('la importación CSV va por customers.bulk_create con informe (customers#15)', () => {
  const filas = (n: number, extra: Record<string, string>[] = []) => [
    ...Array.from({ length: n }, (_, i) => ({ name: `Cliente ${i}`, email: `c${i}@example.com`, phone: '' })),
    ...extra,
  ];

  it('agrupa en lotes de 50 y no llama a customers.create fila a fila', async () => {
    const el = await montar();
    const wc = el as unknown as { onCsvImport(e: CustomEvent): Promise<void>; importReport: { created: number; skipped: unknown[]; failed: unknown[] } | null };
    await wc.onCsvImport(new CustomEvent('csvImport', { detail: { rows: filas(120) } }));
    const bulk = comandos.filter((c) => c.name === 'customers.bulk_create');
    expect(comandos.some((c) => c.name === 'customers.create'), 'nada de create fila a fila').toBe(false);
    expect(bulk.map((c) => (c.payload.items as unknown[]).length)).toEqual([50, 50, 20]);
    expect((bulk[0].payload.items as Record<string, unknown>[])[0]).toMatchObject({ name: 'Cliente 0', email: 'c0@example.com', source: 'import' });
    expect(wc.importReport?.created).toBe(120);
  });

  it('las filas inválidas se OMITEN con motivo y salen en el informe (no se silencian)', async () => {
    const el = await montar();
    const wc = el as unknown as { onCsvImport(e: CustomEvent): Promise<void>; importReport: { created: number; skipped: { row: number; reason: string }[]; failed: unknown[] } | null };
    await wc.onCsvImport(new CustomEvent('csvImport', { detail: { rows: filas(2, [{ name: '', email: 'x@y.z' }, { name: 'Mal email', email: 'no-es-email' }]) } }));
    expect(wc.importReport?.created).toBe(2);
    expect(wc.importReport?.skipped.map((s) => s.row)).toEqual([3, 4]);
    expect(wc.importReport?.skipped[0].reason).toBe('ui.importReasonName');
    expect(wc.importReport?.skipped[1].reason).toBe('ui.importReasonEmail');
    // El informe se PINTA: la persona ve qué se omitió y por qué.
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(el.shadowRoot.querySelector('.import-report'), 'informe visible').toBeTruthy();
  });

  it('un lote que falla se informa con su motivo y los demás siguen', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    let n = 0;
    sdk.command = async (name: string, payload: Record<string, unknown>) => {
      comandos.push({ name, payload });
      if (name === 'customers.bulk_create' && ++n === 2) throw new Error('duplicate tax id');
      return {};
    };
    const el = await montar();
    const wc = el as unknown as { onCsvImport(e: CustomEvent): Promise<void>; importReport: { created: number; skipped: unknown[]; failed: { rows: string; reason: string }[] } | null };
    await wc.onCsvImport(new CustomEvent('csvImport', { detail: { rows: filas(120) } }));
    expect(comandos.filter((c) => c.name === 'customers.bulk_create').length, 'los 3 lotes se intentan').toBe(3);
    expect(wc.importReport?.created).toBe(70);
    expect(wc.importReport?.failed).toEqual([{ rows: '51-100', reason: 'duplicate tax id' }]);
  });

  it('acepta cabeceras en español (Nombre/Email/Teléfono)', async () => {
    const el = await montar();
    const wc = el as unknown as { onCsvImport(e: CustomEvent): Promise<void> };
    await wc.onCsvImport(new CustomEvent('csvImport', { detail: { rows: [{ Nombre: 'Ana', Email: 'ana@example.com', 'Teléfono': '600' }] } }));
    const bulk = comandos.find((c) => c.name === 'customers.bulk_create');
    expect((bulk!.payload.items as Record<string, unknown>[])[0]).toMatchObject({ name: 'Ana', email: 'ana@example.com', phone: '600' });
  });
});

// RGPD (customers#11): borrar el cliente lo deja marcado pero conserva toda su PII. La ficha ofrece,
// SOLO a quien tenga `customers.erase_customer`, «Borrar datos personales» en dos pasos (con motivo)
// que llama a UN command transaccional `customers.anonymize`; nunca al soft-delete.
describe('borrado de datos personales desde la ficha (customers#11)', () => {
  it('con permiso: dos pasos, motivo, y UN command customers.anonymize', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.query = async (name: string) => (name === 'customers.get' ? [CLIENTE] : []);
    const el = await montar();
    await (el as unknown as { openDetail(id: string): Promise<void> }).openDetail(CLIENTE.id);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    const wc = el as unknown as { pendingErase: boolean; eraseReason: string; confirmErase(): Promise<void>; updateComplete: Promise<unknown>; detail: unknown };
    const btn = el.shadowRoot.querySelector<HTMLElement>('.erase');
    expect(btn, 'botón de borrado RGPD en la ficha').toBeTruthy();
    btn!.click();
    await wc.updateComplete;
    expect(wc.pendingErase, 'primer paso: pide confirmación').toBe(true);
    expect(comandos.map((c) => c.name), 'nada se ejecuta al primer toque').toEqual([]);
    wc.eraseReason = 'Solicitud por email';
    await wc.confirmErase();
    expect(comandos.map((c) => c.name)).toEqual(['customers.anonymize']);
    expect(comandos[0].payload).toEqual({ customer_id: CLIENTE.id, reason: 'Solicitud por email' });
    expect(wc.detail, 'la ficha se cierra: ya no hay datos que ver').toBeNull();
  });

  it('sin permiso erase_customer no existe el botón', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.query = async (name: string) => (name === 'customers.get' ? [CLIENTE] : []);
    sdk.hasPermission = (p: string) => p !== 'customers.erase_customer';
    const el = await montar();
    await (el as unknown as { openDetail(id: string): Promise<void> }).openDetail(CLIENTE.id);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(el.shadowRoot.querySelector('.erase')).toBeNull();
  });
});

// ── pm#155 (outfitkit#67, second half) ────────────────────────────────────────────────────────
//
// At 1440 px the «Actions» column fell off the screen with nothing hinting the table went on to
// the right, so the only door into a customer was a button nobody could see. OutfitKit 0.1.44
// pins that column, but the other half of the fix is opt-in: `rowClickable` turns the whole row
// into a door — the first thing a user tries. The component will not switch it on by itself: the
// list has to ask for it, and wire `rowClick` to the same ficha the «view» action opens.
describe('clicking the row opens the customer (pm#155)', () => {
  it('the table declares `rowClickable` → the whole row is a door, not just the action button', async () => {
    const el = await montar();
    expect(
      tabla(el)?.rowClickable,
      'without `rowClickable` the row is dead: if the actions column is off-screen there is no way in',
    ).toBe(true);
  });

  it('`rowClick` opens the ficha of the clicked customer, same as the «view» action', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.query = async (name: string) => (name === 'customers.get' ? [CLIENTE] : name === 'customers.stats' ? [{ total: 1, active: 1, vip: 0, total_revenue: 0 }] : []);
    const el = await montar();
    tabla(el)!.dispatchEvent(new CustomEvent('rowClick', { detail: { row: CLIENTE } }));
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(
      el.shadowRoot.querySelector('.detail-page'),
      'the row was clicked and the ficha did not open',
    ).toBeTruthy();
  });
});
