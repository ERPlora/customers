// El consentimiento de marketing, en la ficha (customers#10).
//
// La casilla «Consentimiento de marketing» del formulario de edición era el sitio donde se fabricaba
// un consentimiento: un clic, sin finalidad, sin canal, sin qué se le enseñó a la persona y sin
// quién lo apuntó — y guardaba un booleano que ni siquiera mantenía su fecha. Este fichero fija que
// esa casilla ya NO existe y que en su lugar hay una decisión explícita por canal, con la frase que
// se muestra viajando como evidencia, y el historial completo a la vista.
//
// La regla que más importa aquí es la de la casilla: el RGPD invalida el consentimiento premarcado
// (EDPB 05/2020 §168, AEPD FAQ-0211), así que la pantalla no puede tener ninguna casilla de
// consentimiento — ni marcada ni sin marcar. Lo que hay es un botón que se pulsa.
import { beforeEach, describe, expect, it } from 'vitest';

const CLIENTE = {
  id: 'c1', name: 'Ada Lovelace', email: 'ada@example.com', phone: '600000000', tax_id: '',
  address: '', city: '', postal_code: '', country: '', notes: '', is_active: 1,
  lifecycle_stage: 'lead', source: 'walk_in', company_name: '', birthday: null, anniversary: null,
  preferred_channel: 'none', marketing_consent: 0, consent_date: null, total_purchases: 0,
  total_spent: 0, last_purchase_date: null,
};

const comandos: { name: string; payload: Record<string, unknown> }[] = [];
let estado: Record<string, unknown>[] = [];
let historial: Record<string, unknown>[] = [];

beforeEach(() => {
  comandos.length = 0;
  estado = [];
  historial = [];
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'customers.stats') return [{ total: 1, active: 1, vip: 0, total_revenue: 0 }];
      if (name === 'customers.get') return [CLIENTE];
      if (name === 'customers.consent.state') return estado;
      if (name === 'customers.consent.history') return historial;
      return [];
    },
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
  };
});

