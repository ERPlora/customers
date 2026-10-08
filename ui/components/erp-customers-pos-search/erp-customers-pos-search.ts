import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-spotlight-search';
import '@erplora/outfitkit/ok-empty-state';
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
import { countryCode, countryName } from '../../lib/country';
import { domainErrorText } from '../../lib/domain-error-text';
import { searchTerm } from '../../lib/phone-search';

const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

// erp-customers-pos-search — selector de CLIENTE (ficha) inyectado en la pantalla de venta
// (ADR-0043). El módulo `customers` declara en su manifest que rellena el slot
// `sales.pos.assign`; el shell monta este Web Component dentro del POS de `sales`.
// El POS NO conoce a `customers`: la comunicación es por eventos del DOM (contrato), igual que
// el selector de mesa (`erp-tables-pos-zones`) sobre el mismo slot.
//
//   ─ emite `erp:customer-context` {customer_id, customer_name, customer_tax_id, customer_address,
//     customer_country} — the country as an ISO alpha-2 code ('' if the file names none, customers#71)
//     → el POS lo adjunta a la venta, y de ahí viaja en `sale.completed` hasta la factura.
//   ─ escucha `erp:customer-context-reset` → el POS lo dispara tras cobrar.
//   ─ listens to `erp:order-restored` {order_id} → the till took a check back (reload, a parked
//     check retrieved): the customer linked to that order is read back and assigned again
//     (customers#135), the same way a manual pick does.
//   ─ escucha `erp:customer-required` → el POS lo dispara cuando la venta EXIGE cliente y no lo hay
//     (`sales.require_customer`, sales#222): el buscador se abre solo, sin buscar el icono a mano.
//
// UI (ADR-0133): el disparador es un ICONO (con aria-label) que abre un overlay con buscador
// (`customers.list`) y listado; al pulsar un cliente se asocia a la venta.
//
// El overlay es PROPIO (scrim + panel), no un `ion-modal`: un overlay de Ionic declarado dentro de
// un shadow root de Lit se re-parenta a <body> al presentarse (ADR-0028) y pierde el CSS de
// `static styles` → la lista saldría sin formato.
//
// El snapshot FISCAL (ADR-0132) es lo que convierte esto en una factura válida: `customers.list` no
// devuelve la dirección, así que al elegir se pide la ficha completa (`customers.get`). Viaja una
// COPIA, no una referencia: editar la ficha del cliente no puede reescribir una factura ya emitida.
//
// customers#18 — NUNCA degrada en silencio. Estados explícitos del buscador: `idle` | `searching` |
// `empty` | `error` (recuperable, con reintento que conserva el término) | `forbidden` (sin permiso,
// sin reintento). Una respuesta vieja nunca pisa a la nueva (secuencia). Si la ficha no se puede leer,
// NO se emite selección: mejor un error visible que una factura sin NIF. Y el alta rápida vive aquí
// (Square/Toast/Lightspeed/Shopify POS/Fresha: «+ nuevo cliente» con nombre y teléfono, 2 toques).

interface Customer { id: string; name: string; phone?: string; email?: string; }

interface CustomerFicha extends Customer {
  tax_id?: string; address?: string; city?: string; postal_code?: string; country?: string;
}

interface ErploraLike {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  hasPermission?(permission: string): boolean;
  /** Shell toast (`Notification`, module-sdk). Optional: an older shell may not expose it. */
  notify?(n: { type: 'success' | 'error' | 'info' | 'warning'; message: string }): void;
  /** i18n del módulo (ADR-0055): idioma activo + traducción del catálogo `ui`. */
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
}

