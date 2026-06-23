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
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    h3 { margin:.25rem 0 .5rem; font-size:1rem; }
    .panel { border:1px solid var(--line,#e7e2d6); border-radius:10px; padding:.75rem 1rem; margin:0 0 1rem; background:var(--surface-2,#faf8f2); }
    .form { display:flex; gap:.5rem; flex-wrap:wrap; align-items:end; }
    .form ion-input, .form ion-select { --background:#fff; border:1px solid var(--line,#e7e2d6); border-radius:8px; min-width:9rem; }
    .check { display:inline-flex; align-items:center; gap:.35rem; }
    .hint { font-size:.8rem; opacity:.65; width:100%; margin:.15rem 0 0; }
    .err { color:#d9480f; font-weight:600; }
    .ok { color:#2b8a3e; font-weight:600; }
  `;

  @state() saving = false;

  @state() formError = '';

  @state() formMsg = '';

  @state() editing: Field | 'new' | null = null;

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
      { key: 'is_required', header: t('ui.colRequired'), sortable: true, format: (r) => (r.is_required ? t('ui.yes') : t('ui.no')) },
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

  private resetForm() {
    this.editing = null;
    this.fName = ''; this.fType = 'text'; this.fOptions = '';
    this.fRequired = false; this.fSortOrder = '0'; this.fActive = true;
    this.formError = '';
  }

  private startNew() {
    this.resetForm();
    this.editing = 'new';
    this.formMsg = '';
  }

  private startEdit(f: Field) {
    this.editing = f;
    this.fName = f.name; this.fType = f.field_type || 'text';
    this.fOptions = this.optionsToText(f.options);
    this.fRequired = Boolean(f.is_required); this.fSortOrder = String(f.sort_order ?? 0);
    this.fActive = Boolean(f.is_active);
    this.formError = '';
    this.formMsg = '';
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
    if (!this.fName.trim() || !this.editing) return;
    this.saving = true;
    this.formError = '';
    try {
      if (this.editing === 'new') {
        await erplora().command('customers.fields.create', {
          name: this.fName.trim(), field_type: this.fType, options: this.optionsPayload(),
          is_required: this.fRequired ? 1 : 0, sort_order: Number(this.fSortOrder) || 0,
        });
        this.formMsg = erplora().t(CATALOG, 'ui.fieldCreated');
      } else {
        await erplora().command('customers.fields.update', {
          field_id: this.editing.id,
          name: this.fName.trim(), field_type: this.fType, options: this.optionsPayload(),
          is_required: this.fRequired ? 1 : 0, sort_order: Number(this.fSortOrder) || 0,
          is_active: this.fActive ? 1 : 0,
        });
        this.formMsg = erplora().t(CATALOG, 'ui.fieldUpdated');
      }
      this.resetForm();
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

  private renderForm() {
    if (!this.editing) return nothing;
    const isNew = this.editing === 'new';
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    return html`<section class="panel">
      <h3>${isNew ? t('ui.newFieldTitle') : t('ui.editFieldTitle', { name: (this.editing as Field).name })}</h3>
      <form class="form" @submit=${(e: Event) => this.save(e)}>
        <ion-input label=${t('ui.colName')} label-placement="stacked" .value=${this.fName} @ionInput=${(e: any) => (this.fName = e.target.value)}></ion-input>
        <ion-select label=${t('ui.fieldType')} label-placement="stacked" .value=${this.fType} @ionChange=${(e: any) => (this.fType = e.target.value)}>
          ${Object.keys(TYPE_KEY).map((v) => html`<ion-select-option value=${v}>${typeLabel(v)}</ion-select-option>`)}
        </ion-select>
        ${this.fType === 'select' ? html`<ion-input label=${t('ui.fieldOptions')} label-placement="stacked" .value=${this.fOptions} @ionInput=${(e: any) => (this.fOptions = e.target.value)}></ion-input>` : nothing}
        <ion-input type="number" label=${t('ui.fieldOrder')} label-placement="stacked" min="0" .value=${this.fSortOrder} @ionInput=${(e: any) => (this.fSortOrder = e.target.value)}></ion-input>
        <label class="check"><ion-checkbox .checked=${this.fRequired} @ionChange=${(e: any) => (this.fRequired = e.target.checked)}></ion-checkbox> ${t('ui.fieldRequired')}</label>
        ${isNew ? nothing : html`<label class="check"><ion-checkbox .checked=${this.fActive} @ionChange=${(e: any) => (this.fActive = e.target.checked)}></ion-checkbox> ${t('ui.fieldActive')}</label>`}
        <ion-button type="submit" size="small" ?disabled=${this.saving || !this.fName.trim()}>${this.saving ? t('ui.saving') : t('ui.save')}</ion-button>
        <ion-button size="small" fill="outline" @click=${() => this.resetForm()}>${t('ui.cancel')}</ion-button>
      </form>
    </section>`;
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
    return html`<div>
      <header>
        <h2>${t('ui.fieldsTitle')}</h2>
        <ion-button size="small" @click=${() => this.startNew()}>${t('ui.newField')}</ion-button>
      </header>
      ${this.formError ? html`<p class="err">${this.formError}</p>` : nothing}
      ${this.formMsg ? html`<p class="ok">${this.formMsg}</p>` : nothing}
      ${this.renderForm()}
      ${this.renderDeleteConfirm()}
      ${this.ctrl?.error ? html`<p class="err">${this.ctrl.error}</p>` : nothing}
      <ok-data-table .serverSide=${true} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${t('ui.searchField')} .actions=${this.rowActions} .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.emptyFields')} @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => this.onRowAction(e)} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}></ok-data-table>
    </div>`;
  }
}

define('erp-customers-fields', ErpCustomersFields);
