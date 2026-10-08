// customers#135 — reloading the till (F5, the tablet restarts, the wifi drops and the hub reloads)
// brought the check back with its lines but WITHOUT its customer: the button went back to «Assign
// customer», and in the hair salon the charge stopped offering her voucher until she was picked again.
//
// `sales` does not know `customers` (ADR-0043): when it takes a check back (reload, or retrieving a
// parked check) it fires `erp:order-restored {order_id}` at whoever fills `sales.pos.assign`
// (`erp-pos-touch.ts` → `restoreOpenOrder` / `notifyOrderRestored` / `ensureSlotsMounted`) and the
// owner of each association restores ITS part. The customer↔order link is ours (CUSTOMERS-F19), so
// the search reads it back (`customers.orders.customer`) and re-assigns the customer exactly as a
// manual pick would: same `customers.get` read, same fiscal snapshot in `erp:customer-context`.
// Square and Shopify POS do the same: the customer is part of the saved cart.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@erplora/outfitkit/ok-spotlight-search', () => ({}));

import es from '../../../locales/es.json' with { type: 'json' };
import en from '../../../locales/en.json' with { type: 'json' };

const ANA = { id: 'cus-1', name: 'Ana García', phone: '600111222', email: 'ana@example.com' };
const ANA_SHEET = { ...ANA, tax_id: '12345678Z', address: 'Calle Mayor 1', city: 'Madrid', postal_code: '28013', country: 'ES' };
const BEA = { id: 'cus-2', name: 'Bea López', phone: '600333444' };
const BEA_SHEET = { ...BEA, tax_id: '', address: '', city: '', postal_code: '', country: '' };

type Call = { name: string; params?: Record<string, unknown> };
type WC = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> } & Record<string, unknown>;

const calls: Call[] = [];
/** order_id → customer_id, as the junction holds it. */
let links: Record<string, string> = {};
let notices: { type: string; message: string }[] = [];

