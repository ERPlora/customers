import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  lifecycle_stage: string;
  total_spent: number;
  total_purchases: number;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

const STAGE_LABEL: Record<string, string> = {
  lead: 'Lead', prospect: 'Prospecto', first_purchase: '1ª compra', active: 'Activo',
  at_risk: 'En riesgo', dormant: 'Inactivo', churned: 'Perdido', vip: 'VIP',
};

export class ErpCustomersList extends LitElement {
  static styles = css`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    .form { display:flex; gap:.5rem; flex-wrap:wrap; align-items:end; margin:.5rem 0 1rem; }
    .form ion-input { --background:var(--surface-2,#f7f4ec); border:1px solid var(--line,#e7e2d6); border-radius:8px; flex:1; min-width:8rem; }
    .err { color:#d9480f; font-weight:600; }
  `;

  @state() newName = '';

  @state() newEmail = '';

  @state() saving = false;

  @state() formError = '';

  @state() tick = 0;

  private ctrl!: ListController<Customer>;

  private unsub?: () => void;

  private columns: DataTableColumn[] = [
    { key: 'name', header: 'Nombre', sortable: true, filterable: true, filterType: 'text' },
    { key: 'email', header: 'Email', sortable: true, filterable: true, filterType: 'text' },
    { key: 'phone', header: 'Teléfono', sortable: true, filterable: true, filterType: 'text' },
    {
      key: 'lifecycle_stage',
      header: 'Etapa',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: Object.entries(STAGE_LABEL).map(([value, label]) => ({ value, label })),
      format: (r) => STAGE_LABEL[r.lifecycle_stage as string] ?? (r.lifecycle_stage as string),
    },
    {
      key: 'total_spent',
      header: 'Gastado',
      align: 'right',
      sortable: true,
      filterable: true,
      filterType: 'range',
      format: (r) => Number(r.total_spent || 0).toFixed(2),
    },
  ];

  // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
  // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
  // sola vez tras el primer render, considera firstUpdated() en su lugar.
  async connectedCallback() {
    super.connectedCallback();
    this.ctrl = createListController<Customer>(erplora(), 'customers.list', () => this.requestUpdate(), {
      pageSize: 50,
      sort: 'name',
      dir: 'asc',
    });
    await this.ctrl.load();
    try {
      const a = erplora().on('customer.created', () => this.ctrl.load());
      const b = erplora().on('customer.updated', () => this.ctrl.load());
      this.unsub = () => { a(); b(); };
    } catch { /* preview sin SDK */ }
  }

  disconnectedCallback() {
    super.disconnectedCallback(); this.unsub?.(); }

  private async create(ev: Event) {
    ev.preventDefault();
    if (!this.newName.trim()) return;
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('customers.create', {
        name: this.newName.trim(), email: this.newEmail.trim(), phone: '', tax_id: '',
        address: '', city: '', postal_code: '', country: '', avatar: '', notes: '',
        lifecycle_stage: 'lead', source: 'walk_in', company_name: '',
        birthday: null, anniversary: null, preferred_channel: 'none',
        marketing_consent: 0, consent_date: null,
      });
      this.newName = ''; this.newEmail = '';
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : 'No se pudo crear';
    } finally {
      this.saving = false;
    }
  }

  render() {
    return html`<div>
        <header>
          <h2>Clientes</h2>
        </header>
        <form class="form" @submit=${(e) => this.create(e)}>
          <ion-input placeholder="Nombre" .value=${this.newName} @ionInput=${(e: any) => (this.newName = e.target.value)}></ion-input>
          <ion-input type="email" placeholder="Email" .value=${this.newEmail} @ionInput=${(e: any) => (this.newEmail = e.target.value)}></ion-input>
          <ion-button type="submit" size="small" ?disabled=${this.saving || !this.newName}>${this.saving ? 'Guardando…' : 'Añadir'}</ion-button>
        </form>
        ${this.formError ? html`<p class="err">${this.formError}</p>` : nothing}
        ${this.ctrl?.error ? html`<p class="err">${this.ctrl.error}</p>` : nothing}
        <ok-data-table .serverSide=${true} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${"Buscar nombre o email…"} .emptyMessage=${this.ctrl?.loading ? 'Cargando…' : 'Sin clientes.'} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}></ok-data-table>
      </div>`;
  }
}

define('erp-customers-list', ErpCustomersList);