function erplora(): ErploraLike {
  const c = (globalThis as { erplora?: ErploraLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

function rows<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[];
  if (r && typeof r === 'object' && Array.isArray((r as { rows?: T[] }).rows)) return (r as { rows: T[] }).rows;
  return [];
}

/** Dirección fiscal en UNA línea, como la espera el documento: «calle, CP ciudad, país». */
function direccionFiscal(c: CustomerFicha): string {
  const localidad = [c.postal_code, c.city].filter(Boolean).join(' ');
  // The file stores the country's ISO code (customers#72); the printed address reads its name.
  return [c.address, localidad, countryName(c.country, erplora().locale)].filter((p) => p && String(p).trim()).join(', ');
}

interface Snapshot {
  customer_id: string | null;
  customer_name: string;
  customer_tax_id: string;
  customer_address: string;
  customer_country: string;
}

const VACIO: Snapshot = {
  customer_id: null, customer_name: '', customer_tax_id: '', customer_address: '', customer_country: '',
};

type SearchState = 'idle' | 'searching' | 'empty' | 'error' | 'forbidden';

function can(permission: string): boolean {
  const c = erplora();
  return typeof c.hasPermission === 'function' ? c.hasPermission(permission) : true;
}

const isForbidden = (e: unknown): boolean => (e as { code?: unknown } | null)?.code === 'permission_denied';
const looksLikePhone = (v: string): boolean => /^[+\d][\d\s().-]{5,}$/.test(v.trim());

/** Domain codes the dispatcher answers with → this module's own translated phrase, the escalator of
 *  cash_register#38. It stops one step earlier than that one on purpose: the raw `Display` of a
 *  server error never reaches the till (tables#55 — «db: sqlx: … violates check constraint at line
 *  2076» was a red banner in production), so anything without a code falls back to the module's
 *  generic phrase and the detail goes to the console for whoever reads the runtime log. */
const LINK_MESSAGES: Record<string, string> = {
  permission_denied: 'ui.errLinkOrderNoPermission',
};

function linkFailureMessage(e: unknown): string {
  const code = (e as { code?: unknown } | null)?.code;
  const key = (typeof code === 'string' ? LINK_MESSAGES[code] : undefined) ?? 'ui.errLinkOrder';
  return erplora().t(CATALOG, key);
}

export class ErpCustomersPosSearch extends LitElement {
  // El CHROME del buscador (overlay Spotlight + input + ✕ + trigger) lo pone `ok-spotlight-search`
  // (OutfitKit). Aquí solo estilamos los RESULTADOS que proyectamos en su slot.
  static styles = css`
    :host { display:contents; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    .list { background:transparent; }
    ion-list.list { background:transparent; }
    .list ion-item { --background:transparent; border-radius: var(--ok-radius-sm, 10px); }
    .list .sel { --background: color-mix(in srgb, var(--ion-color-primary,#0091ce) 16%, transparent); }
    .empty { color:#8b897f; text-align:center; padding:1.5rem 0; }
    .err { color:#d9480f; padding:.6rem 1rem; }
    .quick { display:flex; flex-direction:column; gap:.5rem; padding:.5rem .75rem; }
    .quick .row { display:flex; gap:.5rem; align-items:flex-end; }
    .quick ion-input { flex:1; }
    .quick-add { --padding-start:.75rem; min-height:44px; }
    .retry { min-height:44px; }
    /* pm#392 — \`color="primary"\` paints nothing inside this shadow root; the token does. */
    ion-icon.selected-mark { color: var(--ion-color-primary, #0054e9); }
  `;

  @state() private open = false;
  @state() private results: Customer[] = [];
  @state() private q = '';
  @state() private selectedId?: string;
  @state() private selectedName = '';
  @state() private loading = false;
  @state() private error = '';
  /** Explicit state of the search (customers#18): the cashier must tell "no matches" from "down". */
  @state() private state: SearchState = 'idle';
  /** Quick add (customers#18): inline «+ new customer» with name/phone only. */
  @state() private quickOpen = false;
  @state() private quickName = '';
  @state() private quickPhone = '';
  @state() private quickError = '';
  @state() private creating = false;

  private searchTimer?: ReturnType<typeof setTimeout>;
  /** Sequence of the last search issued: an older answer arriving later is dropped. */
  private searchSeq = 0;
  /** The order the selected customer is linked to (written by `erp:order-linked` or read back on
   *  `erp:order-restored`). A selection with no order yet is the cashier's own pick for the check
   *  being built, and a restore that finds no link must not wipe it (customers#135). */
  private boundOrderId?: string;
  /** Bumped by every restore and by every choice of the cashier (pick, clear, reset after charging):
   *  a restore answer that arrives after any of them is stale and is dropped. */
  private restoreSeq = 0;
  /** The order whose link is being written right now: until it lands, reading that order's link
   *  back would still answer with the customer it replaces. */
  private linkingOrderId?: string;
  private readonly onReset = () => {
    this.restoreSeq++;
    this.selectedId = undefined;
    this.selectedName = '';
    this.boundOrderId = undefined;
  };

  private readonly onLocaleChange = (): void => this.requestUpdate();

  /** El cobro EXIGE cliente y no lo hay (`sales.require_customer` → `erp:customer-required`,
   *  sales#222). Se abre el buscador como si lo hubiera tocado el cajero: mismo camino que el
   *  `ok-open` del trigger, así que la carga inicial y el estado salen de un único sitio.
   *  IDEMPOTENTE — si ya está abierto no vuelve a buscar (el POS puede reavisar en cada intento). */
  private readonly onCustomerRequired = (): void => {
    if (this.open) return;
    // Mismo camino que un `ok-open` del trigger: `this.open` va ENLAZADO a la propiedad `open` del
    // chrome (ver `render`), así que basta con el estado — funciona incluso si el aviso llega antes
    // del primer render, cuando todavía no hay `ok-spotlight-search` que tocar.
    this.onOkOpen(true);
  };

  /** El POS abrió un pedido → `customers` escribe SU junction cliente↔pedido (ADR-0141).
   *  Simétrico a lo que hace `tables`: el dueño de la asociación es quien la escribe; el pedido
   *  no guarda `customer_id` y `sales` no llama a este módulo. */
  private readonly onOrderLinked = async (e: Event): Promise<void> => {
    const d = (e as CustomEvent<{ order_id?: string }>).detail;
    if (!d?.order_id || !this.selectedId) return;
    // Read back from this very order (customers#135): the link is already there.
    if (this.boundOrderId === d.order_id) return;
    const customerId = this.selectedId;
    this.linkingOrderId = d.order_id;
    try {
      await erplora().command('customers.orders.link', { customer_id: customerId, order_id: d.order_id });
      if (this.selectedId === customerId) this.boundOrderId = d.order_id;
    } catch (err) {
      // La asociación es OPERATIVA: nunca debe romper la venta — por eso se traga. Tragarla en
      // SILENCIO era el fallo (customers#59): el historial del cliente se quedaba vacío hub tras
      // hub y nadie se enteraba. Se dice y se registra; el cobro sigue su camino.
      this.warnCashier('customers.orders.link failed; the sale goes on without customer history', err, linkFailureMessage(err));
    } finally {
      if (this.linkingOrderId === d.order_id) this.linkingOrderId = undefined;
    }
  };

  /** The till took a check back (`erp:order-restored`, customers#135): reloading it, or retrieving
   *  a parked one. `sales` keeps no customer on the order (ADR-0141); the link is ours, so the
   *  customer is read back and assigned like a manual pick — same sheet read, same fiscal snapshot.
   *  A check with no customer drops the customer of the check left behind, but never the cashier's
   *  own pick that is not linked to any order yet. A read that fails is said, never swallowed:
   *  without the customer the charge would not offer her voucher. */
  private readonly onOrderRestored = async (e: Event): Promise<void> => {
    const orderId = (e as CustomEvent<{ order_id?: string }>).detail?.order_id;
    // The customer in front is being written as this order's customer: she already is.
    if (!orderId || orderId === this.linkingOrderId) return;
    const seq = ++this.restoreSeq;
    try {
      const link = rows<{ customer_id?: string }>(await erplora().query('customers.orders.customer', { order_id: orderId }))[0];
      if (seq !== this.restoreSeq) return;
      const customerId = link?.customer_id;
      if (customerId && customerId === this.selectedId) {
        this.boundOrderId = orderId;
        return;
      }
      const sheet = customerId
        ? rows<CustomerFicha>(await erplora().query('customers.get', { customer_id: customerId }))[0]
        : undefined;
      if (seq !== this.restoreSeq) return;
      if (!sheet) {
        this.dropOtherChecksCustomer(orderId);
        return;
      }
      this.boundOrderId = orderId; // before `assign`: the till answers it with `erp:order-linked`
      this.assign(sheet);
    } catch (err) {
      if (seq !== this.restoreSeq) return;
      this.dropOtherChecksCustomer(orderId);
      this.warnCashier('the customer of a restored check could not be read', err, erplora().t(CATALOG, 'ui.errRestoreCustomer'));
    }
  };

  /** The customer in front belongs to ANOTHER check: she is not this check's customer. */
  private dropOtherChecksCustomer(orderId: string): void {
    if (this.selectedId && this.boundOrderId && this.boundOrderId !== orderId) {
      this.selectedId = undefined;
      this.selectedName = '';
      this.boundOrderId = undefined;
      this.emit(VACIO);
    }
  }

  /** Un fallo que no se ve no existe: rastro para el runtime + aviso traducido para el cajero. */
  private warnCashier(log: string, err: unknown, message: string): void {
    // El log va PRIMERO: es el rastro que queda aunque el shell no sepa avisar.
    console.warn(`[customers] ${log}`, err);
    const c = erplora();
    try {
      c.notify?.({ type: 'warning', message });
    } catch (notifyErr) {
      console.warn('[customers] the shell could not show the warning', notifyErr);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('erp:customer-context-reset', this.onReset);
    this.addEventListener('erp:customer-required', this.onCustomerRequired);
    this.addEventListener('erp:order-linked', this.onOrderLinked);
    this.addEventListener('erp:order-restored', this.onOrderRestored);
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
  }

  disconnectedCallback() {
    this.removeEventListener('erp:customer-context-reset', this.onReset);
    this.removeEventListener('erp:customer-required', this.onCustomerRequired);
    this.removeEventListener('erp:order-linked', this.onOrderLinked);
    this.removeEventListener('erp:order-restored', this.onOrderRestored);
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    super.disconnectedCallback();
  }

  /** Sincroniza el abierto/cerrado del overlay (ok-spotlight-search) y carga al abrir. */
  private onOkOpen(open: boolean) {
    this.open = open;
    if (open && !this.results.length) void this.search('');
  }

  private async search(q: string) {
    const seq = ++this.searchSeq;
    this.loading = true;
    this.error = '';
    this.state = 'searching';
    try {
      const r = await erplora().query('customers.list', { search: searchTerm(q), limit: 20, sort: 'name', dir: 'asc' });
      if (seq !== this.searchSeq) return; // stale: a newer search is in flight or already answered
      this.results = rows<Customer>(r);
      this.state = this.results.length ? 'idle' : 'empty';
    } catch (e) {
      if (seq !== this.searchSeq) return;
      this.results = [];
      if (isForbidden(e)) {
        this.state = 'forbidden';
        this.error = erplora().t(CATALOG, 'ui.posNoPermission');
      } else {
        this.state = 'error';
        this.error = e instanceof Error && e.message ? e.message : erplora().t(CATALOG, 'ui.errLoadCustomers');
      }
    } finally {
      if (seq === this.searchSeq) this.loading = false;
    }
  }

  /** Retry keeps the term the cashier typed (customers#18). */
  private retry() { void this.search(this.q); }

  private onInput(v: string) {
    this.q = v;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.search(v), 300);
  }

  private emit(snap: Snapshot) {
    this.dispatchEvent(new CustomEvent('erp:customer-context', {
      detail: snap, bubbles: true, composed: true,
    }));
  }

  private closeOverlay() {
    (this.renderRoot.querySelector('ok-spotlight-search') as { close?: () => void } | null)?.close?.();
  }

  private async pick(c: Customer) {
    // The full sheet carries the tax id and the address; `customers.list` does not. If the sheet
    // cannot be read the customer is NOT selected and nothing is emitted (customers#18): a visible
    // error beats a sale that goes on "with a customer" but without fiscal data. Retry = tap again.
    this.error = '';
    this.restoreSeq++; // the cashier's pick wins over a restore still on its way
    let ficha: CustomerFicha | undefined;
    try {
      ficha = rows<CustomerFicha>(await erplora().query('customers.get', { customer_id: c.id }))[0];
    } catch (e) {
      this.state = isForbidden(e) ? 'forbidden' : 'error';
      this.error = isForbidden(e)
        ? erplora().t(CATALOG, 'ui.posNoPermission')
        : erplora().t(CATALOG, 'ui.errCustomerSnapshot', { name: c.name });
      return;
    }
    if (!ficha) {
      this.state = 'error';
      this.error = erplora().t(CATALOG, 'ui.errCustomerNotFound');
      return;
    }
    this.boundOrderId = undefined;
    this.closeOverlay();
    this.assign({ ...ficha, id: c.id, name: ficha.name || c.name });
  }

  /** Selects the customer and hands the till her fiscal snapshot — a COPY (ADR-0132). */
  private assign(sheet: CustomerFicha): void {
    this.selectedId = sheet.id;
    this.selectedName = sheet.name;
    this.emit({
      customer_id: sheet.id,
      customer_name: sheet.name,
      customer_tax_id: sheet.tax_id ?? '',
      customer_address: direccionFiscal(sheet),
      customer_country: countryCode(sheet.country, erplora().locale),
    });
  }

  // — Quick add (customers#18). Market: Square, Toast, Lightspeed, Shopify POS, Fresha all offer
  // «+ new customer» from the search itself with name/phone only. If the term looks like a phone it
  // pre-fills the phone; otherwise the name. Duplicate guard: an exact phone match among the current
  // results is picked instead of created (no double customer for one WhatsApp number). —
  private openQuickAdd() {
    if (!can('customers.add_customer')) return;
    const term = this.q.trim();
    this.quickName = looksLikePhone(term) ? '' : term;
    this.quickPhone = looksLikePhone(term) ? term : '';
    this.quickError = '';
    this.quickOpen = true;
  }

  private async quickCreate() {
    if (!can('customers.add_customer') || this.creating) return;
    const name = this.quickName.trim();
    const phone = this.quickPhone.trim();
    if (!name) { this.quickError = erplora().t(CATALOG, 'ui.quickNameRequired'); return; }
    this.creating = true;
    this.quickError = '';
    try {
      const dup = phone ? await this.cardWithPhone(phone) : undefined;
      if (dup) { this.quickOpen = false; await this.pick(dup); return; }
      const out = await erplora().command<{ new_ids?: string[] }>('customers.create', { name, phone, source: 'walk_in' });
      const id = out?.new_ids?.[0];
      if (!id) throw new Error(erplora().t(CATALOG, 'ui.errCreate'));
      this.quickOpen = false;
      await this.pick({ id, name, phone });
    } catch (e) {
      this.quickError = domainErrorText(CATALOG, erplora().locale, e)
        || (e instanceof Error && e.message ? e.message : erplora().t(CATALOG, 'ui.errCreate'));
    } finally {
      this.creating = false;
    }
  }

  /** The live card that already carries `phone`, compared as a NUMBER of the business's country by
   *  the server (`customers.by_phone`, F10): cards are stored in E.164 (customers#121), so the text
   *  the cashier typed («600 111 222») never equals the stored one. If that read fails, the rows on
   *  screen are compared as before — a failed duplicate check must not block the sale. */
  private async cardWithPhone(phone: string): Promise<Customer | undefined> {
    try {
      const rows = await erplora().query<Customer[]>('customers.by_phone', { phone });
      return Array.isArray(rows) ? rows[0] : undefined;
    } catch {
      const typed = phone.replace(/\s+/g, '');
      return this.results.find((r) => (r.phone ?? '').replace(/\s+/g, '') === typed);
    }
  }

  private clear() {
    this.restoreSeq++;
    this.boundOrderId = undefined;
    this.selectedId = undefined;
    this.selectedName = '';
    this.closeOverlay();
    this.emit(VACIO);
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    // El chrome (trigger + overlay Spotlight + input + ✕) lo aporta `ok-spotlight-search`; aquí solo
    // damos icono/estado del trigger, escuchamos ok-open/ok-input y proyectamos los resultados.
    return html`
      <ok-spotlight-search
        trigger-icon=${this.selectedId ? 'person' : 'person-add-outline'}
        trigger-label=${this.selectedName || t('ui.assignCustomer')}
        placeholder=${t('ui.searchPosCustomer')}
        .open=${this.open}
        .value=${this.q}
        @ok-open=${(e: CustomEvent) => this.onOkOpen(e.detail.open)}
        @ok-input=${(e: CustomEvent) => this.onInput(e.detail.value)}>
        ${this.error ? html`<ok-inline-feedback data-testid="customers-pos-error" tone="danger" icon="alert-circle-outline">${this.error}</ok-inline-feedback>` : nothing}
        ${this.state === 'error' ? html`<ion-button class="retry" data-testid="customers-pos-retry" expand="block" fill="outline" size="small" @click=${() => this.retry()}>${t('ui.retry')}</ion-button>` : nothing}
        <ion-list class="list" lines="none">
          ${this.results.map((c) => html`
            <ion-item button detail="false" data-testid=${`customers-pos-result-${c.id}`} class=${classMap({ sel: this.selectedId === c.id })} @click=${() => void this.pick(c)}>
              <ion-label>
                <h3>${c.name}</h3>
                ${c.phone || c.email ? html`<p>${c.phone || c.email}</p>` : nothing}
              </ion-label>
              ${this.selectedId === c.id ? html`<ion-icon slot="end" name="checkmark-outline" class="selected-mark"></ion-icon>` : nothing}
            </ion-item>`)}
          ${this.state === 'empty' ? html`<ok-empty-state data-testid="customers-pos-empty" icon=${this.q ? 'search-outline' : 'people-outline'} message=${this.q ? t('ui.noResults') : t('ui.noCustomers')}></ok-empty-state>` : nothing}
          ${this.state === 'searching' ? html`<div class="empty" data-testid="customers-pos-searching">${t('ui.loading')}</div>` : nothing}
        </ion-list>
        ${this.q.trim() && can('customers.add_customer') && this.state !== 'forbidden' && this.state !== 'searching' && !this.quickOpen
          ? html`<ion-button class="quick-add" data-testid="customers-pos-quick-add" expand="block" fill="clear" @click=${() => this.openQuickAdd()}>
              <ion-icon slot="start" name="person-add-outline"></ion-icon>${erplora().t(CATALOG, 'ui.quickAddCustomer', { term: this.q.trim() })}
            </ion-button>`
          : nothing}
        ${this.quickOpen ? html`<form class="quick" data-testid="customers-pos-quick-form" @submit=${(e: Event) => { e.preventDefault(); void this.quickCreate(); }}>
            <div class="row">
              <ion-input mode="md" fill="outline" data-testid="customers-pos-quick-name" label=${t('ui.quickName')} label-placement="floating" .value=${this.quickName} @ionInput=${(e: Event) => (this.quickName = String((e.target as HTMLInputElement).value ?? ''))}></ion-input>
              <ion-input mode="md" fill="outline" type="tel" inputmode="tel" data-testid="customers-pos-quick-phone" label=${t('ui.quickPhone')} label-placement="floating" .value=${this.quickPhone} @ionInput=${(e: Event) => (this.quickPhone = String((e.target as HTMLInputElement).value ?? ''))}></ion-input>
            </div>
            ${this.quickError ? html`<ok-inline-feedback data-testid="customers-pos-quick-error" tone="danger" icon="alert-circle-outline">${this.quickError}</ok-inline-feedback>` : nothing}
            <div class="row">
              <ion-button type="submit" size="small" data-testid="customers-pos-quick-submit" ?disabled=${this.creating}>${this.creating ? t('ui.saving') : t('ui.quickCreate')}</ion-button>
              <ion-button size="small" fill="clear" data-testid="customers-pos-quick-cancel" @click=${() => (this.quickOpen = false)}>${t('ui.cancel')}</ion-button>
            </div>
          </form>` : nothing}
        ${this.selectedId
          ? html`<ion-button slot="footer" class="clear" data-testid="customers-pos-clear" fill="clear" size="small" @click=${() => this.clear()}>${t('ui.removeCustomer')}</ion-button>`
          : nothing}
      </ok-spotlight-search>
    `;
  }
}

define('erp-customers-pos-search', ErpCustomersPosSearch);

declare global {
  interface HTMLElementTagNameMap {
    'erp-customers-pos-search': ErpCustomersPosSearch;
  }
}
