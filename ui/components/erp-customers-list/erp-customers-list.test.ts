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
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
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
  el.shadowRoot.querySelector('ok-data-table') as (HTMLElement & { addable: boolean; fill: boolean }) | null;

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
    const wc = el as unknown as { newName: string; newEmail: string };
    wc.newName = 'Ada Lovelace';
    wc.newEmail = 'ada@example.com';

    const form = el.shadowRoot.querySelector('form[slot="create"]') as HTMLFormElement;
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

  it('guardar la ficha PERSISTE los campos personalizados', async () => {
    const el = await montar();
    await (el as unknown as { openDetail(id: string): Promise<void> }).openDetail(CLIENTE.id);
    const wc = el as unknown as {
      startEdit(): void;
      setFieldValue(id: string, v: string): void;
      saveEdit(e: Event): Promise<void>;
    };
    // Como el usuario: pulsar «Editar» es lo que rellena el formulario desde la ficha.
    wc.startEdit();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    wc.setFieldValue('f2', 'Caoba');
    await wc.saveEdit(new Event('submit'));

    // Sin esto, el campo se define y NUNCA se rellena: es el bug que se está arreglando.
    const guardado = comandos.filter((c) => c.name === 'customers._field_value_set');
    expect(guardado.length, 'debe guardar los campos personalizados').toBeGreaterThan(0);
    const caoba = guardado.find((c) => c.payload.field_id === 'f2');
    expect(caoba, 'el campo editado debe persistirse').toBeTruthy();
    expect(caoba!.payload.customer_id).toBe(CLIENTE.id);
    expect(caoba!.payload.value).toBe('Caoba');
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