async function abrirFicha() {
  await import('./erp-customers-list');
  const el = document.createElement('erp-customers-list') as HTMLElement & {
    shadowRoot: ShadowRoot;
    updateComplete: Promise<unknown>;
    openDetail(id: string): Promise<void>;
  };
  document.body.appendChild(el);
  await el.updateComplete;
  await el.openDetail(CLIENTE.id);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

type Ficha = Awaited<ReturnType<typeof abrirFicha>>;

async function pulsar(el: Ficha, sel: string) {
  const boton = el.shadowRoot.querySelector(sel);
  expect(boton, `no está en pantalla: ${sel}`).toBeTruthy();
  boton!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
}

const texto = (el: Ficha) => el.shadowRoot.textContent ?? '';

describe('el consentimiento ya no es una casilla de la ficha', () => {
  it('el formulario de edición NO tiene casilla de consentimiento', async () => {
    // Ni marcada ni sin marcar: una casilla ahí significa «esto se decide editando la ficha», que
    // es justo lo que no se puede demostrar. La decisión vive en su propio panel, con su evidencia.
    const el = await abrirFicha();
    await pulsar(el, '.detail-page header ion-button:nth-of-type(2)');

    const etiquetas = [...el.shadowRoot.querySelectorAll('label.check')].map((n) => n.textContent ?? '');
    expect(
      etiquetas.some((t) => t.includes('ui.marketingConsent')),
      'la casilla de consentimiento sigue en el formulario',
    ).toBe(false);
  });

  it('la ficha pide el estado y el historial del ledger, no el booleano', async () => {
    const el = await abrirFicha();
    expect(texto(el)).toContain('ui.consentHeading');
    // Los tres canales por los que este hub puede llegar a alguien salen siempre, tenga fila o no:
    // «nunca se le ha preguntado» es un estado, y esconderlo es cómo se acaba escribiendo a quien
    // no dijo nada.
    expect(el.shadowRoot.querySelector('[data-consent="email"]')).toBeTruthy();
    expect(el.shadowRoot.querySelector('[data-consent="whatsapp"]')).toBeTruthy();
    expect(el.shadowRoot.querySelector('[data-consent="sms"]')).toBeTruthy();
  });

  it('registrar el consentimiento manda la FRASE que se enseñó, el canal y la dirección', async () => {
    const el = await abrirFicha();
    await pulsar(el, '[data-consent="email"] [data-act="grant"]');
    // Un paso de confirmación que enseña, literalmente, lo que se va a guardar como prueba.
    expect(texto(el)).toContain('ui.consentNotice');
    await pulsar(el, '[data-act="grant-confirm"]');

    const llamada = comandos.find((c) => c.name === 'customers.consent.grant');
    expect(llamada, 'no se llamó a customers.consent.grant').toBeTruthy();
    expect(llamada!.payload.channel).toBe('email');
    expect(llamada!.payload.purpose).toBe('marketing');
    expect(llamada!.payload.source).toBe('counter');
    // La dirección concreta para la que se dio: un email corregido la semana que viene no queda
    // cubierto por el consentimiento que se dio para el anterior.
    expect(llamada!.payload.contact_point).toBe('ada@example.com');
    expect(String(llamada!.payload.notice_text), 'la prueba viaja vacía').not.toHaveLength(0);
    expect(llamada!.payload.notice_version).toBeTruthy();
  });

  it('retirar es un gesto de un toque, y no exige explicar por qué', async () => {
    estado = [{ purpose: 'marketing', channel: 'email', state: 'granted', contact_point: 'ada@example.com', source: 'counter', notice_version: 'counter-v1', occurred_at: '2026-08-01T10:00:00+00:00', recorded_by: 'u1', evidence: '' }];
    const el = await abrirFicha();

    await pulsar(el, '[data-consent="email"] [data-act="withdraw"]');

    const llamada = comandos.find((c) => c.name === 'customers.consent.withdraw');
    expect(llamada, 'no se llamó a customers.consent.withdraw').toBeTruthy();
    expect(llamada!.payload.channel).toBe('email');
    // Sin diálogo intermedio y sin motivo obligatorio: darse de baja tiene que ser al menos tan
    // fácil como darse de alta (art. 7.3), y un formulario que exige justificarse es el patrón
    // oscuro contra el que se escribió ese artículo.
    expect(llamada!.payload.reason ?? '').toBe('');
  });

  it('un consentimiento heredado NO se enseña como un sí', async () => {
    // La casilla que alguien marcó antes de que existiera el ledger no prueba nada: EDPB 05/2020
    // §168 dice que un consentimiento presunto sin registros está por debajo del estándar y hay
    // que renovarlo. La pantalla tiene que decir eso, no «Sí».
    estado = [{ purpose: 'marketing', channel: 'any', state: 'legacy_unverified', contact_point: '', source: 'legacy_boolean', notice_version: '', occurred_at: '2024-01-05T09:00:00+00:00', recorded_by: '', evidence: '' }];
    const el = await abrirFicha();

    expect(texto(el)).toContain('ui.consentLegacy');
    expect(texto(el)).not.toContain('ui.consentGranted');
  });

  it('el historial enseña cada hecho, incluida la retirada', async () => {
    historial = [
      { id: 'f2', purpose: 'marketing', channel: 'email', state: 'withdrawn', source: 'phone', notice_text: '', notice_version: '', evidence: '', reason: 'lo pidió', recorded_by: 'u1', occurred_at: '2026-08-10T10:00:00+00:00', created_at: '2026-08-10T10:00:00+00:00' },
      { id: 'f1', purpose: 'marketing', channel: 'email', state: 'granted', source: 'counter', notice_text: 'Quiero recibir ofertas', notice_version: 'counter-v1', evidence: '', reason: '', recorded_by: 'u1', occurred_at: '2026-08-01T10:00:00+00:00', created_at: '2026-08-01T10:00:00+00:00' },
    ];
    const el = await abrirFicha();

    expect(el.shadowRoot.querySelectorAll('[data-consent-fact]')).toHaveLength(2);
    // La frase que se le enseñó es la prueba: si no está en pantalla, no está en ninguna parte
    // donde alguien la vaya a leer.
    expect(texto(el)).toContain('Quiero recibir ofertas');
  });

  it('sin permiso de edición se LEE el consentimiento pero no se toca', async () => {
    (globalThis as Record<string, unknown>).erplora = {
      ...((globalThis as Record<string, unknown>).erplora as Record<string, unknown>),
      hasPermission: (p: string) => p !== 'customers.change_customer',
    };
    const el = await abrirFicha();

    expect(texto(el)).toContain('ui.consentHeading');
    expect(el.shadowRoot.querySelector('[data-act="grant"]'), 'un lector puede otorgar').toBeNull();
    expect(el.shadowRoot.querySelector('[data-act="withdraw"]'), 'un lector puede retirar').toBeNull();
  });
});
