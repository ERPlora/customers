import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
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
  static styles = css`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    .trigger { --padding-start:.5rem; --padding-end:.5rem; }
    .trigger[data-assigned] { --color: var(--ion-color-primary,#0091ce); }
    .name { font-size:.8rem; font-weight:700; color:var(--ion-color-primary,#0091ce); max-width:9rem;
            overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .ctx { display:flex; align-items:center; gap:.15rem; }
    .scrim { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:60; }
    .sheet { background:var(--ion-background-color,#fff); border-radius:16px; padding:1rem; width:min(94vw,28rem); max-height:90vh; overflow:auto; box-shadow:0 12px 48px rgba(0,0,0,.35); }
    .sheet-h { display:flex; justify-content:space-between; align-items:center; margin-bottom:.4rem; }
    .sheet-h .t { font-size:1.2rem; font-weight:700; }
    .foot { display:flex; justify-content:space-between; align-items:center; margin-top:1rem; }
    .list { display:flex; flex-direction:column; gap:.4rem; margin-top:.6rem; max-height:55vh; overflow:auto; }
    .item { display:flex; flex-direction:column; gap:.1rem; border:1px solid var(--ion-border-color,#e0ddd4); border-radius:10px; padding:.6rem .7rem; background:var(--ion-background-color,#fff); cursor:pointer; font:inherit; color:inherit; text-align:left; width:100%; }
    .item[aria-pressed=true] { outline:3px solid var(--ion-color-primary,#0091ce); outline-offset:1px; }
    .nm { font-weight:700; }
    .meta { font-size:.8rem; color:#8b897f; }
    .empty { color:#8b897f; text-align:center; padding:1.5rem 0; }
    .err { color:#d9480f; }
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

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('erp:customer-context-reset', this.onReset);
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
  }

  disconnectedCallback() {
    this.removeEventListener('erp:customer-context-reset', this.onReset);
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    super.disconnectedCallback();
  }

  private async openPicker() {
    this.open = true;
    if (!this.results.length) await this.search('');
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

  private async pick(c: Customer) {
    this.selectedId = c.id;
    this.selectedName = c.name;
    this.open = false;

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
    this.open = false;
    this.emit(VACIO);
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const etiqueta = this.selectedName || t('ui.assignCustomer');
    return html`
      <div class="ctx">
        <ion-button class="trigger" fill="clear" size="small" aria-label=${etiqueta} title=${etiqueta}
          ?data-assigned=${!!this.selectedId} @click=${() => this.openPicker()}>
          <ion-icon slot="icon-only" name=${this.selectedId ? 'person' : 'person-add-outline'}></ion-icon>
        </ion-button>
        ${this.selectedName ? html`<span class="name" title=${this.selectedName}>${this.selectedName}</span>` : nothing}
      </div>

      ${this.open
        ? html`<div class="scrim" @click=${(e: Event) => { if ((e.target as HTMLElement).classList.contains('scrim')) this.open = false; }}>
            <div class="sheet" role="dialog" aria-modal="true" aria-label=${t('ui.chooseCustomer')}>
              <div class="sheet-h">
                <span class="t">${t('ui.chooseCustomer')}</span>
                <ion-button class="close" fill="clear" size="small" aria-label=${t('ui.close')}
                  @click=${() => { this.open = false; }}>
                  <ion-icon slot="icon-only" name="close-outline"></ion-icon>
                </ion-button>
              </div>

              <ion-searchbar placeholder=${t('ui.searchPosCustomer')} value=${this.q}
                @ionInput=${(e: CustomEvent) => this.onInput((e.target as HTMLInputElement).value || '')}></ion-searchbar>

              ${this.error ? html`<p class="err">${this.error}</p>` : nothing}

              <div class="list">
                ${this.results.map((c) => html`
                  <button class="item" aria-pressed=${this.selectedId === c.id} @click=${() => void this.pick(c)}>
                    <span class="nm">${c.name}</span>
                    ${c.phone || c.email ? html`<span class="meta">${c.phone || c.email}</span>` : nothing}
                  </button>`)}
                ${!this.loading && !this.results.length ? html`<div class="empty">${this.q ? t('ui.noResults') : t('ui.noCustomers')}</div>` : nothing}
                ${this.loading ? html`<div class="empty">${t('ui.loading')}</div>` : nothing}
              </div>

              <div class="foot">
                <ion-button class="clear" fill="clear" size="small" ?disabled=${!this.selectedId}
                  @click=${() => this.clear()}>${t('ui.removeCustomer')}</ion-button>
              </div>
            </div>
          </div>`
        : nothing}
    `;
  }
}

define('erp-customers-pos-search', ErpCustomersPosSearch);

declare global {
  interface HTMLElementTagNameMap {
    'erp-customers-pos-search': ErpCustomersPosSearch;
  }
}
