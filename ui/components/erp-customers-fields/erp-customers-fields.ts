import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';

const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
  /** i18n del módulo (ADR-0055): idioma activo + traducción del catálogo `ui`. */
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
}

interface Field {
  id: string; name: string; field_type: string; options: string;
  is_required: number; sort_order: number; is_active: number;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

/** value (enum, no traducir) → clave i18n `ui.*` para su etiqueta. */
const TYPE_KEY: Record<string, string> = {
  text: 'ui.typeText', number: 'ui.typeNumber', date: 'ui.typeDate', boolean: 'ui.typeBoolean',
  select: 'ui.typeSelect', textarea: 'ui.typeTextarea',
};

const typeLabel = (value: string): string => (TYPE_KEY[value] ? erplora().t(CATALOG, TYPE_KEY[value]) : value);

/** Gestión de campos personalizados de cliente (fields.list/create/update/delete). */
export class ErpCustomersFields extends LitElement {
  static styles = css`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    /* La tabla llena el alto de la vista: scroll interno en las filas + pie siempre visible. */
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    .panel { flex:0 0 auto; border:1px solid var(--ion-border-color,#e7e2d6); border-radius:10px; padding:.75rem 1rem; margin:0 0 1rem; background:var(--ok-surface-2, var(--ion-color-step-50, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.04))); }
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

  /** null = alta; Field = edición de esa fila. El MISMO panel (`slot="create"`) sirve para las dos. */
  @state() editing: Field | null = null;

  @state() pendingDelete: Field | null = null;

  @state() fName = '';

  @state() fType = 'text';

  @state() fOptions = '';

  @state() fRequired = false;

  @state() fSortOrder = '0';

  @state() fActive = true;

  private ctrl!: ListController<Field>;

  private get columns(): DataTableColumn[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
      { key: 'name', header: t('ui.colName'), sortable: true, filterable: true, filterType: 'text' },
      {
        key: 'field_type',
        header: t('ui.colType'),
        sortable: true,
        filterable: true,
        filterType: 'select',
        options: Object.keys(TYPE_KEY).map((value) => ({ value, label: typeLabel(value) })),
        format: (r) => typeLabel(r.field_type as string),
      },
      {
        key: 'is_required',
        header: t('ui.colRequired'),
        sortable: true,
        filterable: true,
        // Dominio CERRADO (0/1) que el servidor filtra por `eq`: se elige, no se teclea.
        filterType: 'select',
        options: [
          { value: '1', label: t('ui.yes') },
          { value: '0', label: t('ui.no') },
        ],
        format: (r) => (r.is_required ? t('ui.yes') : t('ui.no')),
      },
      { key: 'sort_order', header: t('ui.colOrder'), align: 'right', sortable: true },
    ];
  }

  private get rowActions(): DataTableAction[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
      { id: 'edit', label: t('ui.actionEdit') },
      { id: 'delete', label: t('ui.actionDelete'), color: 'danger' },
    ];
  }

  private readonly onLocaleChange = (): void => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    this.ctrl = createListController<Field>(erplora(), 'customers.fields.list', () => this.requestUpdate(), {
      pageSize: 50,
      sort: 'sort_order',
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
    this.fName = ''; this.fType = 'text'; this.fOptions = '';
    this.fRequired = false; this.fSortOrder = '0'; this.fActive = true;
    this.formError = '';
  }

  private startEdit(f: Field) {
    this.editing = f;
    this.fName = f.name; this.fType = f.field_type || 'text';
    this.fOptions = this.optionsToText(f.options);
    this.fRequired = Boolean(f.is_required); this.fSortOrder = String(f.sort_order ?? 0);
    this.fActive = Boolean(f.is_active);
    this.formError = '';
    this.formMsg = '';
    this.dataTable()?.open('create'); // el panel de alta, ya relleno con la fila
  }

  /** options en BD = JSON array serializado; en el form se edita una opción por coma. */
  private optionsToText(options: string): string {
    try {
      const arr = JSON.parse(options || '[]');
      return Array.isArray(arr) ? arr.join(', ') : '';
    } catch { return ''; }
  }

  private optionsPayload(): string {
    if (this.fType !== 'select') return '[]';
    const arr = this.fOptions.split(',').map((s) => s.trim()).filter(Boolean);
    return JSON.stringify(arr);
  }

  private onRowAction(ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) {
    const f = ev.detail.row as unknown as Field;
    if (ev.detail.actionId === 'edit') this.startEdit(f);
    if (ev.detail.actionId === 'delete') { this.pendingDelete = f; this.formMsg = ''; this.formError = ''; }
  }

  private async save(ev: Event) {
    ev.preventDefault();
    if (!this.fName.trim()) return;
    const editing = this.editing;
    this.saving = true;
    this.formError = '';
    try {
      if (editing) {
        await erplora().command('customers.fields.update', {
          field_id: editing.id,
          name: this.fName.trim(), field_type: this.fType, options: this.optionsPayload(),
          is_required: this.fRequired ? 1 : 0, sort_order: Number(this.fSortOrder) || 0,
          is_active: this.fActive ? 1 : 0,
        });
        this.formMsg = erplora().t(CATALOG, 'ui.fieldUpdated');
      } else {
        await erplora().command('customers.fields.create', {
          name: this.fName.trim(), field_type: this.fType, options: this.optionsPayload(),
          is_required: this.fRequired ? 1 : 0, sort_order: Number(this.fSortOrder) || 0,
        });
        this.formMsg = erplora().t(CATALOG, 'ui.fieldCreated');
      }
      this.resetForm();
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errSaveField');
    } finally {
      this.saving = false;
    }
  }

  private async confirmDelete() {
    if (!this.pendingDelete) return;
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('customers.fields.delete', { field_id: this.pendingDelete.id });
      this.formMsg = erplora().t(CATALOG, 'ui.fieldDeleted', { name: this.pendingDelete.name });
      this.pendingDelete = null;
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errDeleteField');
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
      ${editing ? html`<h3>${t('ui.editFieldTitle', { name: editing.name })}</h3>` : nothing}
      <ion-input fill="outline" label=${t('ui.colName')} label-placement="floating" .value=${this.fName} @ionInput=${(e: any) => (this.fName = e.target.value)}></ion-input>
      <ion-select fill="outline" label=${t('ui.fieldType')} label-placement="floating" .value=${this.fType} @ionChange=${(e: any) => (this.fType = e.target.value)}>
        ${Object.keys(TYPE_KEY).map((v) => html`<ion-select-option value=${v}>${typeLabel(v)}</ion-select-option>`)}
      </ion-select>
      ${this.fType === 'select' ? html`<ion-input fill="outline" label=${t('ui.fieldOptions')} label-placement="floating" .value=${this.fOptions} @ionInput=${(e: any) => (this.fOptions = e.target.value)}></ion-input>` : nothing}
      <ion-input type="number" fill="outline" label=${t('ui.fieldOrder')} label-placement="floating" min="0" .value=${this.fSortOrder} @ionInput=${(e: any) => (this.fSortOrder = e.target.value)}></ion-input>
      <ion-checkbox .checked=${this.fRequired} @ionChange=${(e: any) => (this.fRequired = e.target.checked)}>${t('ui.fieldRequired')}</ion-checkbox>
      ${editing ? html`<ion-checkbox .checked=${this.fActive} @ionChange=${(e: any) => (this.fActive = e.target.checked)}>${t('ui.fieldActive')}</ion-checkbox>` : nothing}
      <ion-button type="submit" size="small" ?disabled=${this.saving || !this.fName.trim()}>${this.saving ? t('ui.saving') : t('ui.save')}</ion-button>
      ${editing ? html`<ion-button size="small" fill="outline" @click=${() => this.resetForm()}>${t('ui.cancel')}</ion-button>` : nothing}
    </form>`;
  }

