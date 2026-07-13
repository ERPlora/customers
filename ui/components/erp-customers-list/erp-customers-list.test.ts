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
