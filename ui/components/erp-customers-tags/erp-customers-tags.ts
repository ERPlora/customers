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

interface Tag { id: string; name: string; color: string; is_active: number }

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

/** CRUD de etiquetas de clientes (tags.list/create/update/delete). */
export class ErpCustomersTags extends LitElement {
  static styles = css`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    h3 { margin:.25rem 0 .5rem; font-size:1rem; }
    .panel { border:1px solid var(--line,#e7e2d6); border-radius:10px; padding:.75rem 1rem; margin:0 0 1rem; background:var(--surface-2,#faf8f2); }
    .form { display:flex; gap:.75rem; flex-wrap:wrap; align-items:end; }
    .form ion-input { flex:1 1 11rem; min-width:9rem; }
    .check { display:inline-flex; align-items:center; gap:.35rem; }
    .err { color:#d9480f; font-weight:600; }
    .ok { color:#2b8a3e; font-weight:600; }
  `;

  @state() saving = false;

  @state() formError = '';

  @state() formMsg = '';

  @state() editing: Tag | 'new' | null = null;

  @state() pendingDelete: Tag | null = null;

  @state() fName = '';

  @state() fColor = 'primary';

  @state() fActive = true;

  private ctrl!: ListController<Tag>;

  private get columns(): DataTableColumn[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
      { key: 'name', header: t('ui.colName'), sortable: true, filterable: true, filterType: 'text' },
      { key: 'color', header: t('ui.colColor'), sortable: true },
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
    this.ctrl = createListController<Tag>(erplora(), 'customers.tags.list', () => this.requestUpdate(), {
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

  private resetForm() {
    this.editing = null;
    this.fName = ''; this.fColor = 'primary'; this.fActive = true;
    this.formError = '';
  }

  private startNew() {
    this.resetForm();
    this.editing = 'new';
    this.formMsg = '';
  }

  private startEdit(t: Tag) {
    this.editing = t;
    this.fName = t.name; this.fColor = t.color || 'primary'; this.fActive = Boolean(t.is_active);
    this.formError = '';
    this.formMsg = '';
  }

  private onRowAction(ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) {
    const t = ev.detail.row as unknown as Tag;
    if (ev.detail.actionId === 'edit') this.startEdit(t);
    if (ev.detail.actionId === 'delete') { this.pendingDelete = t; this.formMsg = ''; this.formError = ''; }
  }

  private async save(ev: Event) {
    ev.preventDefault();
    if (!this.fName.trim() || !this.editing) return;
    this.saving = true;
    this.formError = '';
    try {
      if (this.editing === 'new') {
        await erplora().command('customers.tags.create', {
          name: this.fName.trim(), color: this.fColor.trim() || 'primary',
        });
        this.formMsg = erplora().t(CATALOG, 'ui.tagCreated');
      } else {
        await erplora().command('customers.tags.update', {
          tag_id: this.editing.id, name: this.fName.trim(),
          color: this.fColor.trim() || 'primary', is_active: this.fActive ? 1 : 0,
        });
        this.formMsg = erplora().t(CATALOG, 'ui.tagUpdated');
      }
      this.resetForm();
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errSaveTag');
    } finally {
      this.saving = false;
    }
  }

  private async confirmDelete() {
    if (!this.pendingDelete) return;
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('customers.tags.delete', { tag_id: this.pendingDelete.id });
      this.formMsg = erplora().t(CATALOG, 'ui.tagDeleted', { name: this.pendingDelete.name });
      this.pendingDelete = null;
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errDeleteTag');
    } finally {
      this.saving = false;
    }
  }

  private renderForm() {
    if (!this.editing) return nothing;
    const isNew = this.editing === 'new';
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    return html`<section class="panel">
      <h3>${isNew ? t('ui.newTagTitle') : t('ui.editTagTitle', { name: (this.editing as Tag).name })}</h3>
      <form class="form" @submit=${(e: Event) => this.save(e)}>
        <ion-input fill="outline" label=${t('ui.colName')} label-placement="floating" .value=${this.fName} @ionInput=${(e: any) => (this.fName = e.target.value)}></ion-input>
        <ion-input fill="outline" label=${t('ui.fieldColor')} label-placement="floating" .value=${this.fColor} @ionInput=${(e: any) => (this.fColor = e.target.value)}></ion-input>
        ${isNew ? nothing : html`<label class="check"><ion-checkbox .checked=${this.fActive} @ionChange=${(e: any) => (this.fActive = e.target.checked)}></ion-checkbox> ${t('ui.fieldActiveTag')}</label>`}
        <ion-button type="submit" size="small" ?disabled=${this.saving || !this.fName.trim()}>${this.saving ? t('ui.saving') : t('ui.save')}</ion-button>
        <ion-button size="small" fill="outline" @click=${() => this.resetForm()}>${t('ui.cancel')}</ion-button>
      </form>
    </section>`;
  }

  private renderDeleteConfirm() {
    if (!this.pendingDelete) return nothing;
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    return html`<section class="panel">
      <h3>${t('ui.deleteTagTitle')}</h3>
      <p>${t('ui.deleteTagConfirm', { name: this.pendingDelete.name })}</p>
      <ion-button size="small" color="danger" ?disabled=${this.saving} @click=${() => this.confirmDelete()}>${this.saving ? t('ui.deleting') : t('ui.delete')}</ion-button>
      <ion-button size="small" fill="outline" @click=${() => (this.pendingDelete = null)}>${t('ui.cancel')}</ion-button>
    </section>`;
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`<div>
      <header>
        <h2>${t('ui.tagsTitle')}</h2>
        <ion-button size="small" @click=${() => this.startNew()}>${t('ui.newTag')}</ion-button>
      </header>
      ${this.formError ? html`<p class="err">${this.formError}</p>` : nothing}
      ${this.formMsg ? html`<p class="ok">${this.formMsg}</p>` : nothing}
      ${this.renderForm()}
      ${this.renderDeleteConfirm()}
      ${this.ctrl?.error ? html`<p class="err">${this.ctrl.error}</p>` : nothing}
      <ok-data-table .serverSide=${true} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${t('ui.searchTag')} .actions=${this.rowActions} .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.emptyTags')} @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => this.onRowAction(e)} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}></ok-data-table>
    </div>`;
  }
}

define('erp-customers-tags', ErpCustomersTags);
