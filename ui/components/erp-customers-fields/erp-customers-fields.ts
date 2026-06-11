import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
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

const TYPE_LABEL: Record<string, string> = {
  text: 'Texto', number: 'Número', date: 'Fecha', boolean: 'Sí/No',
  select: 'Selección', textarea: 'Texto largo',
};

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

  private columns: DataTableColumn[] = [
    { key: 'name', header: 'Nombre', sortable: true, filterable: true, filterType: 'text' },
    {
      key: 'field_type',
      header: 'Tipo',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })),
      format: (r) => TYPE_LABEL[r.field_type as string] ?? (r.field_type as string),
    },
    { key: 'is_required', header: 'Obligatorio', sortable: true, format: (r) => (r.is_required ? 'Sí' : 'No') },
    { key: 'sort_order', header: 'Orden', align: 'right', sortable: true },
  ];

  private rowActions: DataTableAction[] = [
    { id: 'edit', label: 'Editar' },
    { id: 'delete', label: 'Eliminar', color: 'danger' },
  ];

  async connectedCallback() {
    super.connectedCallback();
    this.ctrl = createListController<Field>(erplora(), 'customers.fields.list', () => this.requestUpdate(), {
      pageSize: 50,
      sort: 'sort_order',
      dir: 'asc',
    });
    await this.ctrl.load();
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
        this.formMsg = 'Campo creado';
      } else {
        await erplora().command('customers.fields.update', {
          field_id: this.editing.id,
          name: this.fName.trim(), field_type: this.fType, options: this.optionsPayload(),
          is_required: this.fRequired ? 1 : 0, sort_order: Number(this.fSortOrder) || 0,
          is_active: this.fActive ? 1 : 0,
        });
        this.formMsg = 'Campo actualizado';
      }
      this.resetForm();
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : 'No se pudo guardar el campo';
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
      this.formMsg = `Campo ${this.pendingDelete.name} eliminado`;
      this.pendingDelete = null;
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : 'No se pudo eliminar el campo';
    } finally {
      this.saving = false;
    }
  }

  private renderForm() {
    if (!this.editing) return nothing;
    const isNew = this.editing === 'new';
    return html`<section class="panel">
      <h3>${isNew ? 'Nuevo campo personalizado' : `Editar · ${(this.editing as Field).name}`}</h3>
      <form class="form" @submit=${(e: Event) => this.save(e)}>
        <ion-input label="Nombre" label-placement="stacked" .value=${this.fName} @ionInput=${(e: any) => (this.fName = e.target.value)}></ion-input>
        <ion-select label="Tipo" label-placement="stacked" .value=${this.fType} @ionChange=${(e: any) => (this.fType = e.target.value)}>
          ${Object.entries(TYPE_LABEL).map(([v, l]) => html`<ion-select-option value=${v}>${l}</ion-select-option>`)}
        </ion-select>
        ${this.fType === 'select' ? html`<ion-input label="Opciones (separadas por coma)" label-placement="stacked" .value=${this.fOptions} @ionInput=${(e: any) => (this.fOptions = e.target.value)}></ion-input>` : nothing}
        <ion-input type="number" label="Orden" label-placement="stacked" min="0" .value=${this.fSortOrder} @ionInput=${(e: any) => (this.fSortOrder = e.target.value)}></ion-input>
        <label class="check"><ion-checkbox .checked=${this.fRequired} @ionChange=${(e: any) => (this.fRequired = e.target.checked)}></ion-checkbox> Obligatorio</label>
        ${isNew ? nothing : html`<label class="check"><ion-checkbox .checked=${this.fActive} @ionChange=${(e: any) => (this.fActive = e.target.checked)}></ion-checkbox> Activo</label>`}
        <ion-button type="submit" size="small" ?disabled=${this.saving || !this.fName.trim()}>${this.saving ? 'Guardando…' : 'Guardar'}</ion-button>
        <ion-button size="small" fill="outline" @click=${() => this.resetForm()}>Cancelar</ion-button>
      </form>
    </section>`;
  }

  private renderDeleteConfirm() {
    if (!this.pendingDelete) return nothing;
    return html`<section class="panel">
      <h3>Eliminar campo</h3>
      <p>¿Eliminar <strong>${this.pendingDelete.name}</strong>? Los valores guardados dejan de mostrarse.</p>
      <ion-button size="small" color="danger" ?disabled=${this.saving} @click=${() => this.confirmDelete()}>${this.saving ? 'Eliminando…' : 'Eliminar'}</ion-button>
      <ion-button size="small" fill="outline" @click=${() => (this.pendingDelete = null)}>Cancelar</ion-button>
    </section>`;
  }

  render() {
    return html`<div>
      <header>
        <h2>Campos personalizados</h2>
        <ion-button size="small" @click=${() => this.startNew()}>Nuevo campo</ion-button>
      </header>
      ${this.formError ? html`<p class="err">${this.formError}</p>` : nothing}
      ${this.formMsg ? html`<p class="ok">${this.formMsg}</p>` : nothing}
      ${this.renderForm()}
      ${this.renderDeleteConfirm()}
      ${this.ctrl?.error ? html`<p class="err">${this.ctrl.error}</p>` : nothing}
      <ok-data-table .serverSide=${true} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${"Buscar campo…"} .actions=${this.rowActions} .emptyMessage=${this.ctrl?.loading ? 'Cargando…' : 'Sin campos personalizados.'} @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => this.onRowAction(e)} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}></ok-data-table>
    </div>`;
  }
}

define('erp-customers-fields', ErpCustomersFields);
