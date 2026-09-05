import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
import { createListController, dataTableLabels } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
import { domainErrorText as declaredErrorText } from '../../lib/domain-error-text';

const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
  hasPermission?(permission: string): boolean;
  /** i18n del módulo (ADR-0055): idioma activo + traducción del catálogo `ui`. */
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
}

/** Un grupo es SEGMENTACIÓN de identidad, no precio: no lleva descuento (customers#17). El
 *  cálculo monetario es de `pricing`, y hoy `pricing` no tiene un solo consumidor. */
interface Group {
  id: string; name: string; description: string;
  color: string; sort_order: number; is_active: number; customer_count: number;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

function can(permission: string): boolean {
  return erplora().hasPermission?.(permission) ?? true;
}

/** A business rejection (hub#139) carries a stable `code` (`customers.group_unavailable`…): translate it with
 *  the sentence the module DECLARES for that code (`locales/<lang>.json → errors.<code>`,
 *  ADR-0398), which splices the handler's detail into `{message}`; anything else falls back to the
 *  error text or the generic key.
 *
 *  Read from the catalogue, NOT through `erplora().t()`: `t()` splits its key on `.` and walks the
 *  path, which only ever worked while these texts sat in a nested `errors.customers.<name>` bucket.
 *  Against the flat contract the walk dies on the second segment and the operator reads the
 *  handler's English (customers#68). */
function domainErrorText(e: unknown, fallbackKey: string): string {
  const declared = declaredErrorText(CATALOG, erplora().locale, e);
  if (declared) return declared;
  return (e instanceof Error ? e.message : '') || erplora().t(CATALOG, fallbackKey);
}

/** CRUD de grupos de clientes (groups.list/create/update/delete). */
export class ErpCustomersGroups extends LitElement {
  static styles = css`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    /* La tabla llena el alto de la vista: scroll interno en las filas + pie siempre visible. */
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    .panel { flex:0 0 auto; border:1px solid var(--ion-border-color,#e7e2d6); border-radius: var(--ok-radius-sm, 10px); padding:.75rem 1rem; margin:0 0 1rem; background:var(--ok-surface-2, var(--ion-color-step-50, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.04))); }
    .panel h3 { margin:.25rem 0 .5rem; font-size:1rem; }
    /* El panel del data-table es una columna estrecha: los campos van apilados, no en fila. */
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form h3 { margin:0; font-size:1rem; }
    .err { color:#d9480f; font-weight:600; }
    .ok { color:#2b8a3e; font-weight:600; }
  `;

  @state() saving = false;

  @state() formError = '';

  @state() formMsg = '';

  /** null = alta; Group = edición de esa fila. El MISMO panel (`slot="create"`) sirve para las dos. */
  @state() editing: Group | null = null;

  @state() pendingDelete: Group | null = null;

  @state() fName = '';

  @state() fDescription = '';

  @state() fColor = 'primary';

  @state() fSortOrder = '0';

  @state() fActive = true;

  private ctrl!: ListController<Group>;

  private get columns(): DataTableColumn[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
      { key: 'name', header: t('ui.colName'), sortable: true, filterable: true, filterType: 'text' },
      { key: 'description', header: t('ui.colDescription'), sortable: true },
      { key: 'customer_count', header: t('ui.colCustomers'), align: 'right', sortable: true },
      { key: 'sort_order', header: t('ui.colOrder'), align: 'right', sortable: true },
    ];
  }

  private get rowActions(): DataTableAction[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const actions: DataTableAction[] = [];
    if (can('customers.change_customergroup')) {
      actions.push({ id: 'edit', label: t('ui.actionEdit'), icon: 'create-outline' });
    }
    if (can('customers.delete_customergroup')) {
      actions.push({ id: 'delete', label: t('ui.actionDelete'), icon: 'trash-outline', color: 'danger' });
    }
    return actions;
  }

