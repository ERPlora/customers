import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-data-table';
import '@erplora/outfitkit/ok-kpi';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
import { createListController, dataTableLabels } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';

const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  /** TODAS las filas, sin tope (salvo que pases `limit`). Para lo que no es «una página»: la
   *  rejilla de productos del TPV, un `<ion-select>` de categorías fiscales, el mapa
   *  producto↔categoría. El viejo `page_size` NO era un parámetro del runtime: truncaba a 50. */
  queryAll<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T[]>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
  hasPermission?(permission: string): boolean;
  /** i18n del módulo (ADR-0055): idioma activo + traducción del catálogo `ui`. */
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
  /** Dinero (ADR-0059/0123): `formatMoney` recibe CÉNTIMOS y divide según la moneda. */
  currency: string;
  formatMoney(cents: number, opts?: { currency?: string; locale?: string }): string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  tax_id: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  notes: string;
  is_active: number;
  lifecycle_stage: string;
  source: string;
  company_name: string;
  birthday: string | null;
  anniversary: string | null;
  preferred_channel: string;
  marketing_consent: number;
  consent_date: string | null;
  total_purchases: number;
  total_spent: number;
  last_purchase_date: string | null;
  created_at?: string;
}

interface Stats { total: number; active: number; vip: number; total_revenue: number }

interface Group { id: string; name: string; discount_percent: number; color: string }

interface Tag { id: string; name: string; color: string }

// Campo personalizado + el valor de ESTE cliente (ADR-0132). `value` es siempre TEXT: el tipo lo
// gobierna `field_type`, que decide cómo se pinta y se valida.
interface FieldValue {
  id: string;
  name: string;
  field_type: string;
  options: string;
  is_required: number;
  sort_order: number;
  value: string;
}

/** Result of a CSV import (customers#15): what got in, what was skipped and why, what failed. */
interface ImportReport {
  total: number;
  created: number;
  skipped: { row: number; reason: string }[];
  failed: { rows: string; reason: string }[];
}

interface Activity {
  id: string; activity_type: string; title: string; description: string; created_at: string;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

/** A business rejection (hub#139) carries a stable `code` (`customers.field_required`…): translate it
 *  through `errors.<code>` in the module catalog, with the handler's message as `{message}`; anything
 *  else falls back to the error text or the generic key. */
function domainErrorText(e: unknown, fallbackKey: string): string {
  const code = (e as { code?: unknown } | null)?.code;
  const message = e instanceof Error ? e.message : '';
  if (typeof code === 'string' && code.startsWith('customers.')) {
    const key = `errors.${code}`;
    const text = erplora().t(CATALOG, key, { message });
    if (text && text !== key) return text;
  }
  return message || erplora().t(CATALOG, fallbackKey);
}

/** Visibilidad de UI; el runtime vuelve a validar el permiso en cada command. */
function can(permission: string): boolean {
  const client = erplora();
  return typeof client.hasPermission === 'function' ? client.hasPermission(permission) : true;
}

/** value (enum, no traducir) → clave i18n `ui.*` para su etiqueta. */
const STAGE_KEY: Record<string, string> = {
  lead: 'ui.stageLead', prospect: 'ui.stageProspect', first_purchase: 'ui.stageFirstPurchase',
  active: 'ui.stageActive', at_risk: 'ui.stageAtRisk', dormant: 'ui.stageDormant',
  churned: 'ui.stageChurned', vip: 'ui.stageVip',
};

const CHANNEL_KEY: Record<string, string> = {
  none: 'ui.channelNone', email: 'ui.channelEmail', sms: 'ui.channelSms',
  whatsapp: 'ui.channelWhatsapp', phone: 'ui.channelPhone',
};

const stageLabel = (value: string): string => (STAGE_KEY[value] ? erplora().t(CATALOG, STAGE_KEY[value]) : value);
const channelLabel = (value: string): string => (CHANNEL_KEY[value] ? erplora().t(CATALOG, CHANNEL_KEY[value]) : value);

/** Campos editables de la ficha (el schema update.json exige el set completo de binds). */
const EMPTY_FORM = {
  name: '', email: '', phone: '', tax_id: '', address: '', city: '', postal_code: '',
  country: '', notes: '', lifecycle_stage: 'lead', source: 'walk_in', company_name: '',
  birthday: '', anniversary: '', preferred_channel: 'none', marketing_consent: false,
  is_active: true,
};

type EditForm = typeof EMPTY_FORM;

export class ErpCustomersList extends LitElement {
  static styles = css`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    /* Lista: la tabla llena el alto (scroll interno en las filas + pie siempre visible); las KPIs
       y los avisos quedan fijos arriba. La ficha es un documento: scrollea entera. */
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    .page > .kpis, .page > .panel, .page > p { flex:0 0 auto; }
    .detail-page { flex:1 1 auto; min-height:0; overflow:auto; }
    .import-list { margin:.25rem 0 0; padding-left:1.1rem; font-size:.85rem; max-height:9rem; overflow:auto; }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    h3 { margin:.25rem 0 .5rem; font-size:1rem; }
    .kpis { display:grid; grid-template-columns:repeat(auto-fill, minmax(11rem, 1fr)); gap:.5rem; margin:0 0 1rem; }
    /* El panel de alta del data-table es una columna estrecha: los campos van apilados, no en fila. */
    .create-form { display:flex; flex-direction:column; gap:.7rem; }
    .form { display:flex; gap:.75rem; flex-wrap:wrap; align-items:end; margin:.5rem 0 1.25rem; }
    .form ion-input, .form ion-select, .form ion-textarea { flex:1 1 11rem; min-width:9rem; }
    .panel { border:1px solid var(--ion-border-color,#e7e2d6); border-radius: var(--ok-radius-sm, 10px); padding:.75rem 1rem; margin:0 0 1rem; background:var(--ok-surface-2, var(--ion-color-step-50, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.04))); }
    .grid2 { display:grid; grid-template-columns:repeat(auto-fill, minmax(13rem, 1fr)); gap:.75rem; }
    .meta { display:grid; grid-template-columns:repeat(auto-fill, minmax(12rem, 1fr)); gap:.25rem .75rem; margin:.5rem 0; }
    .meta dt { font-size:.72rem; text-transform:uppercase; opacity:.6; }
    .meta dd { margin:0 0 .4rem; font-weight:600; }
    .chips { display:flex; gap:.4rem; flex-wrap:wrap; margin:.35rem 0; }
    .check { display:inline-flex; align-items:center; gap:.35rem; margin:.15rem .9rem .15rem 0; }
    .timeline { list-style:none; margin:.5rem 0 0; padding:0; }
    .timeline li { border-left:3px solid var(--ion-border-color,#e7e2d6); padding:.25rem 0 .55rem .75rem; }
    .timeline .t { font-weight:600; }
    .timeline .d { font-size:.85rem; opacity:.85; }
    .timeline .when { font-size:.75rem; opacity:.55; }
    .err { color:#d9480f; font-weight:600; }
    .ok { color:#2b8a3e; font-weight:600; }
    footer.actions { display:flex; gap:.5rem; margin-top:.5rem; flex-wrap:wrap; }
  `;

