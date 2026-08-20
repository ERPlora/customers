// El timeline de Actividad se lee en el idioma del hub y con una fecha de persona (customers#50).
//
// Lo que QA vio en un hub en español:
//
//     Note added (note)
//     Nota QA
//     2026-08-19T15:23:00.255043358+00:00
//
// Tres defectos en tres líneas: el título en inglés, el `activity_type` crudo (la clave interna en
// pantalla) y el ISO del servidor con nanosegundos y desplazamiento UTC. Cualquier CRM —Odoo,
// Shopify, Fresha— pinta ahí la fecha local formateada.
//
// El contrato que fija este fichero:
//   · el título se resuelve por su CLAVE (`activity.note_added`), y los literales que ya están
//     escritos en la base («Note added») se siguen traduciendo, sin migración;
//   · el tipo se pinta con su etiqueta traducida, no con el enum;
//   · la fecha pasa por `Intl` con la locale del hub, y NUNCA queda un ISO crudo en pantalla —
//     tampoco en el historial de consentimiento, que es el otro timeline de esta misma ficha.
import { beforeEach, describe, expect, it } from 'vitest';

const CLIENTE = {
  id: 'c1', name: 'Ada Lovelace', email: 'ada@example.com', phone: '600000000', tax_id: '',
  address: '', city: '', postal_code: '', country: '', notes: '', is_active: 1,
  lifecycle_stage: 'lead', source: 'walk_in', company_name: '', birthday: null, anniversary: null,
  preferred_channel: 'none', marketing_consent: 0, consent_date: null, total_purchases: 0,
  total_spent: 0, last_purchase_date: null,
};

const ISO = '2026-08-19T15:23:00.255043358+00:00';

const ACTIVIDADES = [
  { id: 'a1', activity_type: 'note', title: 'activity.note_added', description: 'Nota QA', created_at: ISO },
  // Una fila ANTIGUA, escrita antes de customers#50: sigue teniendo la frase inglesa en la columna.
  { id: 'a2', activity_type: 'note', title: 'Note added', description: 'Nota vieja', created_at: ISO },
  // Y una de otro productor, que no es de este módulo: su texto es suyo y se respeta.
  { id: 'a3', activity_type: 'appointment', title: 'Cita atendida', description: '', created_at: ISO },
];

const CONSENT_STATE = [{
  purpose: 'marketing', channel: 'email', state: 'granted', contact_point: 'ada@example.com',
  source: 'counter', notice_version: 'counter-v1', occurred_at: ISO, recorded_by: 'admin', evidence: '',
}];

const CONSENT_HISTORY = [{
  ...CONSENT_STATE[0], id: 'f1', notice_text: 'Le informamos…', reason: '', created_at: ISO,
}];

/** El catálogo real, reducido a lo que mira este fichero: `t` resuelve la clave o la devuelve. */
const ES: Record<string, string> = {
  'ui.activityNoteAdded': 'Nota añadida',
  'ui.activityTypeNote': 'Nota',
  'ui.consentGranted': 'Dado',
  'ui.channelEmail': 'Email',
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'customers.stats') return [{ total: 1, active: 1, vip: 0, total_revenue: 0 }];
      if (name === 'customers.get') return [CLIENTE];
      if (name === 'customers.activities') return ACTIVIDADES;
      if (name === 'customers.consent.state') return CONSENT_STATE;
      if (name === 'customers.consent.history') return CONSENT_HISTORY;
      return [];
    },
    queryPage: async () => ({ rows: [CLIENTE], total: 1 }),
    queryAll: async () => [],
    command: async () => ({}),
    hasPermission: () => true,
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => ES[key] ?? key,
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
  };
});

async function abrirFicha() {
  await import('./erp-customers-list');
  const el = document.createElement('erp-customers-list') as HTMLElement & { shadowRoot: ShadowRoot };
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { openDetail(id: string): Promise<void> }).openDetail(CLIENTE.id);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el;
}

const texto = (el: HTMLElement & { shadowRoot: ShadowRoot }) => el.shadowRoot.textContent ?? '';

describe('el timeline de Actividad se lee en español (customers#50)', () => {
  it('no queda NI UNA fecha ISO cruda en la ficha', async () => {
    const el = await abrirFicha();
    expect(texto(el), 'el ISO del servidor no es una fecha para una persona').not.toContain(ISO);
    expect(texto(el)).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  });

  it('la fecha se formatea con la locale del hub', async () => {
    const el = await abrirFicha();
    const esperada = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' })
      .format(new Date('2026-08-19T15:23:00.255Z'));
    expect(texto(el)).toContain(esperada);
  });

  it('el título viaja por su clave y se pinta traducido', async () => {
    const el = await abrirFicha();
    expect(texto(el)).toContain('Nota añadida');
    expect(texto(el), 'la clave interna no se enseña').not.toContain('activity.note_added');
  });

  it('una fila ANTIGUA con la frase inglesa también se traduce (sin migración)', async () => {
    const el = await abrirFicha();
    expect(texto(el), '«Note added» ya escrito en la base sigue siendo inglés en pantalla').not.toContain('Note added');
  });

  it('el título de otro productor se respeta tal cual', async () => {
    const el = await abrirFicha();
    expect(texto(el)).toContain('Cita atendida');
  });

  it('el activity_type se pinta con su etiqueta, no con el enum', async () => {
    const el = await abrirFicha();
    expect(texto(el)).toContain('Nota');
    expect(texto(el), 'el enum interno no es una etiqueta').not.toContain('(note)');
  });
});
