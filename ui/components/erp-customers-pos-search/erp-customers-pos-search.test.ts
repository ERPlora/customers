// Contrato del selector de CLIENTE del TPV (slot `sales.pos.assign`, ADR-0043 B).
//
// El CHROME del buscador lo aporta `ok-spotlight-search` (OutfitKit) — su comportamiento se testea
// en su propio repo. AQUÍ se fija el contrato PROPIO de este WC: carga clientes al abrir, y al elegir
// uno emite `erp:customer-context` con el SNAPSHOT FISCAL (ADR-0132) — sin `customer_tax_id`/
// `customer_address` la factura del TPV saldría sin NIF ni dirección. Se mockea el ok-spotlight-search
// (evita su cadena de iconos y deja los resultados proyectados como hijos consultables).
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@erplora/outfitkit/ok-spotlight-search', () => ({}));

import es from '../../../locales/es.json' with { type: 'json' };
const esErrors = (es as { errors: Record<string, string> }).errors;

const ANA = { id: 'cus-1', name: 'Ana García', phone: '600111222', email: 'ana@example.com' };
const ANA_FICHA = { ...ANA, tax_id: '12345678Z', address: 'Calle Mayor 1', city: 'Madrid', postal_code: '28013', country: 'ES' };

const consultas: { name: string; params?: Record<string, unknown> }[] = [];