  // — Lista —
  @state() newName = '';

  @state() newEmail = '';

  @state() saving = false;

  @state() formError = '';

  @state() formMsg = '';

  @state() stats: Stats | null = null;

  /** Borrado en dos pasos desde la lista o la ficha. */
  @state() pendingDelete: Customer | null = null;

  // — Detalle —
  @state() detail: Customer | null = null;

  @state() editing = false;

  @state() form: EditForm = { ...EMPTY_FORM };

  @state() activities: Activity[] = [];
  /** Campos personalizados del cliente abierto: definición + valor (ADR-0132). */
  @state() fieldValues: FieldValue[] = [];

  @state() groups: Group[] = [];

  @state() tags: Tag[] = [];

  @state() groupIds: string[] = [];

  @state() tagIds: string[] = [];

  @state() newNote = '';

  private ctrl!: ListController<Customer>;

  private unsub?: () => void;
  @state() private importing = false;
  @state() private importReport: ImportReport | null = null;

  /** HOST of the `customers.detail` slot (ADR-0043 §3bis). Other modules hang their block on the
   *  customer sheet here (appointments: the visit history) without `customers` knowing them: the
   *  fillers are resolved by literal slot name through the SDK, mounted in `.detail-slot`, and told
   *  WHICH customer is open by a `CustomEvent` on the filler element — never by props or calls. */
  private detailFillers: Array<{ component: string; el: HTMLElement }> = [];
  private detailSlotResolved = false;

  private get columns(): DataTableColumn[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
      { key: 'name', header: t('ui.colName'), sortable: true, filterable: true, filterType: 'text' },
      { key: 'email', header: t('ui.colEmail'), sortable: true, filterable: true, filterType: 'text' },
      { key: 'phone', header: t('ui.colPhone'), sortable: true, filterable: true, filterType: 'text' },
      {
        key: 'lifecycle_stage',
        header: t('ui.colStage'),
        sortable: true,
        filterable: true,
        filterType: 'select',
        options: Object.keys(STAGE_KEY).map((value) => ({ value, label: stageLabel(value) })),
        format: (r) => stageLabel(r.lifecycle_stage as string),
      },
      {
        key: 'total_spent',
        header: t('ui.colSpent'),
        align: 'right',
        sortable: true,
        filterable: true,
        filterType: 'range',
        // total_spent es CÉNTIMOS (customers.record_purchase acumula el total del evento,
        // contrato inter-módulo ADR-0123): formatMoney divide. toFixed(2) pintaba ×100.
        format: (r) => erplora().formatMoney(Number(r.total_spent || 0)),
      },
    ];
  }