  private readonly onLocaleChange = (): void => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    this.ctrl = createListController<Group>(erplora(), 'customers.groups.list', () => this.requestUpdate(), {
      pageSize: 50,
      sort: 'name',
      dir: 'asc',
    });
    await this.ctrl.load();
  }

  disconnectedCallback(): void {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    super.disconnectedCallback();
  }

  /** Referencia al ok-data-table para abrir/cerrar su panel lateral (alta y edición). */
  private dataTable(): { open(p?: 'filters' | 'create'): void; close(): void } | null {
    return this.renderRoot.querySelector('ok-data-table') as
      | { open(p?: 'filters' | 'create'): void; close(): void }
      | null;
  }

  private resetForm() {
    this.editing = null;
    this.fName = ''; this.fDescription = '';
    this.fColor = 'primary'; this.fSortOrder = '0'; this.fActive = true;
    this.formError = '';
  }

  private startEdit(g: Group) {
    if (!can('customers.change_customergroup')) return;
    this.editing = g;
    this.fName = g.name; this.fDescription = g.description ?? '';
    this.fColor = g.color || 'primary';
    this.fSortOrder = String(g.sort_order ?? 0); this.fActive = Boolean(g.is_active);
    this.formError = '';
    this.formMsg = '';
    this.dataTable()?.open('create'); // el panel de alta, ya relleno con la fila
  }

  private onRowAction(ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) {
    const g = ev.detail.row as unknown as Group;
    if (ev.detail.actionId === 'edit' && can('customers.change_customergroup')) this.startEdit(g);
    if (ev.detail.actionId === 'delete' && can('customers.delete_customergroup')) {
      this.pendingDelete = g; this.formMsg = ''; this.formError = '';
    }
  }

  private async save(ev: Event) {
    ev.preventDefault();
    if (!this.fName.trim()) return;
    const editing = this.editing;
    if (!can(editing ? 'customers.change_customergroup' : 'customers.add_customergroup')) return;
    this.saving = true;
    this.formError = '';
    try {
      if (editing) {
        await erplora().command('customers.groups.update', {
          group_id: editing.id,
          name: this.fName.trim(), description: this.fDescription.trim(),
          color: this.fColor.trim() || 'primary',
          sort_order: Number(this.fSortOrder) || 0, is_active: this.fActive ? 1 : 0,
        });
        this.formMsg = erplora().t(CATALOG, 'ui.groupUpdated');
      } else {
        await erplora().command('customers.groups.create', {
          name: this.fName.trim(), description: this.fDescription.trim(),
          color: this.fColor.trim() || 'primary',
          sort_order: Number(this.fSortOrder) || 0,
        });
        this.formMsg = erplora().t(CATALOG, 'ui.groupCreated');
      }
      this.resetForm();
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errSaveGroup');
    } finally {
      this.saving = false;
    }
  }

  private async confirmDelete() {
    if (!this.pendingDelete || !can('customers.delete_customergroup')) return;
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('customers.groups.delete', { group_id: this.pendingDelete.id });
      this.formMsg = erplora().t(CATALOG, 'ui.groupDeleted', { name: this.pendingDelete.name });
      this.pendingDelete = null;
      await this.ctrl.load();
    } catch (e) {
      this.formError = domainErrorText(e, 'ui.errDeleteGroup');
    } finally {
      this.saving = false;
    }
  }

  /** Formulario del panel `create`: SIEMPRE proyectado (si solo se pintara al editar, el «+» de la
   *  barra abriría un panel vacío). En alta `editing` es null; en edición trae la fila. */
  private renderForm() {
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    const editing = this.editing;
    return html`<form slot="create" class="form" @submit=${(e: Event) => this.save(e)}>
      ${editing ? html`<h3>${t('ui.editGroupTitle', { name: editing.name })}</h3>` : nothing}
      <ion-input mode="md" fill="outline" label=${t('ui.colName')} label-placement="floating" .value=${this.fName} @ionInput=${(e: any) => (this.fName = e.target.value)}></ion-input>
      <ion-input mode="md" fill="outline" label=${t('ui.fieldDescription')} label-placement="floating" .value=${this.fDescription} @ionInput=${(e: any) => (this.fDescription = e.target.value)}></ion-input>
      <ion-input mode="md" fill="outline" label=${t('ui.fieldColor')} label-placement="floating" .value=${this.fColor} @ionInput=${(e: any) => (this.fColor = e.target.value)}></ion-input>
      <ion-input mode="md" type="number" fill="outline" label=${t('ui.fieldOrder')} label-placement="floating" min="0" .value=${this.fSortOrder} @ionInput=${(e: any) => (this.fSortOrder = e.target.value)}></ion-input>
      ${editing ? html`<ion-checkbox .checked=${this.fActive} @ionChange=${(e: any) => (this.fActive = e.target.checked)}>${t('ui.fieldActive')}</ion-checkbox>` : nothing}
      <ion-button type="submit" size="small" ?disabled=${this.saving || !this.fName.trim()}>${this.saving ? t('ui.saving') : t('ui.save')}</ion-button>
      ${editing ? html`<ion-button size="small" fill="outline" @click=${() => this.resetForm()}>${t('ui.cancel')}</ion-button>` : nothing}
    </form>`;
  }

  private renderDeleteConfirm() {
    if (!this.pendingDelete) return nothing;
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    return html`<section class="panel">
      <h3>${t('ui.deleteGroupTitle')}</h3>
      <p>${t('ui.deleteGroupConfirm', { name: this.pendingDelete.name })}</p>
      <ion-button size="small" color="danger" ?disabled=${this.saving} @click=${() => this.confirmDelete()}>${this.saving ? t('ui.deleting') : t('ui.delete')}</ion-button>
      <ion-button size="small" fill="outline" @click=${() => (this.pendingDelete = null)}>${t('ui.cancel')}</ion-button>
    </section>`;
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    // Sin `<h2>`: el título de la vista lo pinta el topbar del shell.
    return html`<div class="page">
      ${this.formError ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : nothing}
      ${this.formMsg ? html`<p class="ok">${this.formMsg}</p>` : nothing}
      ${this.renderDeleteConfirm()}
      ${this.ctrl?.error ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : nothing}
      <!-- The «Edit» button is not the only door: rowClickable makes the whole row open the
           same edit panel (outfitkit#67 — the actions column can be off-screen at 1440 px). -->
      <ok-data-table .serverSide=${true} .fill=${true} .labels=${dataTableLabels(erplora().locale)} .views=${true} .cardTitle=${(r: Record<string, unknown>) => String(r.name ?? '—')} .cardIcon=${() => 'people-outline'} .addable=${can('customers.add_customergroup')} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${t('ui.searchGroup')} .actions=${this.rowActions} .rowClickable=${true} .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.emptyGroups')} @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => this.onRowAction(e)} @rowClick=${(e: CustomEvent<{ row: Record<string, unknown> }>) => { if (can('customers.change_customergroup')) this.startEdit(e.detail.row as unknown as Group); }} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @pageSizeChange=${(e: CustomEvent<number>) => this.ctrl.setPageSize(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}>
        ${this.renderForm()}
      </ok-data-table>
    </div>`;
  }
}

define('erp-customers-groups', ErpCustomersGroups);
