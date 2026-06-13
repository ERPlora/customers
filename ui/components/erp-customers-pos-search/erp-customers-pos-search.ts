import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';

// erp-customers-pos-search — selector de CLIENTE (ficha) inyectado en la pantalla de venta
// (ADR-0043). El módulo `customers` declara en su manifest que rellena el slot
// `sales.pos.customer_context`; el shell monta este Web Component dentro del POS de `sales`.
// El POS NO conoce a `customers`: la comunicación es por eventos del DOM (contrato), igual que
// el selector de mesa (`erp-tables-pos-zones`) sobre `sales.pos.order_context`.
//
//   ─ emite `erp:customer-context` {customer_id, customer_name} → el POS lo adjunta a la venta.
//   ─ escucha `erp:customer-context-reset`                      → el POS lo dispara tras cobrar.
//
// UI: un botón que abre un modal con buscador (customers.list) y la lista de clientes; al elegir
// uno se muestra su ficha mínima (nombre + teléfono/email). Los clientes salen de la query pública
// de `customers` (no toca sus tablas).

interface Customer { id: string; name: string; phone?: string; email?: string; }

interface ErploraLike {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
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

export class ErpCustomersPosSearch extends LitElement {
  static styles = css`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    .open { width:100%; }
    .scrim { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:60; }
    .sheet { background:var(--ion-background-color,#fff); border-radius:16px; padding:1rem; width:min(94vw,28rem); max-height:90vh; overflow:auto; box-shadow:0 12px 48px rgba(0,0,0,.35); }
    .sheet-h { display:flex; justify-content:space-between; align-items:center; margin-bottom:.8rem; }
    .sheet-h .t { font-size:1.2rem; font-weight:700; }
    .x { background:none; border:none; font-size:1.3rem; cursor:pointer; color:#8b897f; }
    .list { display:flex; flex-direction:column; gap:.4rem; margin-top:.6rem; max-height:55vh; overflow:auto; }
    .item { display:flex; flex-direction:column; gap:.1rem; border:1px solid var(--ion-border-color,#e0ddd4); border-radius:10px; padding:.5rem .7rem; background:var(--ion-background-color,#fff); cursor:pointer; font:inherit; color:inherit; text-align:left; width:100%; }
    .item[aria-pressed=true] { outline:3px solid var(--ion-color-primary,#0091ce); outline-offset:1px; }
    .nm { font-weight:700; }
    .meta { font-size:.8rem; color:#8b897f; }
    .empty { color:#8b897f; text-align:center; padding:1.5rem 0; }
    .foot { display:flex; justify-content:space-between; align-items:center; margin-top:1rem; }
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

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('erp:customer-context-reset', this.onReset);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('erp:customer-context-reset', this.onReset);
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
        .query('customers.list', { search: q, page_size: 20, sort: 'name', dir: 'asc' })
        .catch(() => []);
      this.results = rows<Customer>(r);
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'No se pudieron cargar los clientes';
    } finally {
      this.loading = false;
    }
  }

  private onInput(v: string) {
    this.q = v;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.search(v), 300);
  }

  private emit(customer_id: string | null, customer_name: string) {
    this.dispatchEvent(new CustomEvent('erp:customer-context', {
      detail: { customer_id, customer_name }, bubbles: true, composed: true,
    }));
  }

  private pick(c: Customer) {
    this.selectedId = c.id;
    this.selectedName = c.name;
    this.emit(c.id, c.name);
    this.open = false;
  }

  private clear() {
    this.selectedId = undefined;
    this.selectedName = '';
    this.emit(null, '');
    this.open = false;
  }

  render() {
    return html`
      <ion-button class="open" fill=${this.selectedId ? 'solid' : 'outline'} size="small" @click=${() => this.openPicker()}>
        ${this.selectedName || 'Asignar cliente'}
      </ion-button>

      ${this.open
        ? html`<div class="scrim" @click=${(e: Event) => { if ((e.target as HTMLElement).classList.contains('scrim')) this.open = false; }}>
            <div class="sheet">
              <div class="sheet-h">
                <span class="t">Elegir cliente</span>
                <button class="x" @click=${() => { this.open = false; }}>✕</button>
              </div>

              <ion-searchbar placeholder="Buscar por nombre, teléfono, email…" value=${this.q}
                @ionInput=${(e: CustomEvent) => this.onInput((e.target as HTMLInputElement).value || '')}></ion-searchbar>

              ${this.error ? html`<p style="color:#d9480f">${this.error}</p>` : nothing}

              <div class="list">
                ${this.results.map((c) => html`
                  <button class="item" aria-pressed=${this.selectedId === c.id} @click=${() => this.pick(c)}>
                    <span class="nm">${c.name}</span>
                    ${c.phone || c.email ? html`<span class="meta">${c.phone || c.email}</span>` : nothing}
                  </button>`)}
                ${!this.loading && !this.results.length ? html`<div class="empty">${this.q ? 'Sin resultados.' : 'No hay clientes.'}</div>` : nothing}
                ${this.loading ? html`<div class="empty">Cargando…</div>` : nothing}
              </div>

              <div class="foot">
                <ion-button fill="clear" size="small" ?disabled=${!this.selectedId} @click=${() => this.clear()}>Quitar cliente</ion-button>
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
