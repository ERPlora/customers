import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-spotlight-search';
import '@erplora/outfitkit/ok-empty-state';
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';

const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

// erp-customers-pos-search — selector de CLIENTE (ficha) inyectado en la pantalla de venta
// (ADR-0043). El módulo `customers` declara en su manifest que rellena el slot
// `sales.pos.customer_context`; el shell monta este Web Component dentro del POS de `sales`.
// El POS NO conoce a `customers`: la comunicación es por eventos del DOM (contrato), igual que
// el selector de mesa (`erp-tables-pos-zones`) sobre `sales.pos.order_context`.
//
//   ─ emite `erp:customer-context` {customer_id, customer_name, customer_tax_id, customer_address}
//     → el POS lo adjunta a la venta, y de ahí viaja en `sale.completed` hasta la factura.
//   ─ escucha `erp:customer-context-reset` → el POS lo dispara tras cobrar.
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

interface Customer { id: string; name: string; phone?: string; email?: string; }

interface CustomerFicha extends Customer {
  tax_id?: string; address?: string; city?: string; postal_code?: string; country?: string;
}

interface ErploraLike {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
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
  return [c.address, localidad, c.country].filter((p) => p && String(p).trim()).join(', ');
}

interface Snapshot {
  customer_id: string | null;
  customer_name: string;
  customer_tax_id: string;
  customer_address: string;
}

const VACIO: Snapshot = { customer_id: null, customer_name: '', customer_tax_id: '', customer_address: '' };

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
  `;

  @state() private open = false;
  @state() private results: Customer[] = [];
  @state() private q = '';
  @state() private selectedId?: string;
  @state() private selectedName = '';
  @state() private loading = false;
  @state() private error = '';

  private searchTimer?: ReturnType<typeof setTimeout>;
  private readonly onReset = () => {
    this.selectedId = undefined;
    this.selectedName = '';
  };

  private readonly onLocaleChange = (): void => this.requestUpdate();

  /** El POS abrió un pedido → `customers` escribe SU junction cliente↔pedido (ADR-0141).
   *  Simétrico a lo que hace `tables`: el dueño de la asociación es quien la escribe; el pedido
   *  no guarda `customer_id` y `sales` no llama a este módulo. */
  private readonly onOrderLinked = async (e: Event): Promise<void> => {
    const d = (e as CustomEvent<{ order_id?: string }>).detail;
    if (!d?.order_id || !this.selectedId) return;
    try {
      await erplora().command('customers.orders.link', { customer_id: this.selectedId, order_id: d.order_id });
    } catch { /* la asociación es operativa: nunca debe romper la venta */ }
  };

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('erp:customer-context-reset', this.onReset);
    this.addEventListener('erp:order-linked', this.onOrderLinked);
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
  }

  disconnectedCallback() {
    this.removeEventListener('erp:customer-context-reset', this.onReset);
    this.removeEventListener('erp:order-linked', this.onOrderLinked);
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    super.disconnectedCallback();
  }

  /** Sincroniza el abierto/cerrado del overlay (ok-spotlight-search) y carga al abrir. */
  private onOkOpen(open: boolean) {
    this.open = open;
    if (open && !this.results.length) void this.search('');
  }

  private async search(q: string) {
    this.loading = true;
    this.error = '';
    try {
      const r = await erplora()
        .query('customers.list', { search: q, limit: 20, sort: 'name', dir: 'asc' })
        .catch(() => []);
      this.results = rows<Customer>(r);
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errLoadCustomers');
    } finally {
      this.loading = false;
    }
  }

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
    this.selectedId = c.id;
    this.selectedName = c.name;
    this.closeOverlay();

    // La ficha completa trae el NIF y la dirección; `customers.list` no. Si la ficha no se puede
    // leer, se asocia el cliente igual (la venta no se bloquea) pero SIN datos fiscales: mejor una
    // factura sin NIF que una con el NIF de otro.
    const ficha = rows<CustomerFicha>(
      await erplora().query('customers.get', { customer_id: c.id }).catch(() => []),
    )[0];

    this.emit({
      customer_id: c.id,
      customer_name: c.name,
      customer_tax_id: ficha?.tax_id ?? '',
      customer_address: ficha ? direccionFiscal(ficha) : '',
    });
  }

  private clear() {
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
        .value=${this.q}
        @ok-open=${(e: CustomEvent) => this.onOkOpen(e.detail.open)}
        @ok-input=${(e: CustomEvent) => this.onInput(e.detail.value)}>
        ${this.error ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.error}</ok-inline-feedback>` : nothing}
        <ion-list class="list" lines="none">
          ${this.results.map((c) => html`
            <ion-item button detail="false" class=${this.selectedId === c.id ? 'sel' : ''} @click=${() => void this.pick(c)}>
              <ion-label>
                <h3>${c.name}</h3>
                ${c.phone || c.email ? html`<p>${c.phone || c.email}</p>` : nothing}
              </ion-label>
              ${this.selectedId === c.id ? html`<ion-icon slot="end" name="checkmark-outline" color="primary"></ion-icon>` : nothing}
            </ion-item>`)}
          ${!this.loading && !this.results.length ? html`<ok-empty-state icon=${this.q ? 'search-outline' : 'people-outline'} message=${this.q ? t('ui.noResults') : t('ui.noCustomers')}></ok-empty-state>` : nothing}
          ${this.loading ? html`<div class="empty">${t('ui.loading')}</div>` : nothing}
        </ion-list>
        ${this.selectedId
          ? html`<ion-button slot="footer" class="clear" fill="clear" size="small" @click=${() => this.clear()}>${t('ui.removeCustomer')}</ion-button>`
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
