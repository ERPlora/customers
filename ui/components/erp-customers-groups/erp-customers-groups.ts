import { LitElement, html, css, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
import { createListController, dataTableLabels, dataTableShowsLoadError } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
import { domainErrorText as declaredErrorText } from '../../lib/domain-error-text';

const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

/** The refusal `on_unique` raises when another live group of the hub already has the name (customers#94). */
const NAME_TAKEN = 'customers.group_name_taken';

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
    /* pm#392 — a danger button paints from HERE, never from \`color="danger"\`: Ionic resolves
       \`color=\` through a GLOBAL \`.ion-color-danger\` rule that does not reach inside this shadow
       root, so a solid button came out as white text on a transparent background (invisible).
       Custom properties do inherit through the boundary, so the theme token still applies. */
    ion-button.tone-danger:not([fill]) {
      --background: var(--ion-color-danger, #c5000f);
      --background-activated: var(--ion-color-danger-shade, #ad000d);
      --background-focused: var(--ion-color-danger-shade, #ad000d);
      --background-hover: var(--ion-color-danger-tint, #cb1a27);
      --color: var(--ion-color-danger-contrast, #fff);
    }
  `;

  @state() saving = false;

  @state() formError = '';

  /** customers#94: the name is taken by another live group of this hub. Said ON the «Name» field
   *  (the one that has to change), not in the `formError` banner at the foot of the form. */
  @state() nameError = '';

  /** What went wrong in a ROW action (delete, confirmed on the page): no panel is open then, so it
   *  is painted on the page. `formError` is only what the panel's form was refused (pm#478). */
  @state() pageError = '';

  @state() formMsg = '';

  /** null = alta; Group = edición de esa fila. El MISMO panel (`slot="create"`) sirve para las dos. */
  @state() editing: Group | null = null;

  /** pm#450: whether the table's panel HEADER already carries the editing title (OutfitKit
   *  >= 0.1.94, outfitkit#150). Set only after checking the rendered dialog — never assumed — so
   *  an older shell (hub:stable ships 0.1.73, which ignores the `title` and keeps «New») still
   *  gets the fallback line in the form body. */
  @state() editTitleInHeader = false;

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
  private dataTable(): {
    open(p?: 'filters' | 'create' | 'edit', opts?: { title?: string }): void;
    close(): void;
    updateComplete?: Promise<unknown>;
    shadowRoot: ShadowRoot | null;
  } | null {
    return this.renderRoot.querySelector('ok-data-table') as
      | {
          open(p?: 'filters' | 'create' | 'edit', opts?: { title?: string }): void;
          close(): void;
          updateComplete?: Promise<unknown>;
          shadowRoot: ShadowRoot | null;
        }
      | null;
  }

  /** pm#450: the table's «Add» emits no event and keeps our form state; after an edit it would
   *  show the edited record under a «New» header, and the submit would UPDATE it. */
  private onTableClick(e: Event): void {
    if (!this.editing) return;
    const addId = 'customers-groups-table-add';
    if (e.composedPath().some((n) => n instanceof HTMLElement && n.dataset.testid === addId)) this.resetForm();
  }

  /** Wired natively, not with a Lit `@click` on the tag: `<ok-data-table>` carries `testid`, not
   *  `data-testid` (outfitkit#143), and a template binding would read as an action element that
   *  demands one. */
  firstUpdated(): void {
    this.renderRoot.querySelector('ok-data-table')?.addEventListener('click', (e) => this.onTableClick(e));
  }

  private resetForm() {
    this.editing = null;
    this.fName = ''; this.fDescription = '';
    this.fColor = 'primary'; this.fSortOrder = '0'; this.fActive = true;
    this.formError = '';
    this.nameError = '';
  }

  private async startEdit(g: Group) {
    if (!can('customers.change_customergroup')) return;
    this.editing = g;
    this.fName = g.name; this.fDescription = g.description ?? '';
    this.fColor = g.color || 'primary';
    this.fSortOrder = String(g.sort_order ?? 0); this.fActive = Boolean(g.is_active);
    this.formError = '';
    this.nameError = '';
    this.formMsg = '';
    const title = erplora().t(CATALOG, 'ui.editGroupTitle', { name: g.name });
    const table = this.dataTable();
    table?.open('edit', { title });
    await table?.updateComplete;
    // OutfitKit < 0.1.94 ignores the title and keeps «New»: only drop the in-form line when the
    // header REALLY carries it (the dialog is labelled with it).
    this.editTitleInHeader = table?.shadowRoot?.querySelector('[role="dialog"]')?.getAttribute('aria-label') === title;
  }

  private onRowAction(ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) {
    const g = ev.detail.row as unknown as Group;
    if (ev.detail.actionId === 'edit' && can('customers.change_customergroup')) void this.startEdit(g);
    if (ev.detail.actionId === 'delete' && can('customers.delete_customergroup')) {
      this.pendingDelete = g; this.formMsg = ''; this.pageError = '';
    }
  }

  private async save(ev: Event) {
    ev.preventDefault();
    if (!this.fName.trim()) return;
    const editing = this.editing;
    if (!can(editing ? 'customers.change_customergroup' : 'customers.add_customergroup')) return;
    this.saving = true;
    this.formError = '';
    this.nameError = '';
    this.pageError = ''; // a save is the next thing the person did: an older row refusal is stale
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
      const text = domainErrorText(e, 'ui.errSaveGroup');
      if ((e as { code?: unknown } | null)?.code === NAME_TAKEN) this.nameError = text;
      else this.formError = text;
    } finally {
      this.saving = false;
    }
  }

  private async confirmDelete() {
    if (!this.pendingDelete || !can('customers.delete_customergroup')) return;
    this.saving = true;
    this.pageError = '';
    try {
      await erplora().command('customers.groups.delete', { group_id: this.pendingDelete.id });
      this.formMsg = erplora().t(CATALOG, 'ui.groupDeleted', { name: this.pendingDelete.name });
      this.pendingDelete = null;
      await this.ctrl.load();
    } catch (e) {
      this.pageError = domainErrorText(e, 'ui.errDeleteGroup');
    } finally {
      this.saving = false;
    }
  }

  /** Formulario del panel `create`: SIEMPRE proyectado (si solo se pintara al editar, el «+» de la
   *  barra abriría un panel vacío). En alta `editing` es null; en edición trae la fila. */
  private renderForm() {
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    const editing = this.editing;
    return html`<form slot="create" class="form" data-testid="customers-groups-form" @submit=${(e: Event) => this.save(e)}>
      ${editing && !this.editTitleInHeader ? html`<h3 data-testid="customers-groups-editing">${t('ui.editGroupTitle', { name: editing.name })}</h3>` : nothing}
      <ion-input mode="md" fill="outline" data-testid="customers-groups-name" class=${classMap({ 'ion-invalid': !!this.nameError, 'ion-touched': !!this.nameError })} error-text=${this.nameError || nothing} label=${t('ui.colName')} label-placement="floating" .value=${this.fName} @ionInput=${(e: any) => { this.fName = e.target.value; this.nameError = ''; }}></ion-input>
      <ion-input mode="md" fill="outline" data-testid="customers-groups-description" label=${t('ui.fieldDescription')} label-placement="floating" .value=${this.fDescription} @ionInput=${(e: any) => (this.fDescription = e.target.value)}></ion-input>
      <ion-input mode="md" fill="outline" data-testid="customers-groups-color" label=${t('ui.fieldColor')} label-placement="floating" .value=${this.fColor} @ionInput=${(e: any) => (this.fColor = e.target.value)}></ion-input>
      <ion-input mode="md" type="number" fill="outline" data-testid="customers-groups-order" label=${t('ui.fieldOrder')} label-placement="floating" min="0" .value=${this.fSortOrder} @ionInput=${(e: any) => (this.fSortOrder = e.target.value)}></ion-input>
      ${editing ? html`<ion-checkbox data-testid="customers-groups-active" .checked=${this.fActive} @ionChange=${(e: any) => (this.fActive = e.target.checked)}>${t('ui.fieldActive')}</ion-checkbox>` : nothing}
      <!-- pm#478: the refusal travels WITH the form — on a phone the panel is a full-screen sheet
           and a banner on the page underneath it is never seen. -->
      ${this.formError ? html`<ok-inline-feedback data-testid="customers-groups-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : nothing}
      <ion-button type="submit" size="small" data-testid="customers-groups-submit" ?disabled=${this.saving || !this.fName.trim()}>${this.saving ? t('ui.saving') : t('ui.save')}</ion-button>
      ${editing ? html`<ion-button size="small" fill="outline" data-testid="customers-groups-cancel" @click=${() => this.resetForm()}>${t('ui.cancel')}</ion-button>` : nothing}
    </form>`;
  }

  private renderDeleteConfirm() {
    if (!this.pendingDelete) return nothing;
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    return html`<section class="panel">
      <h3>${t('ui.deleteGroupTitle')}</h3>
      <p>${t('ui.deleteGroupConfirm', { name: this.pendingDelete.name })}</p>
      <ion-button size="small" class="tone-danger" data-testid="customers-groups-delete-submit" ?disabled=${this.saving} @click=${() => this.confirmDelete()}>${this.saving ? t('ui.deleting') : t('ui.delete')}</ion-button>
      <ion-button size="small" fill="outline" data-testid="customers-groups-delete-cancel" @click=${() => (this.pendingDelete = null)}>${t('ui.cancel')}</ion-button>
    </section>`;
  }

  /** pm#478: the refusal appears ABOVE the button that was pressed, at the foot of the form — on a
   *  phone that can leave it off the sheet. Bring it into view once it has painted itself: scrolled
   *  before, the banner still measures 0 px and ends up under the tab bar. */
  updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('formError') && this.formError) void this.revealFormError();
    if (changed.has('nameError') && this.nameError) {
      this.renderRoot.querySelector('[data-testid="customers-groups-name"]')?.scrollIntoView?.({ block: 'center' });
    }
  }

  private async revealFormError(): Promise<void> {
    const banner = this.renderRoot.querySelector('[data-testid="customers-groups-form-error"]') as
      | (HTMLElement & { updateComplete?: Promise<unknown> })
      | null;
    await banner?.updateComplete;
    banner?.scrollIntoView?.({ block: 'center' });
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    // Sin `<h2>`: el título de la vista lo pinta el topbar del shell.
    return html`<div class="page">
      ${this.pageError ? html`<ok-inline-feedback data-testid="customers-groups-page-error" tone="danger" icon="alert-circle-outline">${this.pageError}</ok-inline-feedback>` : nothing}
      ${this.formMsg ? html`<p class="ok" data-testid="customers-groups-form-msg">${this.formMsg}</p>` : nothing}
      ${this.renderDeleteConfirm()}
      ${this.ctrl?.error && !dataTableShowsLoadError() ? html`<ok-inline-feedback data-testid="customers-groups-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : nothing}
      <!-- The «Edit» button is not the only door: rowClickable makes the whole row open the
           same edit panel (outfitkit#67 — the actions column can be off-screen at 1440 px). -->
      <ok-data-table testid="customers-groups-table" .error=${this.ctrl?.error ?? ''} @retry=${() => this.ctrl?.load()} .serverSide=${true} .fill=${true} .labels=${dataTableLabels(erplora().locale)} .views=${true} .cardTitle=${(r: Record<string, unknown>) => String(r.name ?? '—')} .cardIcon=${() => 'people-outline'} .addable=${can('customers.add_customergroup')} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${t('ui.searchGroup')} .actions=${this.rowActions} .rowClickable=${true} .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.emptyGroups')} @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => this.onRowAction(e)} @rowClick=${(e: CustomEvent<{ row: Record<string, unknown> }>) => { if (can('customers.change_customergroup')) void this.startEdit(e.detail.row as unknown as Group); }} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @pageSizeChange=${(e: CustomEvent<number>) => this.ctrl.setPageSize(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}>
        ${this.renderForm()}
      </ok-data-table>
    </div>`;
  }
}

define('erp-customers-groups', ErpCustomersGroups);