  private get rowActions(): DataTableAction[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
      { id: 'view', label: t('ui.actionView'), icon: 'eye-outline' },
      ...(can('customers.delete_customer')
        ? [{ id: 'delete', label: t('ui.actionDelete'), icon: 'trash-outline', color: 'danger' }]
        : []),
    ];
  }

  private readonly onLocaleChange = (): void => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    this.ctrl = createListController<Customer>(erplora(), 'customers.list', () => this.requestUpdate(), {
      pageSize: 50,
      sort: 'name',
      dir: 'asc',
    });
    await Promise.all([this.ctrl.load(), this.loadStats()]);
    try {
      const a = erplora().on('customer.created', () => { this.ctrl.load(); this.loadStats(); });
      const b = erplora().on('customer.updated', () => { this.ctrl.load(); this.loadStats(); });
      const c = erplora().on('customer.deleted', () => { this.ctrl.load(); this.loadStats(); });
      this.unsub = () => { a(); b(); c(); };
    } catch { /* preview sin SDK */ }
  }

  disconnectedCallback() {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    this.unsub?.();
    super.disconnectedCallback();
  }

  /** Dinero en CÉNTIMOS → texto con moneda (ADR-0123). El toFixed(2) directo pintaba ×100. */
  private fmt(n: number | null | undefined): string { return n == null ? '—' : erplora().formatMoney(Number(n)); }

  private async loadStats() {
    try {
      const rows = await erplora().query<Stats[]>('customers.stats');
      this.stats = rows?.[0] ?? null;
    } catch { /* tarjetas opcionales */ }
  }

  // — CSV import (customers#15) → `customers.bulk_create` (WASM, cap 50, one transaction per batch),
  // never `customers.create` row by row. Rows are validated HERE first (name required, email shape)
  // and the invalid ones are SKIPPED WITH A REASON — never silenced. A batch that the server rejects
  // is reported with its reason (row range) and the next batches still run. The report stays on
  // screen until the next import. "Resumable / 10k rows / dry-run" is deferred on purpose.
  private static readonly IMPORT_BATCH = 50;
  private static readonly EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /** Header aliases (export headers + Spanish ones a spreadsheet produces). */
  private static readonly CSV_ALIASES: Record<string, string[]> = {
    name: ['name', 'Nombre', 'nombre'],
    email: ['email', 'Email', 'correo', 'Correo'],
    phone: ['phone', 'Teléfono', 'telefono', 'Telefono', 'tel'],
    tax_id: ['tax_id', 'NIF', 'nif', 'CIF', 'cif'],
    company_name: ['company_name', 'Empresa', 'empresa'],
    address: ['address', 'Dirección', 'direccion'],
    city: ['city', 'Ciudad', 'ciudad'],
    postal_code: ['postal_code', 'CP', 'cp', 'Código postal'],
    country: ['country', 'País', 'pais'],
    lifecycle_stage: ['lifecycle_stage'],
    notes: ['notes', 'Notas', 'notas'],
  };

  private static csvValue(row: Record<string, string>, key: string): string {
    for (const alias of ErpCustomersList.CSV_ALIASES[key] ?? [key]) {
      const v = row[alias];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  }

  private async onCsvImport(ev: CustomEvent<{ rows: Record<string, string>[] }>): Promise<void> {
    if (!can('customers.add_customer')) return;
    const rows = ev.detail?.rows ?? [];
    const report: ImportReport = { total: rows.length, created: 0, skipped: [], failed: [] };
    const valid: Array<{ row: number; item: Record<string, unknown> }> = [];
    rows.forEach((r, i) => {
      const row = i + 1;
      const name = ErpCustomersList.csvValue(r, 'name');
      const email = ErpCustomersList.csvValue(r, 'email');
      if (!name) { report.skipped.push({ row, reason: 'ui.importReasonName' }); return; }
      if (email && !ErpCustomersList.EMAIL_SHAPE.test(email)) { report.skipped.push({ row, reason: 'ui.importReasonEmail' }); return; }
      const stage = ErpCustomersList.csvValue(r, 'lifecycle_stage') || 'lead';
      valid.push({ row, item: {
        name, email, phone: ErpCustomersList.csvValue(r, 'phone'), tax_id: ErpCustomersList.csvValue(r, 'tax_id'),
        company_name: ErpCustomersList.csvValue(r, 'company_name'), address: ErpCustomersList.csvValue(r, 'address'),
        city: ErpCustomersList.csvValue(r, 'city'), postal_code: ErpCustomersList.csvValue(r, 'postal_code'),
        country: ErpCustomersList.csvValue(r, 'country'), notes: ErpCustomersList.csvValue(r, 'notes'),
        lifecycle_stage: STAGE_KEY[stage] ? stage : 'lead', source: 'import',
      } });
    });
    this.importing = true;
    this.importReport = null;
    try {
      for (let i = 0; i < valid.length; i += ErpCustomersList.IMPORT_BATCH) {
        const batch = valid.slice(i, i + ErpCustomersList.IMPORT_BATCH);
        const range = `${batch[0].row}-${batch[batch.length - 1].row}`;
        try {
          await erplora().command('customers.bulk_create', { items: batch.map((b) => b.item) });
          report.created += batch.length;
        } catch (e) {
          report.failed.push({ rows: range, reason: e instanceof Error && e.message ? e.message : erplora().t(CATALOG, 'ui.errCreate') });
        }
      }
    } finally {
      this.importing = false;
      this.importReport = report;
    }
    await Promise.all([this.ctrl.load(), this.loadStats()]);
  }

  private renderImportReport() {
    const r = this.importReport;
    if (!r) return nothing;
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    const tone = r.failed.length ? 'danger' : r.skipped.length ? 'warning' : 'success';
    return html`<ok-inline-feedback class="import-report" tone=${tone} icon=${r.failed.length ? 'alert-circle-outline' : 'checkmark-outline'}>
      <strong>${t('ui.importSummary', { total: r.total, created: r.created, skipped: r.skipped.length, failed: r.failed.reduce((n, f) => n + (Number(f.rows.split('-')[1] ?? f.rows) - Number(f.rows.split('-')[0]) + 1), 0) })}</strong>
      ${r.skipped.length ? html`<ul class="import-list">${r.skipped.slice(0, 20).map((s) => html`<li>${t('ui.importRow', { row: s.row })}: ${t(s.reason)}</li>`)}
        ${r.skipped.length > 20 ? html`<li>…</li>` : nothing}</ul>` : nothing}
      ${r.failed.length ? html`<ul class="import-list">${r.failed.map((f) => html`<li>${t('ui.importRows', { rows: f.rows })}: ${f.reason}</li>`)}</ul>` : nothing}
      <ion-button size="small" fill="clear" @click=${() => (this.importReport = null)}>${t('ui.close')}</ion-button>
    </ok-inline-feedback>`;
  }

  /** Referencia al ok-data-table para cerrar su panel lateral tras el alta. */
  private dataTable(): { open(p?: 'filters' | 'create'): void; close(): void } | null {
    return this.renderRoot.querySelector('ok-data-table') as
      | { open(p?: 'filters' | 'create'): void; close(): void }
      | null;
  }

  // — Alta rápida (panel `create` de la tabla) —
  private async create(ev: Event) {
    ev.preventDefault();
    if (!can('customers.add_customer') || !this.newName.trim()) return;
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
      this.dataTable()?.close(); // el panel se cierra al crear: el alta ya está en la tabla
      await Promise.all([this.ctrl.load(), this.loadStats()]);
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errCreate');
    } finally {
      this.saving = false;
    }
  }

  // — Detalle —
  private async openDetail(id: string) {
    this.formError = '';
    this.formMsg = '';
    this.pendingDelete = null;
    this.editing = false;
    try {
      const rows = await erplora().query<Customer[]>('customers.get', { customer_id: id });
      const customer = rows?.[0];
      if (!customer) { this.formError = erplora().t(CATALOG, 'ui.errCustomerNotFound'); return; }
      this.detail = customer;
      await Promise.all([this.loadActivities(id), this.loadMemberships(id), this.loadFieldValues(id), this.resolveDetailSlot()]);
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errLoadCustomer');
    }
  }

  private async loadFieldValues(id: string) {
    try {
      this.fieldValues = (await erplora().query<FieldValue[]>('customers.fields.values', { customer_id: id })) ?? [];
    } catch { this.fieldValues = []; }
  }

  /** Edita en memoria el valor de un campo; se persiste al guardar la ficha. */
  private setFieldValue(fieldId: string, value: string) {
    this.fieldValues = this.fieldValues.map((f) => (f.id === fieldId ? { ...f, value } : f));
  }

  private async loadActivities(id: string) {
    try {
      this.activities = (await erplora().query<Activity[]>('customers.activities', { customer_id: id })) ?? [];
    } catch { this.activities = []; }
  }

  private async loadMemberships(id: string) {
    try {
      const [groupsPage, tagsPage, gids, tids] = await Promise.all([
        erplora().queryAll<Group>('customers.groups.list'),
        erplora().queryAll<Tag>('customers.tags.list'),
        erplora().query<Array<{ id: string }>>('customers.group_ids', { customer_id: id }),
        erplora().query<Array<{ id: string }>>('customers.tag_ids', { customer_id: id }),
      ]);
      // `queryAll` devuelve EL ARRAY, no el sobre `{rows,total}`. Leer `.rows` aquí daba `undefined`
      // → la ficha decía «no hay grupos/etiquetas» aunque los hubiera, y asignarlos era imposible.
      // `Array.isArray` y no `?? []`: una respuesta rara degrada a vacío en vez de reventar.
      this.groups = Array.isArray(groupsPage) ? groupsPage : [];
      this.tags = Array.isArray(tagsPage) ? tagsPage : [];
      this.groupIds = (gids ?? []).map((r) => String(r.id));
      this.tagIds = (tids ?? []).map((r) => String(r.id));
    } catch { /* asignación opcional si faltan permisos de grupos/tags */ }
  }

  private async resolveDetailSlot(): Promise<void> {
    if (this.detailSlotResolved) return;
    this.detailSlotResolved = true;
    const sdk = (globalThis as {
      erplora?: { loadSlot?: (s: string) => Promise<Array<Record<string, unknown> & { component: string }>> };
    }).erplora;
    if (!sdk?.loadSlot) return;
    let resolved: Array<Record<string, unknown> & { component: string }> = [];
    try { resolved = (await sdk.loadSlot('customers.detail')) ?? []; } catch { resolved = []; }
    this.detailFillers = resolved.map((f) => ({ component: f.component, el: document.createElement(f.component) as HTMLElement }));
    this.requestUpdate();
  }

  /** (Re)mounts the fillers in the sheet and tells them the open customer; idempotent across re-renders. */
  private ensureDetailSlotMounted(): void {
    const host = this.renderRoot.querySelector('.detail-slot') as HTMLElement | null;
    if (!host || !this.detail) return;
    for (const f of this.detailFillers) {
      if (f.el.parentElement !== host) host.appendChild(f.el);
      f.el.dispatchEvent(new CustomEvent('erp:customer-detail', {
        detail: { customer_id: this.detail.id, customer_name: this.detail.name }, bubbles: false,
      }));
    }
  }

  protected updated(): void {
    this.ensureDetailSlotMounted();
  }

  private closeDetail() {
    this.detail = null;
    this.editing = false;
    this.pendingDelete = null;
    this.formError = '';
    this.formMsg = '';
  }

  private onRowAction(ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) {
    const row = ev.detail.row as unknown as Customer;
    if (ev.detail.actionId === 'view') this.openDetail(String(row.id));
    if (ev.detail.actionId === 'delete' && can('customers.delete_customer')) {
      this.pendingDelete = row;
      this.formMsg = '';
      this.formError = '';
    }
  }

  // — Edición → customers.update (set completo de binds, ver schemas/update.json) —
  private startEdit() {
    if (!this.detail || !can('customers.change_customer')) return;
    const d = this.detail;
    this.form = {
      name: d.name ?? '', email: d.email ?? '', phone: d.phone ?? '', tax_id: d.tax_id ?? '',
      address: d.address ?? '', city: d.city ?? '', postal_code: d.postal_code ?? '',
      country: d.country ?? '', notes: d.notes ?? '', lifecycle_stage: d.lifecycle_stage || 'lead',
      source: d.source || 'walk_in', company_name: d.company_name ?? '',
      birthday: d.birthday ?? '', anniversary: d.anniversary ?? '',
      preferred_channel: d.preferred_channel || 'none',
      marketing_consent: Boolean(d.marketing_consent), is_active: Boolean(d.is_active),
    };
    this.editing = true;
    this.formError = '';
    this.formMsg = '';
  }

  private async saveEdit(ev: Event) {
    ev.preventDefault();
    if (!can('customers.change_customer') || !this.detail || !this.form.name.trim()) return;
    this.saving = true;
    this.formError = '';
    try {
      // ONE command (customers#13): the sheet AND its custom-field values. The WASM handler validates
      // every value against the definitions it reads server-side (required/type/options) and the host
      // writes both in one transaction — a rejected value leaves the base data untouched. Before this
      // it was `customers.update` + N × `_field_value_set` in parallel from here: half-saved sheets.
      const customerId = this.detail.id;
      await erplora().command('customers.update_with_fields', {
        customer_id: customerId,
        name: this.form.name.trim(), email: this.form.email.trim(), phone: this.form.phone.trim(),
        tax_id: this.form.tax_id.trim(), address: this.form.address.trim(), city: this.form.city.trim(),
        postal_code: this.form.postal_code.trim(), country: this.form.country.trim(),
        notes: this.form.notes, lifecycle_stage: this.form.lifecycle_stage, source: this.form.source.trim() || 'walk_in',
        company_name: this.form.company_name.trim(),
        birthday: this.form.birthday || null, anniversary: this.form.anniversary || null,
        preferred_channel: this.form.preferred_channel,
        marketing_consent: this.form.marketing_consent ? 1 : 0,
        is_active: this.form.is_active ? 1 : 0,
        // Every field travels, the empty ones too: clearing a field ("no longer uses that dye") is a
        // real change, not a no-op.
        fields: this.fieldValues.map((f) => ({ field_id: f.id, value: f.value ?? '' })),
      });

      this.editing = false;
      this.formMsg = erplora().t(CATALOG, 'ui.customerUpdated');
      await Promise.all([this.openDetail(this.detail.id), this.ctrl.load()]);
    } catch (e) {
      this.formError = domainErrorText(e, 'ui.errUpdate');
    } finally {
      this.saving = false;
    }
  }

  // — Borrado (soft-delete) → customers.delete, confirmación en dos pasos —
  private async confirmDelete() {
    if (!can('customers.delete_customer') || !this.pendingDelete) return;
    const target = this.pendingDelete;
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('customers.delete', { customer_id: target.id });
      this.pendingDelete = null;
      if (this.detail?.id === target.id) this.closeDetail();
      this.formMsg = erplora().t(CATALOG, 'ui.customerDeleted', { name: target.name });
      await Promise.all([this.ctrl.load(), this.loadStats()]);
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errDelete');
    } finally {
      this.saving = false;
    }
  }

  // — Grupos / etiquetas → set_groups / set_tags (reemplazo de colección) —
  private toggleId(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  private async saveMembership(kind: 'groups' | 'tags') {
    if (!can('customers.change_customer') || !this.detail) return;
    this.saving = true;
    this.formError = '';
    try {
      if (kind === 'groups') {
        await erplora().command('customers.set_groups', { customer_id: this.detail.id, ids: this.groupIds });
      } else {
        await erplora().command('customers.set_tags', { customer_id: this.detail.id, ids: this.tagIds });
      }
      this.formMsg = erplora().t(CATALOG, kind === 'groups' ? 'ui.groupsAssigned' : 'ui.tagsAssigned');
      await this.loadMemberships(this.detail.id);
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errSaveMembership');
    } finally {
      this.saving = false;
    }
  }

  // — Notes → ONE command: `notes.add` writes the note AND its timeline entry in one transaction
  // (customers#14). Chaining `activity.add` from here left invisible notes when the second call
  // failed, and any other producer (the automation kernel) never made the second call at all.
  private async addNote(ev: Event) {
    ev.preventDefault();
    if (!can('customers.add_note') || !this.detail || !this.newNote.trim()) return;
    const content = this.newNote.trim();
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('customers.notes.add', {
        customer_id: this.detail.id, content, author_name: '',
        title: erplora().t(CATALOG, 'ui.noteAddedTitle'),
      });
      this.newNote = '';
      this.formMsg = erplora().t(CATALOG, 'ui.noteAdded');
      await this.loadActivities(this.detail.id);
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errAddNote');
    } finally {
      this.saving = false;
    }
  }

  // — Render —
  private renderStats() {
    if (!this.stats) return nothing;
    const s = this.stats;
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`<div class="kpis">
      <ok-kpi label=${t('ui.customers')} value=${String(s.total ?? 0)}></ok-kpi>
      <ok-kpi label=${t('ui.active')} value=${String(s.active ?? 0)}></ok-kpi>
      <ok-kpi label=${t('ui.vip')} value=${String(s.vip ?? 0)}></ok-kpi>
      <ok-kpi label=${t('ui.revenue')} value=${this.fmt(s.total_revenue)}></ok-kpi>
    </div>`;
  }

  private renderDeleteConfirm() {
    if (!this.pendingDelete || !can('customers.delete_customer')) return nothing;
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    return html`<section class="panel">
      <h3>${t('ui.deleteCustomerTitle')}</h3>
      <p>${t('ui.deleteCustomerConfirm', { name: this.pendingDelete.name })}</p>
      <footer class="actions">
        <ion-button size="small" color="danger" ?disabled=${this.saving} @click=${() => this.confirmDelete()}>${this.saving ? t('ui.deleting') : t('ui.delete')}</ion-button>
        <ion-button size="small" fill="outline" @click=${() => (this.pendingDelete = null)}>${t('ui.cancel')}</ion-button>
      </footer>
    </section>`;
  }

  /** Campos personalizados (ADR-0132): los pinta su `field_type`, no un input de texto para todo.
   *  Un `select` con opciones es un dominio CERRADO: pintarlo como texto libre lo rompe. */
  private renderCustomFields() {
    if (!this.fieldValues.length) return nothing;
    const t = (k: string): string => erplora().t(CATALOG, k);
    const set = (id: string) => (e: Event) => this.setFieldValue(id, String((e.target as HTMLInputElement).value ?? ''));

    return html`<section class="custom-fields">
      <h3>${t('ui.customFields')}</h3>
      <div class="grid2">
        ${this.fieldValues.map((f) => {
          const label = f.is_required ? `${f.name} *` : f.name;
          if (f.field_type === 'select') {
            let opts: string[] = [];
            try { opts = JSON.parse(f.options || '[]') as string[]; } catch { opts = []; }
            return html`<ion-select data-field=${f.id} fill="outline" label=${label} label-placement="floating"
              .value=${f.value} @ionChange=${set(f.id)}>
              ${opts.map((o) => html`<ion-select-option value=${o}>${o}</ion-select-option>`)}
            </ion-select>`;
          }
          if (f.field_type === 'textarea') {
            return html`<ion-textarea data-field=${f.id} fill="outline" label=${label} label-placement="floating"
              auto-grow .value=${f.value} @ionInput=${set(f.id)}></ion-textarea>`;
          }
          if (f.field_type === 'boolean') {
            return html`<ion-checkbox data-field=${f.id} .checked=${f.value === '1'}
              @ionChange=${(e: Event) => this.setFieldValue(f.id, (e.target as HTMLInputElement).checked ? '1' : '')}>
              ${label}
            </ion-checkbox>`;
          }
          const type = f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text';
          return html`<ion-input data-field=${f.id} type=${type} fill="outline" label=${label}
            label-placement="floating" .value=${f.value} @ionInput=${set(f.id)}></ion-input>`;
        })}
      </div>
    </section>`;
  }

  private renderEditForm() {
    const f = this.form;
    const t = (k: string): string => erplora().t(CATALOG, k);
    const input = (key: keyof EditForm, label: string, type = 'text') => html`
      <ion-input type=${type} fill="outline" label=${label} label-placement="floating" .value=${String(f[key] ?? '')}
        @ionInput=${(e: any) => (this.form = { ...this.form, [key]: e.target.value })}></ion-input>`;
    return html`<form @submit=${(e: Event) => this.saveEdit(e)}>
      <div class="grid2">
        ${input('name', t('ui.colName'))}
        ${input('email', t('ui.colEmail'), 'email')}
        ${input('phone', t('ui.colPhone'))}
        ${input('tax_id', t('ui.fieldNif'))}
        ${input('company_name', t('ui.fieldCompany'))}
        ${input('address', t('ui.fieldAddress'))}
        ${input('city', t('ui.fieldCity'))}
        ${input('postal_code', t('ui.fieldPostalCode'))}
        ${input('country', t('ui.fieldCountry'))}
        ${input('birthday', t('ui.fieldBirthday'), 'date')}
        ${input('anniversary', t('ui.fieldAnniversary'), 'date')}
        ${input('source', t('ui.fieldSource'))}
        <ion-select fill="outline" label=${t('ui.colStage')} label-placement="floating" .value=${f.lifecycle_stage}
          @ionChange=${(e: any) => (this.form = { ...this.form, lifecycle_stage: e.target.value })}>
          ${Object.keys(STAGE_KEY).map((v) => html`<ion-select-option value=${v}>${stageLabel(v)}</ion-select-option>`)}
        </ion-select>
        <ion-select fill="outline" label=${t('ui.fieldPreferredChannel')} label-placement="floating" .value=${f.preferred_channel}
          @ionChange=${(e: any) => (this.form = { ...this.form, preferred_channel: e.target.value })}>
          ${Object.keys(CHANNEL_KEY).map((v) => html`<ion-select-option value=${v}>${channelLabel(v)}</ion-select-option>`)}
        </ion-select>
      </div>
      <div class="form">
        <ion-textarea fill="outline" label=${t('ui.fieldInternalNotes')} label-placement="floating" auto-grow .value=${f.notes}
          @ionInput=${(e: any) => (this.form = { ...this.form, notes: e.target.value })}></ion-textarea>
      </div>
      ${this.renderCustomFields()}
      <label class="check"><ion-checkbox .checked=${f.marketing_consent}
        @ionChange=${(e: any) => (this.form = { ...this.form, marketing_consent: e.target.checked })}></ion-checkbox> ${t('ui.marketingConsent')}</label>
      <label class="check"><ion-checkbox .checked=${f.is_active}
        @ionChange=${(e: any) => (this.form = { ...this.form, is_active: e.target.checked })}></ion-checkbox> ${t('ui.fieldActive')}</label>
      <footer class="actions">
        <ion-button type="submit" size="small" ?disabled=${this.saving || !f.name.trim()}>${this.saving ? t('ui.saving') : t('ui.save')}</ion-button>
        <ion-button size="small" fill="outline" @click=${() => (this.editing = false)}>${t('ui.cancel')}</ion-button>
      </footer>
    </form>`;
  }

  private renderMembership(kind: 'groups' | 'tags') {
    const isGroups = kind === 'groups';
    const items = isGroups ? this.groups : this.tags;
    const selected = isGroups ? this.groupIds : this.tagIds;
    const editable = can('customers.change_customer');
    const t = (k: string): string => erplora().t(CATALOG, k);
    if (!items.length) return html`<p>${t(isGroups ? 'ui.noGroupsDefined' : 'ui.noTagsDefined')}</p>`;
    return html`<div>
      <div class="chips">
        ${items.map((it) => html`<label class="check">
          <ion-checkbox .checked=${selected.includes(String(it.id))}
            ?disabled=${!editable}
            @ionChange=${() => {
              if (!editable) return;
              if (isGroups) this.groupIds = this.toggleId(this.groupIds, String(it.id));
              else this.tagIds = this.toggleId(this.tagIds, String(it.id));
            }}></ion-checkbox>
          ${it.name}${isGroups && Number((it as Group).discount_percent) > 0 ? ` (−${Number((it as Group).discount_percent)}%)` : ''}
        </label>`)}
      </div>
      ${editable
        ? html`<ion-button size="small" ?disabled=${this.saving} @click=${() => this.saveMembership(kind)}>${t(isGroups ? 'ui.saveGroups' : 'ui.saveTags')}</ion-button>`
        : nothing}
    </div>`;
  }

  private renderDetail() {
    const d = this.detail!;
    const t = (k: string): string => erplora().t(CATALOG, k);
    // La ficha es una pantalla propia (no la lista): el `<h2>` es el NOMBRE del cliente, no el
    // título de la vista, y el topbar del shell no lo conoce.
    return html`<div class="detail-page">
      <header>
        <h2>${d.name}</h2>
        <ion-button size="small" fill="outline" @click=${() => this.closeDetail()}>${t('ui.back')}</ion-button>
        ${this.editing || !can('customers.change_customer')
          ? nothing
          : html`<ion-button size="small" @click=${() => this.startEdit()}>${t('ui.edit')}</ion-button>`}
        ${can('customers.delete_customer')
          ? html`<ion-button size="small" color="danger" fill="outline" @click=${() => { this.pendingDelete = d; }}>${t('ui.delete')}</ion-button>`
          : nothing}
      </header>
      ${this.formError ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : nothing}
      ${this.formMsg ? html`<p class="ok">${this.formMsg}</p>` : nothing}
      ${this.renderDeleteConfirm()}
      <section class="panel">
        ${this.editing ? this.renderEditForm() : html`<dl class="meta">
          <div><dt>${t('ui.colEmail')}</dt><dd>${d.email || '—'}</dd></div>
          <div><dt>${t('ui.colPhone')}</dt><dd>${d.phone || '—'}</dd></div>
          <div><dt>${t('ui.fieldNif')}</dt><dd>${d.tax_id || '—'}</dd></div>
          <div><dt>${t('ui.fieldCompany')}</dt><dd>${d.company_name || '—'}</dd></div>
          <div><dt>${t('ui.fieldAddress')}</dt><dd>${[d.address, d.postal_code, d.city, d.country].filter(Boolean).join(', ') || '—'}</dd></div>
          <div><dt>${t('ui.colStage')}</dt><dd>${stageLabel(d.lifecycle_stage)}</dd></div>
          <div><dt>${t('ui.fieldSource')}</dt><dd>${d.source || '—'}</dd></div>
          <div><dt>${t('ui.fieldPreferredChannel')}</dt><dd>${channelLabel(d.preferred_channel)}</dd></div>
          <div><dt>${t('ui.detailMarketingConsent')}</dt><dd>${d.marketing_consent ? t('ui.yes') : t('ui.no')}</dd></div>
          <div><dt>${t('ui.detailPurchases')}</dt><dd>${d.total_purchases ?? 0}</dd></div>
          <div><dt>${t('ui.colSpent')}</dt><dd>${this.fmt(d.total_spent)}</dd></div>
          <div><dt>${t('ui.detailLastPurchase')}</dt><dd>${d.last_purchase_date || '—'}</dd></div>
          <div><dt>${t('ui.fieldActive')}</dt><dd>${d.is_active ? t('ui.yes') : t('ui.no')}</dd></div>
        </dl>`}
      </section>
      ${can('customers.view_customergroup') || can('customers.view_customertag')
        ? html`<section class="panel">
            ${can('customers.view_customergroup')
              ? html`<h3>${t('ui.groupsHeading')}</h3>${this.renderMembership('groups')}`
              : nothing}
            ${can('customers.view_customertag')
              ? html`<h3 style="margin-top:.75rem">${t('ui.tagsHeading')}</h3>${this.renderMembership('tags')}`
              : nothing}
          </section>`
        : nothing}
      ${can('customers.add_note') || can('customers.view_activity')
        ? html`<section class="panel">
            ${can('customers.add_note')
              ? html`<h3>${t('ui.addNote')}</h3>
                  <form class="form" @submit=${(e: Event) => this.addNote(e)}>
                    <ion-textarea fill="outline" label=${t('ui.noteLabel')} label-placement="floating" auto-grow .value=${this.newNote}
                      @ionInput=${(e: any) => (this.newNote = e.target.value)}></ion-textarea>
                    <ion-button type="submit" size="small" ?disabled=${this.saving || !this.newNote.trim()}>${t('ui.add')}</ion-button>
                  </form>`
              : nothing}
            ${can('customers.view_activity')
              ? html`<h3>${t('ui.activityHeading')}</h3>
                  ${this.activities.length ? html`<ul class="timeline">
                    ${this.activities.map((a) => html`<li>
                      <div class="t">${a.title} <small>(${a.activity_type})</small></div>
                      ${a.description ? html`<div class="d">${a.description}</div>` : nothing}
                      <div class="when">${a.created_at}</div>
                    </li>`)}
                  </ul>` : html`<p>${t('ui.noActivity')}</p>`}`
              : nothing}
          </section>`
        : nothing}
      ${this.detailFillers.length ? html`<section class="panel detail-slot"></section>` : nothing}
    </div>`;
  }

  /** Alta rápida: SIEMPRE proyectada en el panel `create` de la tabla (si solo se pintara al pulsar
   *  el «+», el panel abriría vacío). La ficha completa se edita desde el detalle. */
  private renderCreateForm() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`<form slot="create" class="create-form" @submit=${(e: Event) => this.create(e)}>
      <ion-input fill="outline" label=${t('ui.colName')} label-placement="floating" .value=${this.newName} @ionInput=${(e: any) => (this.newName = e.target.value)}></ion-input>
      <ion-input type="email" fill="outline" label=${t('ui.colEmail')} label-placement="floating" .value=${this.newEmail} @ionInput=${(e: any) => (this.newEmail = e.target.value)}></ion-input>
      <ion-button type="submit" size="small" ?disabled=${this.saving || !this.newName}>${this.saving ? t('ui.saving') : t('ui.addCustomer')}</ion-button>
    </form>`;
  }

  render() {
    if (this.detail) return this.renderDetail();
    const t = (k: string): string => erplora().t(CATALOG, k);
    // Sin `<h2>`: el título de la vista lo pinta el topbar del shell.
    return html`<div class="page">
        ${this.renderStats()}
        ${this.formError ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : nothing}
        ${this.formMsg ? html`<p class="ok">${this.formMsg}</p>` : nothing}
        ${this.importing ? html`<p class="ok">${t('ui.importing')}</p>` : nothing}
        ${this.renderImportReport()}
        ${this.renderDeleteConfirm()}
        ${this.ctrl?.error ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : nothing}
        <ok-data-table .serverSide=${true} .fill=${true} .labels=${dataTableLabels(erplora().locale)} .views=${true} .cardTitle=${(r: Record<string, unknown>) => String(r.name ?? '—')} .cardIcon=${() => 'person-outline'} .addable=${can('customers.add_customer')} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${t('ui.searchCustomers')} .actions=${this.rowActions} .importable=${can('customers.add_customer')} .exportable=${can('customers.export_customer')} .csvName=${'customers.csv'} .columnPicker=${true} .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.emptyCustomers')} @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => this.onRowAction(e)} @csvImport=${(e: CustomEvent<{ rows: Record<string, string>[] }>) => this.onCsvImport(e)} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @pageSizeChange=${(e: CustomEvent<number>) => this.ctrl.setPageSize(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}>
          ${this.renderCreateForm()}
        </ok-data-table>
      </div>`;
  }
}

define('erp-customers-list', ErpCustomersList);
