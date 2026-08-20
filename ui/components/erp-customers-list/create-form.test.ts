// El alta de un cliente se completa EN UN SOLO PASO (customers#51).
//
// El panel «Añadir» pedía dos campos —Nombre y Email— porque heredaba la forma de la TABLA, no la
// del recurso: `ok-data-table` pinta su panel de alta a partir de las columnas. Para guardar el
// teléfono o el NIF/CIF —lo primero que pide un negocio español, porque sin NIF no hay factura—
// había que guardar a medias, volver al listado, Ver, Editar, rellenar y Guardar. Cinco pasos de
// más para un dato del alta, y el teléfono ES una columna del listado: se veía una columna que el
// alta no dejaba rellenar.
//
// El reparto que fija este fichero sale del mercado (8/8 referencias, tabla en la PR):
//
//   · SIEMPRE a la vista: Nombre · Teléfono · Email · NIF/CIF · Empresa.
//   · Tras «Más datos», plegado: dirección, fechas, origen, etapa, canal, notas.
//   · OBLIGATORIO: sólo el Nombre.
//
// Ese último punto es el contrato de customers#32 y no se toca: el alta de mostrador («walk-in»)
// es un gesto de dos segundos —nombre y a cobrar—. Lo que faltaba no era exigir más campos, era
// que los demás ESTUVIERAN DISPONIBLES. Un ultramarinos vende sin NIF; un asesor no.
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
    queryAll: async () => [],
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

async function montar() {
  await import('./erp-customers-list');
  const el = document.createElement('erp-customers-list');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

const panel = (el: HTMLElement & { shadowRoot: ShadowRoot }) =>
  el.shadowRoot.querySelector('form[slot="create"]') as HTMLFormElement;

/** Los campos que el alta ofrece, por el `data-field` con que se declaran. */
const campos = (root: ParentNode): string[] =>
  [...root.querySelectorAll('[data-sheet-field]')].map((n) => n.getAttribute('data-sheet-field') ?? '');

/** Lo que está a la vista sin desplegar nada. */
const visibles = (form: HTMLFormElement): string[] =>
  campos(form).filter((k) => !form.querySelector(`details [data-sheet-field="${k}"]`));

const plegados = (form: HTMLFormElement): string[] =>
  [...form.querySelectorAll('details [data-sheet-field]')].map((n) => n.getAttribute('data-sheet-field') ?? '');

async function escribir(el: HTMLElement & { shadowRoot: ShadowRoot }, key: string, value: string) {
  const input = panel(el).querySelector(`[data-sheet-field="${key}"]`) as HTMLInputElement;
  expect(input, `el alta no ofrece el campo \`${key}\``).toBeTruthy();
  input.value = value;
  input.dispatchEvent(new CustomEvent('ionInput', { bubbles: true }));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
}

describe('el alta ofrece los datos de contacto y fiscales (customers#51)', () => {
  it('los esenciales están a la vista, sin desplegar nada', async () => {
    const el = await montar();
    expect(visibles(panel(el))).toEqual(['name', 'phone', 'email', 'tax_id', 'company_name']);
  });

  it('el resto vive tras «Más datos», y arranca PLEGADO', async () => {
    const el = await montar();
    const mas = panel(el).querySelector('details') as HTMLDetailsElement;
    expect(mas, 'no hay sección «Más datos»').toBeTruthy();
    expect(mas.open, 'el alta no puede abrir como un muro de 17 campos').toBe(false);
    expect(plegados(panel(el))).toEqual([
      'address', 'city', 'postal_code', 'country', 'birthday', 'anniversary',
      'source', 'lifecycle_stage', 'preferred_channel', 'notes',
    ]);
  });

  it('teléfono y NIF llegan a `customers.create` en UNA pasada, sin reabrir la ficha', async () => {
    const el = await montar();
    await escribir(el, 'name', 'Pedro QA UI');
    await escribir(el, 'phone', '611223344');
    await escribir(el, 'tax_id', 'B27593136');
    await escribir(el, 'email', 'pedro@example.com');
    await (el as unknown as { create(e: Event): Promise<void> }).create(new Event('submit'));

    expect(comandos.map((c) => c.name), 'el alta es UN command: nada de create + update').toEqual(['customers.create']);
    expect(comandos[0].payload).toMatchObject({
      name: 'Pedro QA UI', phone: '611223344', tax_id: 'B27593136', email: 'pedro@example.com',
    });
  });

  it('lo escrito en «Más datos» viaja igual', async () => {
    const el = await montar();
    await escribir(el, 'name', 'Ada');
    await escribir(el, 'city', 'Madrid');
    await escribir(el, 'notes', 'Alérgica a los frutos secos');
    await (el as unknown as { create(e: Event): Promise<void> }).create(new Event('submit'));

    expect(comandos[0].payload).toMatchObject({ city: 'Madrid', notes: 'Alérgica a los frutos secos' });
  });
});

describe('el walk-in de mostrador sigue siendo un nombre (customers#32)', () => {
  it('con SÓLO el nombre se guarda', async () => {
    const el = await montar();
    await escribir(el, 'name', 'Walk-in Ana');
    await (el as unknown as { create(e: Event): Promise<void> }).create(new Event('submit'));

    expect(comandos.map((c) => c.name)).toEqual(['customers.create']);
    expect(comandos[0].payload.name).toBe('Walk-in Ana');
  });

  it('ningún campo salvo el nombre se marca obligatorio', async () => {
    const el = await montar();
    const obligatorios = [...panel(el).querySelectorAll('[data-sheet-field][required]')].map((n) => n.getAttribute('data-sheet-field'));
    expect(obligatorios, 'exigir más que el nombre rompe el alta de dos segundos').toEqual([]);
  });

  it('sin nombre no se envía nada', async () => {
    const el = await montar();
    await escribir(el, 'phone', '611223344');
    await (el as unknown as { create(e: Event): Promise<void> }).create(new Event('submit'));

    expect(comandos, 'el nombre es lo único que el schema exige').toEqual([]);
  });
});

describe('el alta NO pide consentimiento (customers#10)', () => {
  it('no hay ninguna casilla de marketing en el panel', async () => {
    const el = await montar();
    expect(campos(panel(el))).not.toContain('marketing_consent');
    expect(panel(el).querySelectorAll('ion-checkbox').length, 'una casilla en el alta es un consentimiento falso').toBe(0);
  });

  it('y el payload no lleva consentimiento', async () => {
    const el = await montar();
    await escribir(el, 'name', 'Ada');
    await (el as unknown as { create(e: Event): Promise<void> }).create(new Event('submit'));

    expect(Object.keys(comandos[0].payload)).not.toContain('marketing_consent');
    expect(Object.keys(comandos[0].payload)).not.toContain('consent_date');
  });
});