beforeEach(() => {
  consultas.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string, params?: Record<string, unknown>) => {
      consultas.push({ name, params });
      if (name === 'customers.get') return [ANA_FICHA];
      if (name === 'customers.list') return [ANA];
      return [];
    },
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

async function montar() {
  await import('./erp-customers-pos-search');
  const el = document.createElement('erp-customers-pos-search');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

/** Simula que el ok-spotlight-search se abre (emite ok-open{true}) → el WC carga los clientes. */
async function abrir(el: HTMLElement & { shadowRoot: ShadowRoot }) {
  const sp = el.shadowRoot.querySelector('ok-spotlight-search')!;
  sp.dispatchEvent(new CustomEvent('ok-open', { detail: { open: true } }));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
}

describe('erp-customers-pos-search', () => {
  it('delega el chrome en ok-spotlight-search, con trigger de cliente', async () => {
    const el = await montar();
    const sp = el.shadowRoot.querySelector('ok-spotlight-search');
    expect(sp, 'usa el ok-spotlight-search de OutfitKit').toBeTruthy();
    expect(sp!.getAttribute('trigger-icon'), 'trigger de cliente sin asignar').toBe('person-add-outline');
  });

  it('al abrir carga clientes y los proyecta como lista Ionic', async () => {
    const el = await montar();
    await abrir(el);
    expect(consultas.some((c) => c.name === 'customers.list'), 'busca al abrir').toBe(true);
    expect(el.shadowRoot.querySelectorAll('ion-item').length, 'lista Ionic de clientes').toBe(1);
  });

  it('al elegir cliente emite el snapshot FISCAL, no solo el nombre', async () => {
    const el = await montar();
    const emitidos: Record<string, unknown>[] = [];
    el.addEventListener('erp:customer-context', (e) => emitidos.push((e as CustomEvent).detail));

    await abrir(el);
    el.shadowRoot.querySelector<HTMLElement>('ion-item')!.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(consultas.some((c) => c.name === 'customers.get')).toBe(true);
    expect(emitidos[0]).toEqual({
      customer_id: 'cus-1',
      customer_name: 'Ana García',
      customer_tax_id: '12345678Z',
      // customers#72: the file stores the ISO code now; the printed address reads the country name.
      customer_address: 'Calle Mayor 1, 28013 Madrid, España',
      customer_country: 'ES',
    });
  });

  // customers#71 — `sales` reads the invoice country from `customer_country` (sales#332); without
  // it a foreign customer's invoice came out as Spain. The file keeps the country as free text.
  it('al elegir un cliente extranjero emite su país como código ISO', async () => {
    (globalThis as Record<string, unknown> & { erplora: Record<string, unknown> }).erplora.query =
      async (name: string) => {
        if (name === 'customers.get') return [{ ...ANA_FICHA, tax_id: 'FR40303265045', country: 'Francia' }];
        if (name === 'customers.list') return [ANA];
        return [];
      };
    const el = await montar();
    const emitidos: Record<string, unknown>[] = [];
    el.addEventListener('erp:customer-context', (e) => emitidos.push((e as CustomEvent).detail));

    await abrir(el);
    el.shadowRoot.querySelector<HTMLElement>('ion-item')!.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(emitidos[0]).toMatchObject({ customer_tax_id: 'FR40303265045', customer_country: 'FR' });
  });

  it("lee el país escrito en el idioma del usuario", async () => {
    const sdk = (globalThis as Record<string, unknown> & { erplora: Record<string, unknown> }).erplora;
    sdk.locale = 'de';
    sdk.query = async (name: string) => {
      if (name === 'customers.get') return [{ ...ANA_FICHA, country: 'Deutschland' }];
      if (name === 'customers.list') return [ANA];
      return [];
    };
    const el = await montar();
    const emitidos: Record<string, unknown>[] = [];
    el.addEventListener('erp:customer-context', (e) => emitidos.push((e as CustomEvent).detail));

    await abrir(el);
    el.shadowRoot.querySelector<HTMLElement>('ion-item')!.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(emitidos[0]).toMatchObject({ customer_country: 'DE' });
  });

  it('al quitar el cliente vacía también el snapshot fiscal', async () => {
    const el = await montar();
    const emitidos: Record<string, unknown>[] = [];
    el.addEventListener('erp:customer-context', (e) => emitidos.push((e as CustomEvent).detail));

    await abrir(el);
    el.shadowRoot.querySelector<HTMLElement>('ion-item')!.click();
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    // Con cliente elegido aparece "Quitar cliente" en el slot footer.
    el.shadowRoot.querySelector<HTMLElement>('.clear')!.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(emitidos.at(-1)).toEqual({
      customer_id: null, customer_name: '', customer_tax_id: '', customer_address: '', customer_country: '',
    });
  });
});

// customers#18 — the selector must never DEGRADE SILENTLY. Two `.catch(() => [])` turned "Customers
// is down" and "no permission" into "no matches", and a failed `customers.get` let the sale go on
// with a customer WITHOUT fiscal snapshot. Market (Square, Toast, Lightspeed, Shopify POS, Fresha):
// visible error with retry, and «+ new customer» inline from the search itself (name/phone).
describe('estados diferenciados y alta rápida (customers#18)', () => {
  type WC = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> } & Record<string, unknown>;
  const flush = async (el: WC) => { await el.updateComplete; await new Promise((r) => setTimeout(r, 0)); await el.updateComplete; };
  const sdk = () => (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;

  it('un 500 en la búsqueda muestra ERROR con reintento (no «sin resultados»)', async () => {
    sdk().query = async (name: string) => { if (name === 'customers.list') throw new Error('boom'); return []; };
    const el = (await montar()) as WC;
    await abrir(el);
    expect(el.state, 'estado error, no empty').toBe('error');
    expect(el.shadowRoot.querySelector('ok-empty-state'), 'no se pinta "sin resultados"').toBeNull();
    expect(el.shadowRoot.querySelector('ok-inline-feedback[tone="danger"]'), 'error visible').toBeTruthy();
    expect(el.shadowRoot.querySelector('.retry'), 'botón de reintento').toBeTruthy();
  });

  it('un permission_denied muestra FALTA DE PERMISO, sin reintento', async () => {
    sdk().query = async (name: string) => {
      if (name === 'customers.list') throw Object.assign(new Error('nope'), { code: 'permission_denied' });
      return [];
    };
    const el = (await montar()) as WC;
    await abrir(el);
    expect(el.state).toBe('forbidden');
    expect(el.shadowRoot.querySelector('.retry')).toBeNull();
  });

  it('reintentar conserva el término y una respuesta VIEJA no pisa a la nueva', async () => {
    let calls = 0;
    const gates: Array<() => void> = [];
    sdk().query = async (name: string, params?: Record<string, unknown>) => {
      if (name !== 'customers.list') return [];
      calls += 1;
      const term = String(params?.search ?? '');
      await new Promise<void>((r) => gates.push(r));
      return [{ id: `c-${term}`, name: `Result for ${term}` }];
    };
    const el = (await montar()) as WC;
    await abrir(el); // 1st call, term ''
    (el.onInput as (v: string) => void)('an');
    await new Promise((r) => setTimeout(r, 350)); // debounce → 2nd call, term 'an'
    expect(calls).toBe(2);
    gates[1](); await flush(el); // newest resolves first
    gates[0](); await flush(el); // stale resolves last
    const items = [...el.shadowRoot.querySelectorAll('ion-item h3')].map((n) => n.textContent);
    expect(items, 'the stale answer must not overwrite the newest').toEqual(['Result for an']);
    expect(el.q).toBe('an');
  });

  it('a phone typed with spaces is searched as digits, which the E.164 card contains (customers#121)', async () => {
    const el = (await montar()) as WC;
    await abrir(el);
    (el.onInput as (v: string) => void)('0034 600 111 222');
    await new Promise((r) => setTimeout(r, 350));
    const last = consultas.filter((c) => c.name === 'customers.list').at(-1);
    expect(last?.params?.search).toBe('34600111222');
    expect(el.q, 'the box keeps what was typed').toBe('0034 600 111 222');
  });

  it('si customers.get falla NO se emite selección: error visible, la venta no sigue sin snapshot', async () => {
    sdk().query = async (name: string) => {
      if (name === 'customers.get') throw new Error('down');
      if (name === 'customers.list') return [ANA];
      return [];
    };
    const el = (await montar()) as WC;
    const emitidos: unknown[] = [];
    el.addEventListener('erp:customer-context', (e) => emitidos.push((e as CustomEvent).detail));
    await abrir(el);
    el.shadowRoot.querySelector<HTMLElement>('ion-item')!.click();
    await flush(el);
    expect(emitidos, 'nothing emitted without the fiscal snapshot').toEqual([]);
    expect(el.selectedId, 'no customer stays selected').toBeUndefined();
    expect(el.shadowRoot.querySelector('ok-inline-feedback[tone="danger"]')).toBeTruthy();
  });

  it('alta rápida desde el buscador: nombre/teléfono → customers.create → selección con snapshot', async () => {
    const comandos: { name: string; payload: Record<string, unknown> }[] = [];
    sdk().hasPermission = () => true;
    sdk().command = async (name: string, payload: Record<string, unknown>) => {
      comandos.push({ name, payload });
      return { ok: true, new_ids: ['cus-new'] };
    };
    sdk().query = async (name: string, params?: Record<string, unknown>) => {
      if (name === 'customers.list') return [];
      if (name === 'customers.get') return [{ id: params?.customer_id, name: 'Luis', phone: '600', tax_id: '', address: '', city: '', postal_code: '', country: '' }];
      return [];
    };
    const el = (await montar()) as WC;
    const emitidos: Record<string, unknown>[] = [];
    el.addEventListener('erp:customer-context', (e) => emitidos.push((e as CustomEvent).detail));
    await abrir(el);
    (el.onInput as (v: string) => void)('Luis');
    await new Promise((r) => setTimeout(r, 350));
    await flush(el);
    const add = el.shadowRoot.querySelector<HTMLElement>('.quick-add');
    expect(add, '«+ new customer» inline when the search has a term').toBeTruthy();
    add!.click();
    await flush(el);
    (el.quickPhone = '600');
    await (el.quickCreate as () => Promise<void>)();
    await flush(el);
    expect(comandos.map((c) => c.name)).toEqual(['customers.create']);
    expect(comandos[0].payload).toMatchObject({ name: 'Luis', phone: '600' });
    expect(emitidos.at(-1)).toMatchObject({ customer_id: 'cus-new', customer_name: 'Luis' });
  });

  // customers#121: phones are stored in E.164 now (`+34600111222`), so comparing the typed text with
  // the rows on screen no longer finds the card the cashier is about to duplicate. The number is
  // asked to the server, which compares it as a NUMBER of the business's country (F10).
  it('quick add picks the card that already carries that number, however it is typed (customers#121)', async () => {
    const comandos: string[] = [];
    const byPhone: unknown[] = [];
    sdk().hasPermission = () => true;
    sdk().command = async (name: string) => { comandos.push(name); return { ok: true, new_ids: ['cus-new'] }; };
    sdk().query = async (name: string, params?: Record<string, unknown>) => {
      if (name === 'customers.list') return [];
      if (name === 'customers.by_phone') { byPhone.push(params?.phone); return [{ id: 'cus-1', name: 'Ana García', phone: '+34600111222' }]; }
      if (name === 'customers.get') return [{ ...ANA_FICHA, phone: '+34600111222' }];
      return [];
    };
    const el = (await montar()) as WC;
    const emitidos: Record<string, unknown>[] = [];
    el.addEventListener('erp:customer-context', (e) => emitidos.push((e as CustomEvent).detail));
    await abrir(el);
    el.quickName = 'Ana';
    el.quickPhone = '600 111 222';
    await (el.quickCreate as () => Promise<void>)();
    await flush(el);
    expect(byPhone).toEqual(['600 111 222']);
    expect(comandos, 'no second card for the same number').toEqual([]);
    expect(emitidos.at(-1)).toMatchObject({ customer_id: 'cus-1' });
  });

  it('a phone the server refuses is explained with the module sentence and the form stays open (customers#121)', async () => {
    sdk().hasPermission = () => true;
    sdk().command = async () => { throw Object.assign(new Error('That is not a phone number of its country'), { code: 'customers.phone_invalid' }); };
    sdk().query = async () => [];
    const el = (await montar()) as WC;
    await abrir(el);
    el.quickOpen = true;
    el.quickName = 'Luis';
    el.quickPhone = '600111';
    await (el.quickCreate as () => Promise<void>)();
    await flush(el);
    expect(el.quickError).toBe(esErrors['customers.phone_invalid']);
    expect(el.quickOpen, 'the typed data is kept on screen').toBe(true);
    expect(el.quickPhone).toBe('600111');
  });

  it('sin permiso de alta no hay alta rápida', async () => {
    sdk().hasPermission = (p: string) => p !== 'customers.add_customer';
    const el = (await montar()) as WC;
    await abrir(el);
    (el.onInput as (v: string) => void)('Luis');
    await new Promise((r) => setTimeout(r, 350));
    await flush(el);
    expect(el.shadowRoot.querySelector('.quick-add')).toBeNull();
  });
});

// customers#59 — the junction write (`customers.orders.link`, ADR-0141) is swallowed ON PURPOSE:
// the sale is what matters and an operational link must never break a charge. Swallowing it in
// SILENCE is the bug. Nobody found out the customer's history stayed empty hub after hub, because a
// failure that leaves no trace does not exist. It is now said out loud, translated (the escalator of
// cash_register#38: a domain code the module owns → its own phrase; anything else → the module's
// generic one, never the server's raw `Display`, tables#55) and logged for the runtime.
describe('el enlace cliente↔pedido nunca falla en SILENCIO (customers#59)', () => {
  type WC = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> } & Record<string, unknown>;
  const flush = async (el: WC) => { await el.updateComplete; await new Promise((r) => setTimeout(r, 0)); await el.updateComplete; };
  const sdk = () => (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;

  /** Deja un cliente elegido y lanza el `erp:order-linked` que dispara la escritura de la junction. */
  async function elegirYEnlazar(el: WC) {
    await abrir(el);
    el.shadowRoot.querySelector<HTMLElement>('ion-item')!.click();
    await flush(el);
    el.dispatchEvent(new CustomEvent('erp:order-linked', { detail: { order_id: 'ord-1' } }));
    await flush(el);
  }

  it('un 403 al enlazar avisa al TPV con su clave traducida y NO rompe la venta', async () => {
    const avisos: { type: string; message: string }[] = [];
    sdk().notify = (n: { type: string; message: string }) => avisos.push(n);
    sdk().command = async () => { throw Object.assign(new Error('nope'), { code: 'permission_denied' }); };

    const el = (await montar()) as WC;
    await elegirYEnlazar(el);

    expect(avisos, 'el cajero se entera de que el cliente no quedó en el pedido').toEqual([
      { type: 'warning', message: 'ui.errLinkOrderNoPermission' },
    ]);
    expect(el.selectedId, 'la venta sigue con su cliente: el enlace es operativo, no el cobro').toBe('cus-1');
  });

  it('cualquier otro fallo avisa con la frase genérica del módulo, no con el texto del servidor', async () => {
    const avisos: { type: string; message: string }[] = [];
    sdk().notify = (n: { type: string; message: string }) => avisos.push(n);
    sdk().command = async () => { throw new Error('db: sqlx: violates check constraint at line 2076'); };

    const el = (await montar()) as WC;
    await elegirYEnlazar(el);

    expect(avisos).toEqual([{ type: 'warning', message: 'ui.errLinkOrder' }]);
  });

  it('cuando el enlace sale bien no molesta a nadie', async () => {
    const avisos: unknown[] = [];
    sdk().notify = (n: unknown) => avisos.push(n);
    sdk().command = async () => ({ ok: true });

    const el = (await montar()) as WC;
    await elegirYEnlazar(el);

    expect(avisos, 'sin aviso: el enlace se escribió').toEqual([]);
  });
});

// customers#77: a Lit `class=${…}` binding on the row rewrites the WHOLE attribute each time the
// selection changes and wipes the classes Ionic stamped on the host. Stencil only re-adds what its own
// render changes, so `ion-activatable` (what tap-click looks for to paint the press) and
// `ion-focusable` (the keyboard focus ring) are gone for good after the first pick. jsdom runs no
// Ionic, so the test stamps those classes itself, as Ionic does on hydrate.
describe('customers#77: the result rows keep responding to taps after a customer is picked', () => {
  const BEA = { id: 'cus-2', name: 'Bea López', phone: '600333444' };
  const IONIC = ['item', 'ios', 'item-lines-none', 'ion-activatable', 'ion-focusable', 'hydrated'];

  it('picking, switching and clearing the customer never drops the Ionic host classes', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.query = async (name: string, params?: Record<string, unknown>) => {
      if (name === 'customers.list') return [ANA, BEA];
      if (name === 'customers.get') return [params?.id === BEA.id ? BEA : ANA_FICHA];
      return [];
    };
    sdk.command = async () => ({ ok: true });
    const el = await montar();
    await abrir(el);
    const rows = () => [...el.shadowRoot.querySelectorAll<HTMLElement>('ion-list ion-item')];
    expect(rows()).toHaveLength(2);
    rows().forEach((r) => r.classList.add(...IONIC));
    const settle = async () => {
      await new Promise((r) => setTimeout(r, 0));
      await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    };
    const lost = () => rows().map((r) => IONIC.filter((c) => !r.classList.contains(c)));

    for (const [index, id] of [[0, ANA.id], [1, BEA.id], [0, ANA.id]] as const) {
      rows()[index].click();
      await settle();
      expect(rows().map((r) => r.classList.contains('sel')), `row ${id} is marked selected`).toEqual([index === 0, index === 1]);
      expect(lost(), 'Ionic classes lost after a pick').toEqual([[], []]);
    }

    el.shadowRoot.querySelector<HTMLElement>('ion-button.clear')!.click();
    await settle();
    expect(rows().map((r) => r.classList.contains('sel')), 'no row stays marked after clearing').toEqual([false, false]);
    expect(lost(), 'Ionic classes lost after clearing').toEqual([[], []]);
  });
});
