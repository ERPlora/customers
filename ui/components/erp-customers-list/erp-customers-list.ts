import { LitElement, html, css, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-data-table';
import '@erplora/outfitkit/ok-kpi';
import '@erplora/outfitkit/ok-combo';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
import { createListController, dataTableLabels } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
import { domainErrorText as declaredErrorText } from '../../lib/domain-error-text';
import { countryCode, countryName, countryOptions } from '../../lib/country';

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

/** El grupo es SEGMENTACIÓN de identidad: no lleva descuento (customers#17). */
interface Group { id: string; name: string; color: string }

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
  /** Rows imported with something to review — a country it could not read (customers#72). */
  warnings: { row: number; reason: string }[];
}

interface Activity {
  id: string; activity_type: string; title: string; description: string; created_at: string;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

/** A business rejection (hub#139) carries a stable `code` (`customers.field_required`…): translate it with
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

/**
 * **The timeline speaks the hub's language** (customers#50).
 *
 * A timeline entry carries a `title` and an `activity_type`, and both used to reach the screen raw:
 * a Spanish hub read «Note added (note)». Since customers#50 this module's own producers store a
 * KEY in `title` — text a person reads is never persisted (ADR-0055 / ADR-0199), because a row
 * written today is read years later, possibly by a hub in another language.
 *
 * `LEGACY_TITLE` is what makes that a change and not a migration: the six sentences already written
 * in the wild resolve to the same keys, so old rows read correctly too. Anything else — an entry
 * another module wrote through `customers.activity.add` — is printed verbatim: that text is theirs.
 */
const ACTIVITY_TITLE_KEY: Record<string, string> = {
  'activity.note_added': 'ui.activityNoteAdded',
  'activity.purchase_recorded': 'ui.activityPurchaseRecorded',
  'activity.purchase_voided': 'ui.activityPurchaseVoided',
  'activity.consent_granted': 'ui.activityConsentGranted',
  'activity.consent_withdrawn': 'ui.activityConsentWithdrawn',
  'activity.customer_erased': 'ui.activityCustomerErased',
  'activity.customer_merged': 'ui.activityCustomerMerged',
};

const LEGACY_TITLE: Record<string, string> = {
  'Note added': 'ui.activityNoteAdded',
  'Purchase recorded': 'ui.activityPurchaseRecorded',
  'Purchase voided': 'ui.activityPurchaseVoided',
  'Consent given': 'ui.activityConsentGranted',
  'Consent withdrawn': 'ui.activityConsentWithdrawn',
  'Customer data erased': 'ui.activityCustomerErased',
};

const ACTIVITY_TYPE_KEY: Record<string, string> = {
  note: 'ui.activityTypeNote', purchase: 'ui.activityTypePurchase',
  purchase_voided: 'ui.activityTypePurchaseVoided', consent_granted: 'ui.activityTypeConsentGranted',
  consent_withdrawn: 'ui.activityTypeConsentWithdrawn', erased: 'ui.activityTypeErased',
  merged: 'ui.activityTypeMerged',
};

const activityTitle = (title: string): string => {
  const key = ACTIVITY_TITLE_KEY[title] ?? LEGACY_TITLE[title];
  return key ? erplora().t(CATALOG, key) : title;
};

const activityTypeLabel = (value: string): string =>
  (ACTIVITY_TYPE_KEY[value] ? erplora().t(CATALOG, ACTIVITY_TYPE_KEY[value]) : value);

/**
 * **A timestamp a person can read.**
 *
 * The server sends `2026-08-19T15:23:00.255043358+00:00` — NANOSECONDS and a UTC offset. Two things
 * to know about that string:
 *
 *  - ECMAScript only defines up to three fractional digits. V8 is lenient, but WebKit is not, and
 *    the Hub runs inside a WKWebView on the macOS and iOS builds of `erplora-app` (ADR-0160). A
 *    `new Date()` straight on the raw value would render «Invalid Date» exactly on the counter
 *    machines. Hence the truncation to milliseconds before parsing.
 *  - The offset is the server's, so the browser converts to the hub's own zone on its own.
 *
 * An unparseable value falls back to the raw string: showing something odd beats showing nothing.
 */
function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  const ms = String(value).replace(/(\.\d{3})\d+/, '$1');
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat(erplora().locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/**
 * **Consent, per channel** (customers#10).
 *
 * These three are always on screen even with no row behind them, because «nobody has ever asked
 * this person» is a STATE and hiding it is how somebody ends up writing to a customer who never
 * said anything. Any other channel that does have a fact (`postal`, `phone`, and the `any` of the
 * legacy backfill) is drawn underneath, so nothing recorded is ever invisible.
 */
const CONSENT_CHANNELS = ['email', 'whatsapp', 'sms'];

/** The version stamped on what this screen shows. Bump it when `ui.consentNotice` changes: EDPB
 *  05/2020 §110 — if the processing changes considerably the original consent is no longer valid,
 *  and without a version there is no way to tell WHO consented to WHICH wording. */
const CONSENT_NOTICE_VERSION = 'counter-v1';

/** One line of `customers.consent.state`: the effective decision for a purpose and a channel. */
interface ConsentState {
  purpose: string; channel: string; state: string; contact_point: string;
  source: string; notice_version: string; occurred_at: string; recorded_by: string; evidence: string;
}

/** One line of `customers.consent.history`: a fact, with everything it has to be able to prove. */
interface ConsentFact extends ConsentState {
  id: string; notice_text: string; reason: string; created_at: string;
}

const CONSENT_STATE_KEY: Record<string, string> = {
  granted: 'ui.consentGranted', withdrawn: 'ui.consentWithdrawn',
  legacy_unverified: 'ui.consentLegacy',
};

/** Campos editables de la ficha (el schema update.json exige el set completo de binds). */
const EMPTY_FORM = {
  name: '', email: '', phone: '', tax_id: '', address: '', city: '', postal_code: '',
  country: '', notes: '', lifecycle_stage: 'lead', source: 'walk_in', company_name: '',
  birthday: '', anniversary: '', preferred_channel: 'none',
  // No consent here: it is not a field of the sheet any more (customers#10).
  is_active: true,
};

type EditForm = typeof EMPTY_FORM;

/**
 * **What the ADD panel asks for** (customers#51).
 *
 * The panel used to ask for a name and an email, because it inherited the shape of the TABLE —
 * `ok-data-table` draws its create panel from the columns — instead of the shape of the resource.
 * The phone and the tax id, which is what turns a receipt into an invoice in Spain, meant saving
 * half a customer and reopening it: five extra steps for a field of the sheet.
 *
 * The split is the market's, not ours (8/8 references, table in the PR of customers#51): identity
 * and the fiscal id in sight, everything else one tap away. Nobody puts seventeen fields in front
 * of a counter, and nobody hides the tax id either.
 *
 * `REQUIRED` stays exactly `name`, which is the contract of customers#32: a walk-in is a
 * two-second gesture. What was missing was never «demand more fields», it was «make them
 * available». Marketing consent is NOT here on purpose (customers#10): a tick on a creation form
 * is a consent with no purpose, no channel and no evidence.
 */
const SHEET_ESSENTIALS: Array<keyof EditForm> = ['name', 'phone', 'email', 'tax_id', 'company_name'];

/** El resto de la ficha. En el alta va detrás de «Más datos»; en la edición, a continuación. */

const SHEET_MORE: Array<keyof EditForm> = [
  'address', 'city', 'postal_code', 'country', 'birthday', 'anniversary',
  'source', 'lifecycle_stage', 'preferred_channel', 'notes',
];

/** Etiqueta i18n de cada campo de la ficha. Una sola tabla para el alta y para la edición. */
const SHEET_FIELD_LABEL: Record<keyof EditForm, string> = {
  name: 'ui.colName', email: 'ui.colEmail', phone: 'ui.colPhone', tax_id: 'ui.fieldNif',
  company_name: 'ui.fieldCompany', address: 'ui.fieldAddress', city: 'ui.fieldCity',
  postal_code: 'ui.fieldPostalCode', country: 'ui.fieldCountry', birthday: 'ui.fieldBirthday',
  anniversary: 'ui.fieldAnniversary', source: 'ui.fieldSource', lifecycle_stage: 'ui.colStage',
  preferred_channel: 'ui.fieldPreferredChannel', notes: 'ui.fieldInternalNotes',
  is_active: 'ui.fieldActive',
};

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
    header { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    header h2 { flex:1 1 auto; min-width:0; margin:0; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    h3 { margin:.25rem 0 .5rem; font-size:1rem; }
    .kpis { display:grid; grid-template-columns:repeat(auto-fill, minmax(11rem, 1fr)); gap:.5rem; margin:0 0 1rem; }
    /* El panel de alta del data-table es una columna estrecha: los campos van apilados, no en fila. */
    .create-form { display:flex; flex-direction:column; gap:.7rem; }
    /* «Más datos»: un <details> nativo. 44px de zona táctil en el resumen — el panel de alta se usa
       de pie, con una mano y sin teclado. */
    .create-form details.more > summary { cursor:pointer; padding:.6rem .25rem; min-height:44px; display:flex; align-items:center; font-weight:600; font-size:.9rem; }
    .create-form details.more > div { margin-top:.7rem; }
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
    .muted { opacity:.6; }
    .merge-candidates { max-height:18rem; overflow:auto; margin:.5rem 0; background:transparent; }
    footer.actions { display:flex; gap:.5rem; margin-top:.5rem; flex-wrap:wrap; }
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
    ion-button.tone-danger[fill] {
      --border-color: var(--ion-color-danger, #c5000f);
      --color: var(--ion-color-danger, #c5000f);
      --background-activated: var(--ion-color-danger, #c5000f);
      --background-focused: var(--ion-color-danger, #c5000f);
    }
  `;

  // — Lista —
  /** El alta completa, con la MISMA forma que la edición: un solo contrato de formulario y una
   *  sola manera de rellenarlo (customers#51). Antes eran dos `@state` sueltos, `newName` y
   *  `newEmail`, que es exactamente lo que limitaba el alta a dos campos. */
  @state() newForm: EditForm = { ...EMPTY_FORM };

  @state() saving = false;

  @state() formError = '';

  /** What «Add customer» was refused (pm#478). It is painted INSIDE the panel's form: on a phone the
   *  panel is a full-screen sheet and `formError`, on the page underneath, is never seen. */
  @state() createError = '';

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

  /** Effective consent of the open customer, one row per purpose and channel (customers#10). */
  @state() consentState: ConsentState[] = [];

  /** Every consent fact of the open customer — the audit trail, newest first. */
  @state() consentHistory: ConsentFact[] = [];

  /** The channel whose grant has been asked for and not yet confirmed. */
  @state() consentAsking = '';

  private ctrl!: ListController<Customer>;

  private unsub?: () => void;
  /** Each sheet opening takes a number; an answer that comes back after a newer opening (or
   *  «Close») is dropped (pm#459). */
  private detailSeq = 0;
  @state() private pendingErase = false;
  @state() private eraseReason = '';
  @state() private importing = false;
  @state() private importReport: ImportReport | null = null;

  // — Merge (customers#86): pick a duplicate of the OPEN sheet and fold it in. —
  @state() private mergeOpen = false;
  @state() private mergeTerm = '';
  @state() private mergeCandidates: Customer[] = [];
  @state() private mergeState: 'idle' | 'searching' | 'empty' | 'error' = 'idle';
  @state() private mergeTarget: Customer | null = null;
  /** Guards against a stale search answer painting over a newer one (same pattern as the till's search). */
  private mergeSeq = 0;
  private mergeTimer?: ReturnType<typeof setTimeout>;

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
      const d = erplora().on('customer.merged', () => { this.ctrl.load(); this.loadStats(); });
      this.unsub = () => { a(); b(); c(); d(); };
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
    const report: ImportReport = { total: rows.length, created: 0, skipped: [], failed: [], warnings: [] };
    const valid: Array<{ row: number; item: Record<string, unknown> }> = [];
    rows.forEach((r, i) => {
      const row = i + 1;
      const name = ErpCustomersList.csvValue(r, 'name');
      const email = ErpCustomersList.csvValue(r, 'email');
      if (!name) { report.skipped.push({ row, reason: 'ui.importReasonName' }); return; }
      if (email && !ErpCustomersList.EMAIL_SHAPE.test(email)) { report.skipped.push({ row, reason: 'ui.importReasonEmail' }); return; }
      const stage = ErpCustomersList.csvValue(r, 'lifecycle_stage') || 'lead';
      // The country is stored as its code, resolved the way the till reads it (customers#72). Text
      // it cannot read is kept — nothing typed is thrown away — and the row is flagged to review.
      const rawCountry = ErpCustomersList.csvValue(r, 'country');
      const code = countryCode(rawCountry, erplora().locale);
      if (rawCountry && !code) report.warnings.push({ row, reason: 'ui.importReasonCountry' });
      const country = code || rawCountry;
      valid.push({ row, item: {
        name, email, phone: ErpCustomersList.csvValue(r, 'phone'), tax_id: ErpCustomersList.csvValue(r, 'tax_id'),
        company_name: ErpCustomersList.csvValue(r, 'company_name'), address: ErpCustomersList.csvValue(r, 'address'),
        city: ErpCustomersList.csvValue(r, 'city'), postal_code: ErpCustomersList.csvValue(r, 'postal_code'),
        country, notes: ErpCustomersList.csvValue(r, 'notes'),
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
    const tone = r.failed.length ? 'danger' : r.skipped.length || r.warnings.length ? 'warning' : 'success';
    return html`<ok-inline-feedback class="import-report" data-testid="customers-list-import-report" tone=${tone} icon=${r.failed.length ? 'alert-circle-outline' : 'checkmark-outline'}>
      <strong>${t('ui.importSummary', { total: r.total, created: r.created, skipped: r.skipped.length, failed: r.failed.reduce((n, f) => n + (Number(f.rows.split('-')[1] ?? f.rows) - Number(f.rows.split('-')[0]) + 1), 0) })}</strong>
      ${r.skipped.length ? html`<ul class="import-list">${r.skipped.slice(0, 20).map((s) => html`<li>${t('ui.importRow', { row: s.row })}: ${t(s.reason)}</li>`)}
        ${r.skipped.length > 20 ? html`<li>…</li>` : nothing}</ul>` : nothing}
      ${r.warnings.length ? html`<ul class="import-list import-warnings">${r.warnings.slice(0, 20).map((w) => html`<li>${t('ui.importRow', { row: w.row })}: ${t(w.reason)}</li>`)}
        ${r.warnings.length > 20 ? html`<li>…</li>` : nothing}</ul>` : nothing}
      ${r.failed.length ? html`<ul class="import-list">${r.failed.map((f) => html`<li>${t('ui.importRows', { rows: f.rows })}: ${f.reason}</li>`)}</ul>` : nothing}
      <ion-button size="small" fill="clear" data-testid="customers-list-import-report-close" @click=${() => (this.importReport = null)}>${t('ui.close')}</ion-button>
    </ok-inline-feedback>`;
  }

  /** Referencia al ok-data-table para cerrar su panel lateral tras el alta. */
  private dataTable(): { open(p?: 'filters' | 'create'): void; close(): void } | null {
    return this.renderRoot.querySelector('ok-data-table') as
      | { open(p?: 'filters' | 'create'): void; close(): void }
      | null;
  }

  // — Alta (panel `create` de la tabla) —
  //
  // UN solo command con la ficha entera (customers#51). Lo que se escriba en «Más datos» viaja en
  // la misma llamada: el alta no se parte nunca en `create` + `update`, que es lo que obligaba a
  // guardar a medias y reabrir. Y sigue bastando el NOMBRE (customers#32): el resto son opcionales
  // y viajan vacíos, que es lo que el schema espera.
  private async create(ev: Event) {
    ev.preventDefault();
    const f = this.newForm;
    if (!can('customers.add_customer') || !f.name.trim()) return;
    this.saving = true;
    this.createError = '';
    this.formError = ''; // a save is the next thing the person did: an older page refusal is stale
    try {
      await erplora().command('customers.create', {
        name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), tax_id: f.tax_id.trim(),
        address: f.address.trim(), city: f.city.trim(), postal_code: f.postal_code.trim(),
        country: f.country.trim(), avatar: '', notes: f.notes,
        lifecycle_stage: f.lifecycle_stage, source: f.source.trim() || 'walk_in',
        company_name: f.company_name.trim(),
        birthday: f.birthday || null, anniversary: f.anniversary || null,
        preferred_channel: f.preferred_channel,
        // No consent: creating a customer is not somebody saying yes (customers#10). The decision
        // is its own action, with its evidence, on the sheet.
      });
      this.newForm = { ...EMPTY_FORM };
      this.dataTable()?.close(); // el panel se cierra al crear: el alta ya está en la tabla
      await Promise.all([this.ctrl.load(), this.loadStats()]);
    } catch (e) {
      this.createError = domainErrorText(e, 'ui.errCreate');
    } finally {
      this.saving = false;
    }
  }

  // — Detail —
  /** True when the sheet now shows ANOTHER customer: an answer for `id` must not land on it. With
   *  no sheet open the answer is kept (callers that load before opening rely on it). */
  private sheetMovedOn(id: string): boolean {
    return this.detail !== null && this.detail.id !== id;
  }

  private async openDetail(id: string) {
    const seq = ++this.detailSeq;
    this.formError = '';
    this.formMsg = '';
    this.pendingDelete = null;
    this.editing = false;
    this.closeMerge();
    try {
      const rows = await erplora().query<Customer[]>('customers.get', { customer_id: id });
      if (seq !== this.detailSeq) return;
      const customer = rows?.[0];
      if (!customer) { this.formError = erplora().t(CATALOG, 'ui.errCustomerNotFound'); return; }
      // A sheet for ANOTHER customer starts empty: the previous one's fields, notes, consent and
      // groups must never show (nor be saved by «Save») under the new name while this one's load.
      // Re-opening the same customer (after «Save») keeps what is there and only refreshes it.
      if (this.detail?.id !== customer.id) {
        this.activities = []; this.fieldValues = []; this.groupIds = []; this.tagIds = [];
        this.consentState = []; this.consentHistory = [];
      }
      this.detail = customer;
      this.consentAsking = '';
      await Promise.all([this.loadActivities(id), this.loadMemberships(id), this.loadFieldValues(id), this.loadConsent(id), this.resolveDetailSlot()]);
    } catch (e) {
      if (seq !== this.detailSeq) return;
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errLoadCustomer');
    }
  }

  private async loadFieldValues(id: string) {
    try {
      const rows = await erplora().query<FieldValue[]>('customers.fields.values', { customer_id: id });
      if (this.sheetMovedOn(id)) return;
      this.fieldValues = rows ?? [];
    } catch {
      if (this.sheetMovedOn(id)) return;
      this.fieldValues = [];
    }
  }

  /** The consent panel reads the LEDGER, never `d.marketing_consent`: that column is a derived
   *  mirror kept for older readers, and the sheet is the one place where the difference between
   *  «they said yes on 3 August, by email, after reading this» and «1» has to be visible. */
  private async loadConsent(id: string) {
    const client = erplora();
    try {
      const [state, history] = await Promise.all([
        client.query<ConsentState[]>('customers.consent.state', { customer_id: id }),
        client.query<ConsentFact[]>('customers.consent.history', { customer_id: id }),
      ]);
      if (this.sheetMovedOn(id)) return;
      this.consentState = state ?? [];
      this.consentHistory = history ?? [];
    } catch {
      if (this.sheetMovedOn(id)) return;
      // A hub whose `customers` is older than this ledger has no such query. Emptying is right:
      // the panel then says nothing has been recorded, which is exactly true of that hub.
      this.consentState = [];
      this.consentHistory = [];
    }
  }

  /** The address the consent is being given FOR, as it stands right now. Empty when the sheet has
   *  none — a phone consent on a sheet with no phone is still a fact worth keeping. */
  private contactPoint(channel: string): string {
    const d = this.detail;
    if (!d) return '';
    return channel === 'email' ? (d.email ?? '') : (d.phone ?? '');
  }

  private async recordConsent(channel: string) {
    if (!can('customers.change_customer') || !this.detail || this.saving) return;
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('customers.consent.grant', {
        customer_id: this.detail.id,
        purpose: 'marketing',
        channel,
        contact_point: this.contactPoint(channel),
        source: 'counter',
        // The wording travels VERBATIM, not as a key: catalogues change, and «the sentence that was
        // on screen in January» cannot be recovered from today's file (EDPB 05/2020 §108).
        notice_text: erplora().t(CATALOG, 'ui.consentNotice'),
        notice_version: CONSENT_NOTICE_VERSION,
      });
      this.consentAsking = '';
      this.formMsg = erplora().t(CATALOG, 'ui.consentRecorded');
      await Promise.all([this.loadConsent(this.detail.id), this.ctrl.load()]);
    } catch (e) {
      this.formError = domainErrorText(e, 'ui.errConsent');
    } finally {
      this.saving = false;
    }
  }

  /** Withdrawing is ONE tap, with no dialog and no compulsory reason: it must be at least as easy
   *  as giving (art. 7.3), and a form that demands a justification to unsubscribe is the dark
   *  pattern that article exists against. */
  private async withdrawConsent(channel: string) {
    if (!can('customers.change_customer') || !this.detail || this.saving) return;
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('customers.consent.withdraw', {
        customer_id: this.detail.id,
        purpose: 'marketing',
        channel,
        contact_point: this.contactPoint(channel),
        source: 'counter',
        reason: '',
      });
      this.formMsg = erplora().t(CATALOG, 'ui.consentWithdrawnMsg');
      await Promise.all([this.loadConsent(this.detail.id), this.ctrl.load()]);
    } catch (e) {
      this.formError = domainErrorText(e, 'ui.errConsent');
    } finally {
      this.saving = false;
    }
  }

  /** Edita en memoria el valor de un campo; se persiste al guardar la ficha. */
  private setFieldValue(fieldId: string, value: string) {
    this.fieldValues = this.fieldValues.map((f) => (f.id === fieldId ? { ...f, value } : f));
  }

  private async loadActivities(id: string) {
    try {
      const rows = await erplora().query<Activity[]>('customers.activities', { customer_id: id });
      if (this.sheetMovedOn(id)) return;
      this.activities = rows ?? [];
    } catch {
      if (this.sheetMovedOn(id)) return;
      this.activities = [];
    }
  }

  private async loadMemberships(id: string) {
    try {
      const [groupsPage, tagsPage, gids, tids] = await Promise.all([
        erplora().queryAll<Group>('customers.groups.list'),
        erplora().queryAll<Tag>('customers.tags.list'),
        erplora().query<Array<{ id: string }>>('customers.group_ids', { customer_id: id }),
        erplora().query<Array<{ id: string }>>('customers.tag_ids', { customer_id: id }),
      ]);
      if (this.sheetMovedOn(id)) return;
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

  protected updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.ensureDetailSlotMounted();
    if (changed.has('createError') && this.createError) void this.revealCreateError();
  }

  /** pm#478: the refusal appears ABOVE «Add customer», at the foot of a long form — on a phone that
   *  can leave it off the sheet. Bring it into view once it has painted itself: scrolled before, the
   *  banner still measures 0 px and ends up under the tab bar. */
  private async revealCreateError(): Promise<void> {
    const banner = this.renderRoot.querySelector('[data-testid="customers-list-create-error"]') as
      | (HTMLElement & { updateComplete?: Promise<unknown> })
      | null;
    await banner?.updateComplete;
    banner?.scrollIntoView?.({ block: 'center' });
  }

  private closeDetail() {
    this.detailSeq++;
    this.detail = null;
    this.pendingErase = false;
    this.editing = false;
    this.pendingDelete = null;
    this.closeMerge();
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
      // A legacy free-text country opens as the code it names; text that names none is kept (customers#72).
      country: countryCode(d.country, erplora().locale) || (d.country ?? '').trim(), notes: d.notes ?? '', lifecycle_stage: d.lifecycle_stage || 'lead',
      source: d.source || 'walk_in', company_name: d.company_name ?? '',
      birthday: d.birthday ?? '', anniversary: d.anniversary ?? '',
      preferred_channel: d.preferred_channel || 'none',
      is_active: Boolean(d.is_active),
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
        // No `marketing_consent`: the sheet does not decide consent any more (customers#10). The
        // command ignores the bind and the schema marks it deprecated; sending it would only put
        // back the pretence that editing a sheet is how somebody says yes.
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
      // `customers.customer_unavailable` (customers#49): the row guard refused a delete that would
      // have matched nothing. Translated by its code — the manifest's sentence is English.
      this.formError = domainErrorText(e, 'ui.errDelete');
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
      // No `title`: the command's SQL writes the key `activity.note_added` and the sheet
      // translates it at render time (customers#50). Sending the translated label from here is how
      // Spanish (or English) text ended up frozen in a column.
      await erplora().command('customers.notes.add', {
        customer_id: this.detail.id, content, author_name: '',
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
      <ok-kpi data-testid="customers-list-kpi-total" label=${t('ui.customers')} value=${String(s.total ?? 0)}></ok-kpi>
      <ok-kpi data-testid="customers-list-kpi-active" label=${t('ui.active')} value=${String(s.active ?? 0)}></ok-kpi>
      <ok-kpi data-testid="customers-list-kpi-vip" label=${t('ui.vip')} value=${String(s.vip ?? 0)}></ok-kpi>
      <ok-kpi data-testid="customers-list-kpi-revenue" label=${t('ui.revenue')} value=${this.fmt(s.total_revenue)}></ok-kpi>
    </div>`;
  }

  // — GDPR erasure (customers#11) → ONE transactional command `customers.anonymize`. Two steps with a
  // reason: irreversible, and the reason lands on the audit entry. Only `customers.erase_customer`
  // (admin by default); the soft-delete keeps every piece of PII and is a different button. —
  private async confirmErase() {
    if (!can('customers.erase_customer') || !this.detail) return;
    const target = this.detail;
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('customers.anonymize', { customer_id: target.id, reason: this.eraseReason.trim() });
      this.pendingErase = false;
      this.closeDetail();
      this.formMsg = erplora().t(CATALOG, 'ui.customerErased');
      await Promise.all([this.ctrl.load(), this.loadStats()]);
    } catch (e) {
      this.formError = domainErrorText(e, 'ui.errErase');
    } finally {
      this.saving = false;
    }
  }

  // — Merge (customers#86/#87) → ONE transactional command `customers.merge`. The OPEN sheet is
  // always the survivor: picking «which one survives» would be one more decision at the counter,
  // and opening the other sheet and merging from there already covers that case.
  private openMerge() {
    if (!can('customers.merge_customer') || !this.detail) return;
    this.formError = '';
    this.formMsg = '';
    this.pendingDelete = null;
    this.pendingErase = false;
    this.mergeOpen = true;
    this.mergeTarget = null;
    this.mergeTerm = '';
    void this.searchMerge('');
  }

  private closeMerge() {
    this.mergeOpen = false;
    this.mergeTarget = null;
    this.mergeCandidates = [];
    this.mergeTerm = '';
    this.mergeState = 'idle';
    if (this.mergeTimer) {
      clearTimeout(this.mergeTimer);
      this.mergeTimer = undefined;
    }
  }

  private onMergeSearchInput(e: Event) {
    const value = (e as CustomEvent<{ value?: string }>).detail?.value ?? (e.target as HTMLInputElement).value;
    this.mergeTerm = String(value ?? '');
    if (this.mergeTimer) clearTimeout(this.mergeTimer);
    const term = this.mergeTerm;
    this.mergeTimer = setTimeout(() => { void this.searchMerge(term); }, 250);
  }

  /** Same shape as the till's search (customers-pos): a stale answer is dropped by SEQUENCE, not
   *  by time — the debounce above already keeps the request count low. */
  private async searchMerge(q: string) {
    const seq = ++this.mergeSeq;
    this.mergeState = 'searching';
    try {
      const r = await erplora().query<{ rows: Customer[] } | Customer[]>('customers.list', {
        search: q, limit: 20, sort: 'name', dir: 'asc',
      });
      if (seq !== this.mergeSeq) return; // a newer search already answered
      const rows = Array.isArray(r) ? r : (r?.rows ?? []);
      // The open sheet can never be its own duplicate.
      this.mergeCandidates = rows.filter((c) => String(c.id) !== String(this.detail?.id));
      this.mergeState = this.mergeCandidates.length ? 'idle' : 'empty';
    } catch {
      if (seq !== this.mergeSeq) return;
      this.mergeCandidates = [];
      this.mergeState = 'error';
    }
  }

  private async confirmMerge() {
    if (!can('customers.merge_customer') || !this.detail || !this.mergeTarget || this.saving) return;
    const survivingId = this.detail.id;
    const target = this.mergeTarget;
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('customers.merge', { surviving_id: survivingId, absorbed_id: target.id });
      // openDetail re-reads the survivor (it gained fields and history) and closes this panel.
      await Promise.all([this.openDetail(survivingId), this.ctrl.load(), this.loadStats()]);
      // AFTER openDetail: it clears formMsg on its way in.
      this.formMsg = erplora().t(CATALOG, 'ui.customerMerged', { name: target.name });
    } catch (e) {
      // `customers.customer_unavailable`: the merge's row guard refused it (one of the two sheets
      // is gone, or both are the same). The panel stays open — pick another duplicate or cancel.
      this.formError = domainErrorText(e, 'ui.errMerge');
    } finally {
      this.saving = false;
    }
  }

  private renderEraseConfirm() {
    if (!this.pendingErase || !this.detail || !can('customers.erase_customer')) return nothing;
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    return html`<section class="panel">
      <h3>${t('ui.eraseDataTitle')}</h3>
      <p>${t('ui.eraseDataConfirm', { name: this.detail.name })}</p>
      <ion-input mode="md" fill="outline" data-testid="customers-list-erase-reason" label=${t('ui.eraseReason')} label-placement="floating" .value=${this.eraseReason}
        @ionInput=${(e: Event) => (this.eraseReason = String((e.target as HTMLInputElement).value ?? ''))}></ion-input>
      <footer class="actions">
        <ion-button size="small" class="tone-danger" data-testid="customers-list-erase-submit" ?disabled=${this.saving} @click=${() => this.confirmErase()}>${this.saving ? t('ui.deleting') : t('ui.eraseData')}</ion-button>
        <ion-button size="small" fill="outline" data-testid="customers-list-erase-cancel" @click=${() => (this.pendingErase = false)}>${t('ui.cancel')}</ion-button>
      </footer>
    </section>`;
  }

  /**
   * **The merge panel** (customers#86) — one screen, two steps: pick the duplicate, then read what
   * is going to happen to it before it disappears. The survivor is always the sheet already open.
   */
  private renderMergePanel() {
    if (!this.mergeOpen || !this.detail || !can('customers.merge_customer')) return nothing;
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    const detail = this.detail;
    const target = this.mergeTarget;
    return html`<section class="panel" data-testid="customers-list-merge-panel">
      <h3>${t('ui.mergeTitle')}</h3>
      ${target
        ? html`<div data-testid="customers-list-merge-confirm">
            <p>${t('ui.mergeConfirm', { absorbed: target.name, surviving: detail.name })}</p>
            <footer class="actions">
              <ion-button size="small" class="tone-danger" data-testid="customers-list-merge-submit" ?disabled=${this.saving} @click=${() => this.confirmMerge()}>${this.saving ? t('ui.merging') : t('ui.mergeSubmit')}</ion-button>
              <ion-button size="small" fill="outline" data-testid="customers-list-merge-change" @click=${() => (this.mergeTarget = null)}>${t('ui.mergeChange')}</ion-button>
              <ion-button size="small" fill="clear" data-testid="customers-list-merge-cancel" @click=${() => this.closeMerge()}>${t('ui.cancel')}</ion-button>
            </footer>
          </div>`
        : html`<p>${t('ui.mergeHint', { name: detail.name })}</p>
            <ion-input mode="md" fill="outline" data-testid="customers-list-merge-search" label=${t('ui.mergeSearch')} label-placement="floating" .value=${this.mergeTerm}
              @ionInput=${(e: Event) => this.onMergeSearchInput(e)}></ion-input>
            ${this.mergeState === 'searching'
              ? html`<p class="muted" data-testid="customers-list-merge-searching">${t('ui.mergeSearching')}</p>`
              : this.mergeState === 'error'
                ? html`<ok-inline-feedback data-testid="customers-list-merge-error" tone="danger" icon="alert-circle-outline">${t('ui.errMergeSearch')}</ok-inline-feedback>
                    <ion-button size="small" fill="outline" data-testid="customers-list-merge-retry" @click=${() => this.searchMerge(this.mergeTerm)}>${t('ui.retry')}</ion-button>`
                : this.mergeState === 'empty'
                  ? html`<p class="muted" data-testid="customers-list-merge-empty">${t('ui.mergeNoCandidates')}</p>`
                  : html`<ion-list class="merge-candidates">
                      ${this.mergeCandidates.map((c) => html`<ion-item button detail="false" data-testid=${`customers-list-merge-candidate-${c.id}`}
                        @click=${() => { this.mergeTarget = c; this.formError = ''; }}>
                        <ion-label><h3>${c.name}</h3><p>${[c.email, c.phone].filter(Boolean).join(' · ')}</p></ion-label>
                      </ion-item>`)}
                    </ion-list>`}
            <footer class="actions">
              <ion-button size="small" fill="outline" data-testid="customers-list-merge-cancel" @click=${() => this.closeMerge()}>${t('ui.cancel')}</ion-button>
            </footer>`}
    </section>`;
  }

  private renderDeleteConfirm() {
    if (!this.pendingDelete || !can('customers.delete_customer')) return nothing;
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    return html`<section class="panel">
      <h3>${t('ui.deleteCustomerTitle')}</h3>
      <p>${t('ui.deleteCustomerConfirm', { name: this.pendingDelete.name })}</p>
      <footer class="actions">
        <ion-button size="small" class="tone-danger" data-testid="customers-list-delete-submit" ?disabled=${this.saving} @click=${() => this.confirmDelete()}>${this.saving ? t('ui.deleting') : t('ui.delete')}</ion-button>
        <ion-button size="small" fill="outline" data-testid="customers-list-delete-cancel" @click=${() => (this.pendingDelete = null)}>${t('ui.cancel')}</ion-button>
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
            return html`<ion-select mode="md" data-field=${f.id} data-testid=${`customers-list-field-${f.id}`} fill="outline" label=${label} label-placement="floating"
              .value=${f.value} @ionChange=${set(f.id)}>
              ${opts.map((o) => html`<ion-select-option value=${o}>${o}</ion-select-option>`)}
            </ion-select>`;
          }
          if (f.field_type === 'textarea') {
            return html`<ion-textarea mode="md" data-field=${f.id} data-testid=${`customers-list-field-${f.id}`} fill="outline" label=${label} label-placement="floating"
              auto-grow .value=${f.value} @ionInput=${set(f.id)}></ion-textarea>`;
          }
          if (f.field_type === 'boolean') {
            return html`<ion-checkbox data-field=${f.id} data-testid=${`customers-list-field-${f.id}`} .checked=${f.value === '1'}
              @ionChange=${(e: Event) => this.setFieldValue(f.id, (e.target as HTMLInputElement).checked ? '1' : '')}>
              ${label}
            </ion-checkbox>`;
          }
          const type = f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text';
          return html`<ion-input mode="md" data-field=${f.id} data-testid=${`customers-list-field-${f.id}`} type=${type} fill="outline" label=${label}
            label-placement="floating" .value=${f.value} @ionInput=${set(f.id)}></ion-input>`;
        })}
      </div>
    </section>`;
  }

  // `mode="md"` on EVERY control that declares `fill` — here and everywhere else in this module
  // (customers#48). Ionic implements `fill` for `md` only:
  //
  //     const hasOutlineFill = mode === 'md' && this.fill === 'outline';
  //
  // and the Hub pins Ionic to `ios` globally (ADR-0143, hub#760). Without the per-control mode the
  // attribute is a SILENT no-op: no box, no border, no surface — a form that reads as static text.
  // Nothing throws, so the guard that keeps it from creeping back is a test:
  // `tests/ionic_fill_needs_md.test.py` (source, runs in the module gate) and `fill-needs-md.test.ts`
  // (render).
  /**
   * ONE field of the customer sheet, drawn the same way wherever it appears — the add panel and the
   * edit form (customers#51). Before this, the add panel had a hand-written form of its own with two
   * inputs in it, which is how the two screens drifted apart in the first place: adding a field to
   * the sheet only ever reached one of them.
   *
   * `scope` is only there for the `data-testid` (customers#70): the two screens never share the
   * DOM, but a spec that fills `customers-list-sheet-create-name` says which flow it is driving,
   * and a failure names the screen instead of «the name field».
   */
  private sheetField(
    key: keyof EditForm,
    form: EditForm,
    patch: (part: Partial<EditForm>) => void,
    scope: 'create' | 'edit',
  ) {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const label = t(SHEET_FIELD_LABEL[key]);
    const value = String(form[key] ?? '');
    if (key === 'lifecycle_stage' || key === 'preferred_channel') {
      const options = key === 'lifecycle_stage' ? STAGE_KEY : CHANNEL_KEY;
      const label_ = key === 'lifecycle_stage' ? stageLabel : channelLabel;
      return html`<ion-select mode="md" data-sheet-field=${key} data-testid=${`customers-list-sheet-${scope}-${key}`} fill="outline" label=${label}
        label-placement="floating" .value=${value}
        @ionChange=${(e: any) => patch({ [key]: e.target.value } as Partial<EditForm>)}>
        ${Object.keys(options).map((v) => html`<ion-select-option value=${v}>${label_(v)}</ion-select-option>`)}
      </ion-select>`;
    }
    if (key === 'country') return this.countryField(form, label, patch, scope);
    if (key === 'notes') {
      return html`<ion-textarea mode="md" data-sheet-field=${key} data-testid=${`customers-list-sheet-${scope}-${key}`} fill="outline" label=${label}
        label-placement="floating" auto-grow .value=${value}
        @ionInput=${(e: any) => patch({ notes: e.target.value })}></ion-textarea>`;
    }
    const type = key === 'email' ? 'email' : key === 'birthday' || key === 'anniversary' ? 'date' : 'text';
    return html`<ion-input mode="md" data-sheet-field=${key} data-testid=${`customers-list-sheet-${scope}-${key}`} type=${type} fill="outline" label=${label}
      label-placement="floating" .value=${value}
      @ionInput=${(e: any) => patch({ [key]: e.target.value } as Partial<EditForm>)}></ion-input>`;
  }

  /**
   * The country is PICKED from a searchable list and stored as its ISO code (customers#72): typed by
   * hand, «Fr.» or a typo reached the till unread and the invoice went out as Spain. `ok-combo`, as
   * in `taxes` (taxes#41): 249 options in a plain select is a scroll nobody finishes. A file written
   * before whose text cannot be read keeps it as an option of its own, so it stays visible and an
   * unrelated edit never erases it; «No country» is how it is cleared.
   */
  private countryField(
    form: EditForm,
    label: string,
    patch: (part: Partial<EditForm>) => void,
    scope: 'create' | 'edit',
  ) {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const countries = countryOptions(erplora().locale);
    const value = form.country;
    const legacy = value && !countries.some((o) => o.value === value) ? [{ value, label: value }] : [];
    return html`<ok-combo data-sheet-field="country" data-testid=${`customers-list-sheet-${scope}-country`} label=${label}
      .options=${[{ value: '', label: t('ui.countryNone') }, ...legacy, ...countries]}
      .value=${value}
      .labels=${{ placeholder: t('ui.countrySearch'), empty: t('ui.countryNoMatch') }}
      @ok-change=${(e: CustomEvent<{ value: string }>) => patch({ country: e.detail.value })}></ok-combo>`;
  }

  private renderEditForm() {
    const f = this.form;
    const t = (k: string): string => erplora().t(CATALOG, k);
    const field = (key: keyof EditForm) =>
      this.sheetField(key, f, (part) => (this.form = { ...this.form, ...part }), 'edit');
    return html`<form data-testid="customers-list-edit-form" @submit=${(e: Event) => this.saveEdit(e)}>
      <div class="grid2">
        ${[...SHEET_ESSENTIALS, ...SHEET_MORE].filter((k) => k !== 'notes').map(field)}
      </div>
      <div class="form">
        ${field('notes')}
      </div>
      ${this.renderCustomFields()}
      <!-- There is NO consent checkbox here any more (customers#10). A tick on an edit form is a
           consent with no purpose, no channel, no record of what the person was shown and no author
           — and a pre-ticked box is invalid outright (EDPB 05/2020 §168, AEPD FAQ-0211). The
           decision lives in its own panel below, as an action with its evidence. -->
      <label class="check"><ion-checkbox data-testid="customers-list-edit-active" .checked=${f.is_active}
        @ionChange=${(e: any) => (this.form = { ...this.form, is_active: e.target.checked })}></ion-checkbox> ${t('ui.fieldActive')}</label>
      <footer class="actions">
        <ion-button type="submit" size="small" data-testid="customers-list-edit-submit" ?disabled=${this.saving || !f.name.trim()}>${this.saving ? t('ui.saving') : t('ui.save')}</ion-button>
        <ion-button size="small" fill="outline" data-testid="customers-list-edit-cancel" @click=${() => (this.editing = false)}>${t('ui.cancel')}</ion-button>
      </footer>
    </form>`;
  }

  private renderMembership(kind: 'groups' | 'tags') {
    const isGroups = kind === 'groups';
    const items = isGroups ? this.groups : this.tags;
    const selected = isGroups ? this.groupIds : this.tagIds;
    const editable = can('customers.change_customer');
    const t = (k: string): string => erplora().t(CATALOG, k);
    if (!items.length) {
      return html`<p data-testid=${`customers-list-membership-${kind}-empty`}>${t(isGroups ? 'ui.noGroupsDefined' : 'ui.noTagsDefined')}</p>`;
    }
    return html`<div>
      <div class="chips">
        ${items.map((it) => html`<label class="check">
          <ion-checkbox data-testid=${`customers-list-membership-${kind}-item-${it.id}`} .checked=${selected.includes(String(it.id))}
            ?disabled=${!editable}
            @ionChange=${() => {
              if (!editable) return;
              if (isGroups) this.groupIds = this.toggleId(this.groupIds, String(it.id));
              else this.tagIds = this.toggleId(this.tagIds, String(it.id));
            }}></ion-checkbox>
          ${it.name}
        </label>`)}
      </div>
      ${editable
        ? html`<ion-button size="small" data-testid=${`customers-list-membership-${kind}-save`} ?disabled=${this.saving} @click=${() => this.saveMembership(kind)}>${t(isGroups ? 'ui.saveGroups' : 'ui.saveTags')}</ion-button>`
        : nothing}
    </div>`;
  }

  /**
   * **The consent panel** (customers#10) — the sheet's answer to «may we write to this person, and
   * can we prove it».
   *
   * One row per channel with its effective state and ONE action, because that is what the market
   * converged on for a counter (Klaviyo, Mailchimp, Shopify, Fresha all key consent by channel) and
   * because a single yes/no forced «yes to the newsletter» and «yes to WhatsApp» into one answer.
   * Granting asks for confirmation and SHOWS the exact sentence that will be stored as the proof;
   * withdrawing is one tap. That asymmetry is deliberate and it is the law's: giving consent has to
   * be an informed, affirmative act, and taking it back has to be at least as easy (art. 7.3).
   */
  private renderConsent() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const editable = can('customers.change_customer');
    const byChannel = new Map(this.consentState.map((row) => [row.channel, row]));
    // The three the hub can reach somebody through, plus anything that has a fact of its own — the
    // legacy `any` row above all: a recorded decision that no screen shows is a decision nobody can
    // act on.
    const channels = [...CONSENT_CHANNELS, ...this.consentState.map((r) => r.channel)].filter(
      (c, i, all) => all.indexOf(c) === i,
    );
    return html`<section class="panel">
      <h3>${t('ui.consentHeading')}</h3>
      <p class="muted">${t('ui.consentIntro')}</p>
      ${channels.map((channel) => {
        const row = byChannel.get(channel);
        const state = row?.state ?? 'never_asked';
        const asking = this.consentAsking === channel;
        return html`<div class="consent-row" data-consent=${channel} data-testid=${`customers-list-consent-${channel}-row`}>
          <div class="consent-what">
            <strong>${channel === 'any' ? t('ui.consentAnyChannel') : channelLabel(channel)}</strong>
            <span class="muted">${t(CONSENT_STATE_KEY[state] ?? 'ui.consentNeverAsked')}</span>
            ${row?.occurred_at
              ? html`<span class="muted">${formatTimestamp(row.occurred_at)}${row.contact_point ? ` · ${row.contact_point}` : ''}</span>`
              : nothing}
          </div>
          ${!editable
            ? nothing
            : state === 'granted'
              ? html`<ion-button size="small" fill="outline" class="tone-danger" data-act="withdraw"
                  data-testid=${`customers-list-consent-${channel}-withdraw`}
                  ?disabled=${this.saving} @click=${() => this.withdrawConsent(channel)}
                  >${t('ui.consentWithdraw')}</ion-button>`
              : channel === 'any'
                ? html`<ion-button size="small" fill="outline" class="tone-danger" data-act="withdraw"
                  data-testid=${`customers-list-consent-${channel}-withdraw`}
                    ?disabled=${this.saving} @click=${() => this.withdrawConsent(channel)}
                    >${t('ui.consentClose')}</ion-button>`
                : asking
                  ? nothing
                  : html`<ion-button size="small" data-act="grant"
                      data-testid=${`customers-list-consent-${channel}-grant`} ?disabled=${this.saving}
                      @click=${() => { this.consentAsking = channel; this.formError = ''; }}
                      >${t('ui.consentRecord')}</ion-button>`}
          ${asking
            ? html`<div class="consent-ask" data-testid=${`customers-list-consent-${channel}-ask`}>
                <!-- Shown, then stored word for word: this is the evidence, so the operator reads
                     to the customer exactly what will end up in the record. -->
                <p>${t('ui.consentNotice')}</p>
                <p class="muted">${t('ui.consentAskHint')}</p>
                <ion-button size="small" data-act="grant-confirm"
                  data-testid=${`customers-list-consent-${channel}-grant-confirm`} ?disabled=${this.saving}
                  @click=${() => this.recordConsent(channel)}>${t('ui.consentConfirm')}</ion-button>
                <ion-button size="small" fill="outline" data-act="grant-cancel"
                  data-testid=${`customers-list-consent-${channel}-grant-cancel`}
                  @click=${() => { this.consentAsking = ''; }}>${t('ui.cancel')}</ion-button>
              </div>`
            : nothing}
        </div>`;
      })}
      <h4>${t('ui.consentHistoryHeading')}</h4>
      ${this.consentHistory.length
        ? html`<ul class="timeline">
            ${this.consentHistory.map((f) => html`<li data-consent-fact=${f.id} data-testid=${`customers-list-consent-fact-${f.id}`}>
              <div class="t">
                ${t(CONSENT_STATE_KEY[f.state] ?? 'ui.consentNeverAsked')} —
                ${f.channel === 'any' ? t('ui.consentAnyChannel') : channelLabel(f.channel)}
                <small>(${f.source || '—'})</small>
              </div>
              ${f.notice_text ? html`<div class="d">${f.notice_text}</div>` : nothing}
              ${f.reason ? html`<div class="d">${f.reason}</div>` : nothing}
              <div class="when">${formatTimestamp(f.occurred_at)}${f.recorded_by ? ` · ${f.recorded_by}` : ''}</div>
            </li>`)}
          </ul>`
        : html`<p class="muted" data-testid="customers-list-consent-history-empty">${t('ui.consentNoHistory')}</p>`}
    </section>`;
  }

  private renderDetail() {
    const d = this.detail!;
    const t = (k: string): string => erplora().t(CATALOG, k);
    // La ficha es una pantalla propia (no la lista): el `<h2>` es el NOMBRE del cliente, no el
    // título de la vista, y el topbar del shell no lo conoce.
    return html`<div class="detail-page">
      <header>
        <h2>${d.name}</h2>
        <ion-button size="small" fill="outline" data-testid="customers-list-back" @click=${() => this.closeDetail()}>${t('ui.back')}</ion-button>
        ${this.editing || !can('customers.change_customer')
          ? nothing
          : html`<ion-button size="small" data-testid="customers-list-edit" @click=${() => this.startEdit()}>${t('ui.edit')}</ion-button>`}
        ${can('customers.delete_customer')
          ? html`<ion-button size="small" class="tone-danger" fill="outline" data-testid="customers-list-delete" @click=${() => { this.pendingDelete = d; this.closeMerge(); }}>${t('ui.delete')}</ion-button>`
          : nothing}
        ${can('customers.merge_customer')
          ? html`<ion-button size="small" fill="outline" data-testid="customers-list-merge" @click=${() => this.openMerge()}>${t('ui.mergeWith')}</ion-button>`
          : nothing}
        ${can('customers.erase_customer')
          ? html`<ion-button class="erase tone-danger" size="small" fill="clear" data-testid="customers-list-erase" @click=${() => { this.pendingErase = true; this.eraseReason = ''; this.formError = ''; this.closeMerge(); }}>${t('ui.eraseData')}</ion-button>`
          : nothing}
      </header>
      ${this.formError ? html`<ok-inline-feedback data-testid="customers-list-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : nothing}
      ${this.formMsg ? html`<p class="ok" data-testid="customers-list-form-msg">${this.formMsg}</p>` : nothing}
      ${this.renderDeleteConfirm()}
      ${this.renderEraseConfirm()}
      ${this.renderMergePanel()}
      <section class="panel">
        ${this.editing ? this.renderEditForm() : html`<dl class="meta">
          <div><dt>${t('ui.colEmail')}</dt><dd>${d.email || '—'}</dd></div>
          <div><dt>${t('ui.colPhone')}</dt><dd>${d.phone || '—'}</dd></div>
          <div><dt>${t('ui.fieldNif')}</dt><dd>${d.tax_id || '—'}</dd></div>
          <div><dt>${t('ui.fieldCompany')}</dt><dd>${d.company_name || '—'}</dd></div>
          <div><dt>${t('ui.fieldAddress')}</dt><dd>${[d.address, d.postal_code, d.city, countryName(d.country, erplora().locale)].filter(Boolean).join(', ') || '—'}</dd></div>
          <div><dt>${t('ui.colStage')}</dt><dd>${stageLabel(d.lifecycle_stage)}</dd></div>
          <div><dt>${t('ui.fieldSource')}</dt><dd>${d.source || '—'}</dd></div>
          <div><dt>${t('ui.fieldPreferredChannel')}</dt><dd>${channelLabel(d.preferred_channel)}</dd></div>
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
      ${this.renderConsent()}
      ${can('customers.add_note') || can('customers.view_activity')
        ? html`<section class="panel">
            ${can('customers.add_note')
              ? html`<h3>${t('ui.addNote')}</h3>
                  <form class="form" data-testid="customers-list-note-form" @submit=${(e: Event) => this.addNote(e)}>
                    <ion-textarea mode="md" fill="outline" data-testid="customers-list-note-text" label=${t('ui.noteLabel')} label-placement="floating" auto-grow .value=${this.newNote}
                      @ionInput=${(e: any) => (this.newNote = e.target.value)}></ion-textarea>
                    <ion-button type="submit" size="small" data-testid="customers-list-note-submit" ?disabled=${this.saving || !this.newNote.trim()}>${t('ui.add')}</ion-button>
                  </form>`
              : nothing}
            ${can('customers.view_activity')
              ? html`<h3>${t('ui.activityHeading')}</h3>
                  ${this.activities.length ? html`<ul class="timeline">
                    ${this.activities.map((a) => html`<li data-testid=${`customers-list-activity-item-${a.id}`}>
                      <div class="t">${activityTitle(a.title)} <small>· ${activityTypeLabel(a.activity_type)}</small></div>
                      ${a.description ? html`<div class="d">${a.description}</div>` : nothing}
                      <div class="when">${formatTimestamp(a.created_at)}</div>
                    </li>`)}
                  </ul>` : html`<p data-testid="customers-list-activity-empty">${t('ui.noActivity')}</p>`}`
              : nothing}
          </section>`
        : nothing}
      ${this.detailFillers.length ? html`<section class="panel detail-slot" data-testid="customers-list-detail-slot"></section>` : nothing}
    </div>`;
  }

  /**
   * **El alta, en un solo paso** (customers#51) — SIEMPRE proyectada en el panel `create` de la
   * tabla (si sólo se pintara al pulsar el «+», el panel abriría vacío).
   *
   * Los mismos campos que la ficha, con el reparto del mercado: identidad y datos fiscales a la
   * vista, el resto tras «Más datos». El desplegable es un `<details>` nativo —teclado y lector de
   * pantalla gratis, sin componente nuevo, y ya hay precedente en `flows`— y arranca cerrado: el
   * alta de mostrador tiene que seguir siendo escribir un nombre y pulsar.
   *
   * Sólo el NOMBRE bloquea el botón. Lo demás es opcional (customers#32): un ultramarinos vende sin
   * NIF, un asesor no.
   */
  private renderCreateForm() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const field = (key: keyof EditForm) =>
      this.sheetField(key, this.newForm, (part) => (this.newForm = { ...this.newForm, ...part }), 'create');
    return html`<form slot="create" class="create-form" data-testid="customers-list-create-form" @submit=${(e: Event) => this.create(e)}>
      ${SHEET_ESSENTIALS.map(field)}
      <details class="more">
        <summary data-testid="customers-list-more-details">${t('ui.moreDetails')}</summary>
        <div class="create-form">${SHEET_MORE.map(field)}</div>
      </details>
      <!-- pm#478: the refusal travels WITH the form — on a phone the panel is a full-screen sheet
           and a banner on the page underneath it is never seen. -->
      ${this.createError ? html`<ok-inline-feedback data-testid="customers-list-create-error" tone="danger" icon="alert-circle-outline">${this.createError}</ok-inline-feedback>` : nothing}
      <ion-button type="submit" size="small" data-testid="customers-list-create-submit" ?disabled=${this.saving || !this.newForm.name.trim()}>${this.saving ? t('ui.saving') : t('ui.addCustomer')}</ion-button>
    </form>`;
  }

  render() {
    if (this.detail) return this.renderDetail();
    const t = (k: string): string => erplora().t(CATALOG, k);
    // Sin `<h2>`: el título de la vista lo pinta el topbar del shell.
    return html`<div class="page">
        ${this.renderStats()}
        ${this.formError ? html`<ok-inline-feedback data-testid="customers-list-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : nothing}
        ${this.formMsg ? html`<p class="ok" data-testid="customers-list-form-msg">${this.formMsg}</p>` : nothing}
        ${this.importing ? html`<p class="ok" data-testid="customers-list-importing">${t('ui.importing')}</p>` : nothing}
        ${this.renderImportReport()}
        ${this.renderDeleteConfirm()}
        ${this.ctrl?.error ? html`<ok-inline-feedback data-testid="customers-list-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : nothing}
        <!-- The «View» button is not the only door: rowClickable makes the whole row open the
             same ficha (outfitkit#67 — the actions column can be off-screen at 1440 px). -->
        <ok-data-table testid="customers-list-table" .serverSide=${true} .fill=${true} .labels=${dataTableLabels(erplora().locale)} .views=${true} .cardTitle=${(r: Record<string, unknown>) => String(r.name ?? '—')} .cardIcon=${() => 'person-outline'} .addable=${can('customers.add_customer')} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${t('ui.searchCustomers')} .actions=${this.rowActions} .rowClickable=${true} .importable=${can('customers.add_customer')} .exportable=${can('customers.export_customer')} .csvName=${'customers.csv'} .columnPicker=${true} .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.emptyCustomers')} @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => this.onRowAction(e)} @rowClick=${(e: CustomEvent<{ row: Record<string, unknown> }>) => this.openDetail(String(e.detail.row.id))} @csvImport=${(e: CustomEvent<{ rows: Record<string, string>[] }>) => this.onCsvImport(e)} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @pageSizeChange=${(e: CustomEvent<number>) => this.ctrl.setPageSize(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}>
          ${this.renderCreateForm()}
        </ok-data-table>
      </div>`;
  }
}

define('erp-customers-list', ErpCustomersList);