  private renderDeleteConfirm() {
    if (!this.pendingDelete) return nothing;
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    return html`<section class="panel">
      <h3>${t('ui.deleteFieldTitle')}</h3>
      <p>${t('ui.deleteFieldConfirm', { name: this.pendingDelete.name })}</p>
      <ion-button size="small" color="danger" ?disabled=${this.saving} @click=${() => this.confirmDelete()}>${this.saving ? t('ui.deleting') : t('ui.delete')}</ion-button>
      <ion-button size="small" fill="outline" @click=${() => (this.pendingDelete = null)}>${t('ui.cancel')}</ion-button>
    </section>`;
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    // Sin `<h2>`: el título de la vista lo pinta el topbar del shell.
    return html`<div class="page">
      ${this.formError ? html`<p class="err">${this.formError}</p>` : nothing}
      ${this.formMsg ? html`<p class="ok">${this.formMsg}</p>` : nothing}
      ${this.renderDeleteConfirm()}
      ${this.ctrl?.error ? html`<p class="err">${this.ctrl.error}</p>` : nothing}
      <ok-data-table .serverSide=${true} .fill=${true} .addable=${true} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${t('ui.searchField')} .actions=${this.rowActions} .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.emptyFields')} @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => this.onRowAction(e)} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @pageSizeChange=${(e: CustomEvent<number>) => this.ctrl.setPageSize(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}>
        ${this.renderForm()}
      </ok-data-table>
    </div>`;
  }
}

define('erp-customers-fields', ErpCustomersFields);