const sdk = () => (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;

beforeEach(() => {
  calls.length = 0;
  links = {};
  notices = [];
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string, params?: Record<string, unknown>) => {
      calls.push({ name, params });
      if (name === 'customers.orders.customer') {
        const id = links[String(params?.order_id)];
        return id ? [{ order_id: params?.order_id, customer_id: id }] : [];
      }
      if (name === 'customers.get') {
        if (params?.customer_id === ANA.id) return [ANA_SHEET];
        if (params?.customer_id === BEA.id) return [BEA_SHEET];
        return [];
      }
      if (name === 'customers.list') return [ANA, BEA];
      return [];
    },
    command: async () => ({ ok: true }),
    notify: (n: { type: string; message: string }) => notices.push(n),
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

async function flush(el: WC) {
  for (let i = 0; i < 3; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
  }
  await el.updateComplete;
}

async function mount(): Promise<WC> {
  await import('./erp-customers-pos-search');
  const el = document.createElement('erp-customers-pos-search') as unknown as WC;
  document.body.appendChild(el);
  await flush(el);
  return el;
}

function listen(el: WC): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  el.addEventListener('erp:customer-context', (e) => out.push((e as CustomEvent).detail));
  return out;
}

/** Exactly as `erp-pos-touch` fires it: on the filler's element, not bubbling. */
const restore = (el: WC, orderId: string) =>
  el.dispatchEvent(new CustomEvent('erp:order-restored', { detail: { order_id: orderId }, bubbles: false }));
const linked = (el: WC, orderId: string) =>
  el.dispatchEvent(new CustomEvent('erp:order-linked', { detail: { order_id: orderId }, bubbles: false }));

const trigger = (el: WC) => el.shadowRoot.querySelector('ok-spotlight-search')!;

async function pickFromList(el: WC, id: string) {
  trigger(el).dispatchEvent(new CustomEvent('ok-open', { detail: { open: true } }));
  await flush(el);
  el.shadowRoot.querySelector<HTMLElement>(`[data-testid="customers-pos-result-${id}"]`)!.click();
  await flush(el);
}

describe('a restored check comes back WITH its customer (customers#135)', () => {
  it('reads the link of the restored order and re-assigns the customer with her fiscal snapshot', async () => {
    links = { 'ord-1': ANA.id };
    const el = await mount();
    const emitted = listen(el);

    restore(el, 'ord-1');
    await flush(el);

    expect(calls.find((c) => c.name === 'customers.orders.customer')?.params).toEqual({ order_id: 'ord-1' });
    expect(emitted, 'the till gets the same snapshot as a manual pick').toEqual([{
      customer_id: ANA.id,
      customer_name: ANA.name,
      customer_tax_id: '12345678Z',
      customer_address: 'Calle Mayor 1, 28013 Madrid, España',
      customer_country: 'ES',
    }]);
    expect(trigger(el).getAttribute('trigger-label'), 'the button names her again').toBe(ANA.name);
    expect(trigger(el).getAttribute('trigger-icon')).toBe('person');
    expect(notices).toEqual([]);
  });

  it('a check with no customer restored on a blank till changes nothing', async () => {
    const el = await mount();
    const emitted = listen(el);

    restore(el, 'ord-9');
    await flush(el);

    expect(emitted).toEqual([]);
    expect(trigger(el).getAttribute('trigger-label')).toBe('ui.assignCustomer');
    expect(notices).toEqual([]);
  });

  it('retrieving ANOTHER check switches to that check\'s customer', async () => {
    links = { 'ord-1': ANA.id, 'ord-2': BEA.id };
    const el = await mount();
    const emitted = listen(el);

    restore(el, 'ord-1');
    await flush(el);
    restore(el, 'ord-2');
    await flush(el);

    expect(emitted.map((d) => d.customer_id)).toEqual([ANA.id, BEA.id]);
    expect(trigger(el).getAttribute('trigger-label')).toBe(BEA.name);
  });

  it('retrieving a check WITHOUT customer drops the customer of the check left behind', async () => {
    links = { 'ord-1': ANA.id };
    const el = await mount();
    const emitted = listen(el);

    restore(el, 'ord-1');
    await flush(el);
    restore(el, 'ord-2');
    await flush(el);

    expect(emitted.map((d) => d.customer_id), 'the till is told the check has no customer').toEqual([ANA.id, null]);
    expect(trigger(el).getAttribute('trigger-label')).toBe('ui.assignCustomer');
  });

  it('a customer linked by hand to one check is dropped when a check without customer is retrieved', async () => {
    const el = await mount();
    await pickFromList(el, ANA.id);
    linked(el, 'ord-1');
    await flush(el);
    const emitted = listen(el);

    restore(el, 'ord-2');
    await flush(el);

    expect(emitted.map((d) => d.customer_id)).toEqual([null]);
  });

  it('a customer picked but not linked yet is NOT wiped by a restore that finds no link', async () => {
    // The till re-mounts its fillers on re-render and re-fires `erp:order-restored` for the check in
    // front; if the link is still being written (or failed and was already reported), the cashier's
    // own pick stays — losing it would be the very bug this fixes.
    const el = await mount();
    await pickFromList(el, ANA.id);
    const emitted = listen(el);

    restore(el, 'ord-1');
    await flush(el);

    expect(emitted).toEqual([]);
    expect(trigger(el).getAttribute('trigger-label')).toBe(ANA.name);
  });

  it('re-firing the restore of the check already in front does not re-emit', async () => {
    links = { 'ord-1': ANA.id };
    const el = await mount();
    const emitted = listen(el);

    restore(el, 'ord-1');
    await flush(el);
    restore(el, 'ord-1');
    await flush(el);

    expect(emitted).toHaveLength(1);
  });

  it('a link that cannot be read is SAID, and the till is left as it was', async () => {
    const el = await mount();
    sdk().query = async (name: string) => {
      if (name === 'customers.orders.customer') throw new Error('db down');
      return [];
    };
    const emitted = listen(el);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    restore(el, 'ord-1');
    await flush(el);

    expect(notices, 'the cashier knows the customer may be missing before charging').toEqual([
      { type: 'warning', message: 'ui.errRestoreCustomer' },
    ]);
    expect(warn).toHaveBeenCalled();
    expect(emitted).toEqual([]);
    warn.mockRestore();
  });

  it('a sheet that cannot be read is SAID too, and nobody is assigned', async () => {
    links = { 'ord-1': ANA.id };
    const el = await mount();
    const query = sdk().query as (n: string, p?: Record<string, unknown>) => Promise<unknown>;
    sdk().query = async (name: string, params?: Record<string, unknown>) => {
      if (name === 'customers.get') throw new Error('db down');
      return query(name, params);
    };
    const emitted = listen(el);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    restore(el, 'ord-1');
    await flush(el);

    expect(notices).toEqual([{ type: 'warning', message: 'ui.errRestoreCustomer' }]);
    expect(emitted).toEqual([]);
    expect(trigger(el).getAttribute('trigger-label')).toBe('ui.assignCustomer');
    warn.mockRestore();
  });

  it('a failed read while the customer of ANOTHER check is in front drops her and says so', async () => {
    links = { 'ord-1': ANA.id };
    const el = await mount();
    restore(el, 'ord-1');
    await flush(el);
    const query = sdk().query as (n: string, p?: Record<string, unknown>) => Promise<unknown>;
    sdk().query = async (name: string, params?: Record<string, unknown>) => {
      if (name === 'customers.orders.customer') throw new Error('db down');
      return query(name, params);
    };
    const emitted = listen(el);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    restore(el, 'ord-2');
    await flush(el);

    expect(emitted.map((d) => d.customer_id), 'ord-1\'s customer is not charged on ord-2').toEqual([null]);
    expect(notices).toEqual([{ type: 'warning', message: 'ui.errRestoreCustomer' }]);
    warn.mockRestore();
  });

  it('a linked sheet that no longer exists (deleted) assigns nobody, silently', async () => {
    links = { 'ord-1': 'cus-gone' };
    const el = await mount();
    const emitted = listen(el);

    restore(el, 'ord-1');
    await flush(el);

    expect(emitted).toEqual([]);
    expect(notices).toEqual([]);
    expect(trigger(el).getAttribute('trigger-label')).toBe('ui.assignCustomer');
  });

  it('an answer that arrives AFTER the cashier picked someone by hand does not overwrite her pick', async () => {
    links = { 'ord-1': ANA.id };
    const el = await mount();
    const query = sdk().query as (n: string, p?: Record<string, unknown>) => Promise<unknown>;
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    sdk().query = async (name: string, params?: Record<string, unknown>) => {
      if (name === 'customers.orders.customer') await gate;
      return query(name, params);
    };
    const emitted = listen(el);

    restore(el, 'ord-1');
    await flush(el);
    await pickFromList(el, BEA.id);
    release();
    await flush(el);

    expect(emitted.map((d) => d.customer_id), 'only her manual pick reaches the till').toEqual([BEA.id]);
    expect(trigger(el).getAttribute('trigger-label')).toBe(BEA.name);
  });

  it('an answer that arrives after the charge reset the till does not bring the customer back', async () => {
    links = { 'ord-1': ANA.id };
    const el = await mount();
    const query = sdk().query as (n: string, p?: Record<string, unknown>) => Promise<unknown>;
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    sdk().query = async (name: string, params?: Record<string, unknown>) => {
      if (name === 'customers.orders.customer') await gate;
      return query(name, params);
    };
    const emitted = listen(el);

    restore(el, 'ord-1');
    await flush(el);
    el.dispatchEvent(new CustomEvent('erp:customer-context-reset', { bubbles: false }));
    release();
    await flush(el);

    expect(emitted).toEqual([]);
    expect(trigger(el).getAttribute('trigger-label')).toBe('ui.assignCustomer');
  });

  it('a pick made while the restored SHEET is still loading wins too', async () => {
    links = { 'ord-1': ANA.id };
    const el = await mount();
    const query = sdk().query as (n: string, p?: Record<string, unknown>) => Promise<unknown>;
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    let gated = false;
    sdk().query = async (name: string, params?: Record<string, unknown>) => {
      // Only the restore's read of Ana is held; the cashier's own pick of Bea answers at once.
      if (name === 'customers.get' && params?.customer_id === ANA.id && !gated) { gated = true; await gate; }
      return query(name, params);
    };
    const emitted = listen(el);

    restore(el, 'ord-1');
    await flush(el);
    await pickFromList(el, BEA.id);
    release();
    await flush(el);

    expect(emitted.map((d) => d.customer_id)).toEqual([BEA.id]);
  });

  it('«Remove customer» pressed while a restore is on its way is not undone by it', async () => {
    links = { 'ord-1': ANA.id, 'ord-2': BEA.id };
    const el = await mount();
    restore(el, 'ord-1');
    await flush(el);
    const query = sdk().query as (n: string, p?: Record<string, unknown>) => Promise<unknown>;
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    sdk().query = async (name: string, params?: Record<string, unknown>) => {
      if (name === 'customers.orders.customer') await gate;
      return query(name, params);
    };
    const emitted = listen(el);

    restore(el, 'ord-2');
    await flush(el);
    trigger(el).dispatchEvent(new CustomEvent('ok-open', { detail: { open: true } }));
    await flush(el);
    el.shadowRoot.querySelector<HTMLElement>('[data-testid="customers-pos-clear"]')!.click();
    await flush(el);
    release();
    await flush(el);

    expect(emitted.map((d) => d.customer_id)).toEqual([null]);
    expect(trigger(el).getAttribute('trigger-label')).toBe('ui.assignCustomer');
  });

  it('a failed re-read of the check ALREADY in front keeps its customer (and says so)', async () => {
    links = { 'ord-1': ANA.id };
    const el = await mount();
    restore(el, 'ord-1');
    await flush(el);
    sdk().query = async () => { throw new Error('db down'); };
    const emitted = listen(el);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    restore(el, 'ord-1');
    await flush(el);

    expect(emitted).toEqual([]);
    expect(trigger(el).getAttribute('trigger-label')).toBe(ANA.name);
    expect(notices).toEqual([{ type: 'warning', message: 'ui.errRestoreCustomer' }]);
    warn.mockRestore();
  });

  it('a re-fired restore that reads the OLD link while the new one is being written keeps the new pick', async () => {
    // The till re-fires `erp:order-restored` for the check in front whenever it re-mounts its
    // fillers. Changing Ana for Bea on ord-1 writes the link; a read in that window still says Ana.
    links = { 'ord-1': ANA.id };
    const el = await mount();
    restore(el, 'ord-1');
    await flush(el);
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    sdk().command = async (name: string, payload?: Record<string, unknown>) => {
      if (name === 'customers.orders.link') {
        await gate;
        links[String(payload?.order_id)] = String(payload?.customer_id);
      }
      return { ok: true };
    };
    const emitted = listen(el);

    await pickFromList(el, BEA.id);
    linked(el, 'ord-1');
    await flush(el);
    restore(el, 'ord-1');
    await flush(el);
    release();
    await flush(el);

    expect(emitted.map((d) => d.customer_id), 'Ana never comes back over Bea').toEqual([BEA.id]);
    expect(trigger(el).getAttribute('trigger-label')).toBe(BEA.name);
  });

  it('the cashier\'s own pick that never got linked survives retrieving a check without customer', async () => {
    links = { 'ord-1': ANA.id };
    const el = await mount();
    restore(el, 'ord-1');
    await flush(el);
    await pickFromList(el, BEA.id);
    const emitted = listen(el);

    restore(el, 'ord-2');
    await flush(el);

    expect(emitted).toEqual([]);
    expect(trigger(el).getAttribute('trigger-label')).toBe(BEA.name);
  });

  it('the till answering the restored customer with `erp:order-linked` does not re-write the link', async () => {
    // `erp-pos-touch.onCustomerContext` always calls `notifyOrderLinked`: the restored customer comes
    // back as an `erp:order-linked` for the very order she was read from.
    links = { 'ord-1': ANA.id };
    const el = await mount();
    const writes: Record<string, unknown>[] = [];
    sdk().command = async (_name: string, payload?: Record<string, unknown>) => { writes.push(payload ?? {}); return { ok: true }; };
    el.addEventListener('erp:customer-context', () => linked(el, 'ord-1'));

    restore(el, 'ord-1');
    await flush(el);

    expect(writes, 'the link is already there: nothing to write').toEqual([]);
    // …but a NEW order for the same customer (the check was split) is linked as always.
    linked(el, 'ord-2');
    await flush(el);
    expect(writes).toEqual([{ customer_id: ANA.id, order_id: 'ord-2' }]);
  });

  it('an OLDER restore answering last does not undo the newer one', async () => {
    // Switching checks quickly: ord-2 (no customer) is asked first and answers last, after the
    // cashier is already back on ord-1 with Ana.
    links = { 'ord-1': ANA.id };
    const el = await mount();
    restore(el, 'ord-1');
    await flush(el);
    const query = sdk().query as (n: string, p?: Record<string, unknown>) => Promise<unknown>;
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    sdk().query = async (name: string, params?: Record<string, unknown>) => {
      if (name === 'customers.orders.customer' && params?.order_id === 'ord-2') await gate;
      return query(name, params);
    };
    const emitted = listen(el);

    restore(el, 'ord-2');
    await flush(el);
    restore(el, 'ord-1');
    await flush(el);
    release();
    await flush(el);

    expect(emitted, 'Ana stays on ord-1').toEqual([]);
    expect(trigger(el).getAttribute('trigger-label')).toBe(ANA.name);
  });

  it('an OLDER restore of another check of the SAME customer does not move her to that check', async () => {
    // Ana has two checks (ord-1, ord-2). The answer for ord-2 arrives after the till is back on
    // ord-1: if it were taken, the search would believe Ana sits on ord-2 and a failed re-read of
    // ord-1 would then drop her as "the customer of another check".
    links = { 'ord-1': ANA.id, 'ord-2': ANA.id };
    const el = await mount();
    restore(el, 'ord-1');
    await flush(el);
    const query = sdk().query as (n: string, p?: Record<string, unknown>) => Promise<unknown>;
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    sdk().query = async (name: string, params?: Record<string, unknown>) => {
      if (name === 'customers.orders.customer' && params?.order_id === 'ord-2') await gate;
      return query(name, params);
    };
    restore(el, 'ord-2');
    await flush(el);
    restore(el, 'ord-1');
    await flush(el);
    release();
    await flush(el);
    sdk().query = async () => { throw new Error('db down'); };
    const emitted = listen(el);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    restore(el, 'ord-1');
    await flush(el);

    expect(emitted, 'Ana is still the customer of ord-1').toEqual([]);
    expect(trigger(el).getAttribute('trigger-label')).toBe(ANA.name);
    warn.mockRestore();
  });

  it('a read that fails AFTER the cashier picked someone else is not reported', async () => {
    const el = await mount();
    const query = sdk().query as (n: string, p?: Record<string, unknown>) => Promise<unknown>;
    let fail!: () => void;
    const gate = new Promise<void>((_r, reject) => { fail = () => reject(new Error('db down')); });
    gate.catch(() => {});
    sdk().query = async (name: string, params?: Record<string, unknown>) => {
      if (name === 'customers.orders.customer') await gate;
      return query(name, params);
    };

    restore(el, 'ord-1');
    await flush(el);
    await pickFromList(el, BEA.id);
    fail();
    await flush(el);

    expect(notices, 'the question is no longer open: nothing to warn about').toEqual([]);
    expect(trigger(el).getAttribute('trigger-label')).toBe(BEA.name);
  });

  it('coming back to the check whose link the cashier wrote brings HER back', async () => {
    links = { 'ord-2': BEA.id };
    const el = await mount();
    await pickFromList(el, ANA.id);
    linked(el, 'ord-1');
    await flush(el);
    links['ord-1'] = ANA.id; // what the write above stored
    const emitted = listen(el);

    restore(el, 'ord-2');
    await flush(el);
    restore(el, 'ord-1');
    await flush(el);

    expect(emitted.map((d) => d.customer_id)).toEqual([BEA.id, ANA.id]);
  });

  it('a link write that lands AFTER another check was retrieved does not re-bind its customer', async () => {
    // Ana is picked for ord-1 and her link is being written; before it lands the cashier retrieves
    // ord-2 (Bea). When Ana's write finally lands, Bea must stay bound to ord-2: otherwise a re-fired
    // restore of ord-2 whose read fails would take Bea for «the customer of another check» and drop her.
    links = { 'ord-2': BEA.id };
    const el = await mount();
    await pickFromList(el, ANA.id);
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    sdk().command = async (name: string, payload?: Record<string, unknown>) => {
      if (name === 'customers.orders.link') {
        await gate;
        links[String(payload?.order_id)] = String(payload?.customer_id);
      }
      return { ok: true };
    };
    linked(el, 'ord-1');
    await flush(el);
    restore(el, 'ord-2');
    await flush(el);
    expect(trigger(el).getAttribute('trigger-label')).toBe(BEA.name);
    release();
    await flush(el);
    sdk().query = async () => { throw new Error('db down'); };
    const emitted = listen(el);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    restore(el, 'ord-2');
    await flush(el);

    expect(emitted, 'Bea is still the customer of ord-2').toEqual([]);
    expect(trigger(el).getAttribute('trigger-label')).toBe(BEA.name);
    warn.mockRestore();
  });

  it('the warning is translated in both catalogs', () => {
    const ui = (c: unknown) => (c as { ui: Record<string, string> }).ui;
    expect(ui(en).errRestoreCustomer).toBeTruthy();
    expect(ui(es).errRestoreCustomer).toBeTruthy();
    expect(ui(es).errRestoreCustomer).not.toBe(ui(en).errRestoreCustomer);
  });
});
