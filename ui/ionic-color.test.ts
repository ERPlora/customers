// No `ion-*` of this module takes its colour from `color=` (ERPlora/pm#392, module-toolkit#273).
//
// Ionic implements `color="danger"` in two halves: the component adds `.ion-color-danger` to its
// host and paints from `--ion-color-base`, whose VALUE comes from a GLOBAL rule in the document's
// stylesheet (`.ion-color-danger { --ion-color-base: … }`). Document rules do not reach inside a
// shadow root, and every screen of this module is a Lit Web Component with its own. So the solid
// «Delete» / «Erase data» buttons of the confirm panels rendered as white text on a transparent
// background — an invisible destructive action — and the outline/clear ones silently fell back to
// the primary blue, so «Withdraw consent» looked like any other button.
//
// The fix: no `color=`; the component's own CSS (which DOES live inside the shadow root) sets the
// button's custom properties from the theme tokens, which inherit through the boundary.
//
// happy-dom neither lays out nor loads Ionic's CSS, so the computed background cannot be measured
// here (that is checked in a real browser). What is pinned is the CONTRACT that makes it impossible:
// the source carries no `color=` on an `ion-*`, the danger tone is declared in each component's
// styles, and the rendered buttons carry that tone.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

const UI = dirname(fileURLToPath(import.meta.url));

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sources(full));
    else if (/\.ts$/.test(entry.name) && !/\.(test|spec)\.ts$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * The attribute names of every `<ion-*>` opening tag. A Lit tag does not end at the first `>`
 * (`@click=${() => …}`), so `${…}` expressions and quoted values are skipped, not read.
 */
function ionTags(source: string): { line: number; attrs: string }[] {
  const found: { line: number; attrs: string }[] = [];
  const start = /<ion-[a-z-]+(?=[\s/>])/g;
  let m: RegExpExecArray | null;
  while ((m = start.exec(source))) {
    let attrs = '';
    let depth = 0;
    let quote: string | null = null;
    let i = m.index + m[0].length;
    for (; i < source.length; i += 1) {
      const ch = source[i];
      if (quote) {
        if (ch === '\\') i += 1;
        else if (ch === quote) quote = null;
        continue;
      }
      if (depth > 0) {
        if (ch === '"' || ch === "'" || ch === '`') quote = ch;
        else if (ch === '{') depth += 1;
        else if (ch === '}') depth -= 1;
        continue;
      }
      if (ch === '$' && source[i + 1] === '{') { depth = 1; i += 1; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '>') break;
      attrs += ch;
    }
    found.push({ line: source.slice(0, m.index).split('\n').length, attrs: `${m[0]}${attrs}` });
  }
  return found;
}

const DECLARES_COLOR = /(?:^|\s)\.?color=/;

describe('pm#392: no ion-* delegates its colour to color=', () => {
  it('the source of ui/ carries no color= on an ion-* element', () => {
    const offenders = sources(UI).flatMap((file) =>
      ionTags(readFileSync(file, 'utf8'))
        .filter((t) => DECLARES_COLOR.test(t.attrs))
        .map((t) => `${relative(UI, file)}:${t.line}`),
    );
    expect(offenders, 'color= paints nothing inside a module shadow root').toEqual([]);
  });

  it('the reader sees a color= hidden behind an arrow function (control of the control)', () => {
    const tag = '<ion-button size="small" @click=${() => this.go()} color="danger">x</ion-button>';
    expect(ionTags(tag).filter((t) => DECLARES_COLOR.test(t.attrs))).toHaveLength(1);
    expect(ionTags('<ion-button @click=${() => ({ color: 1 })}>x</ion-button>').filter((t) => DECLARES_COLOR.test(t.attrs))).toHaveLength(0);
  });
});

type Styled = { styles: { cssText: string } | { cssText: string }[] };
const cssOf = (ctor: unknown): string => {
  const s = (ctor as Styled).styles;
  return Array.isArray(s) ? s.map((c) => c.cssText).join('\n') : s.cssText;
};

/** The body of the first rule whose selector matches `selector`. */
function ruleBody(css: string, selector: RegExp): string {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) if (selector.test(m[1])) return m[2];
  return '';
}

const SOLID = /ion-button\.tone-danger:not\(\[fill\]\)/;
const OUTLINED = /ion-button\.tone-danger\[fill\]/;

beforeEach(() => {
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'customers.get') return [{ id: 'c1', name: 'Ada Lovelace', is_active: 1 }];
      return [];
    },
    queryPage: async () => ({ rows: [], total: 0 }),
    queryAll: async () => [],
    command: async () => ({}),
    hasPermission: () => true,
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
  };
});

/** `[tag, loader, has an outline/clear danger button too]` */
const COMPONENTS = [
  ['erp-customers-list', () => import('./components/erp-customers-list/erp-customers-list'), true],
  ['erp-customers-fields', () => import('./components/erp-customers-fields/erp-customers-fields'), false],
  ['erp-customers-groups', () => import('./components/erp-customers-groups/erp-customers-groups'), false],
  ['erp-customers-tags', () => import('./components/erp-customers-tags/erp-customers-tags'), false],
] as const;

describe('pm#392: the danger tone is painted from inside the shadow root', () => {
  it.each(COMPONENTS)('%s declares its danger buttons from the token', async (tag, load, outlined) => {
    await load();
    const css = cssOf(customElements.get(tag));
    const solid = ruleBody(css, SOLID);
    expect(solid, 'solid: the background itself').toMatch(/--background:\s*var\(--ion-color-danger\b/);
    expect(solid).toMatch(/--background-activated:\s*var\(--ion-color-danger-shade\b/);
    expect(solid).toMatch(/--background-hover:\s*var\(--ion-color-danger-tint\b/);
    expect(solid).toMatch(/--color:\s*var\(--ion-color-danger-contrast\b/);
    if (!outlined) return;
    const rule = ruleBody(css, OUTLINED);
    expect(rule, 'outline/clear: the text and the border').toMatch(/--color:\s*var\(--ion-color-danger\b/);
    expect(rule).toMatch(/--border-color:\s*var\(--ion-color-danger\b/);
  });

  it('the POS search marks the selected customer with the primary token, not color=', async () => {
    await import('./components/erp-customers-pos-search/erp-customers-pos-search');
    const css = cssOf(customElements.get('erp-customers-pos-search'));
    expect(ruleBody(css, /ion-icon\.selected-mark/)).toMatch(/color:\s*var\(--ion-color-primary\b/);
  });

  it('the customer sheet, its erase panel and its delete dialog render every destructive button with the tone', async () => {
    await import('./components/erp-customers-list/erp-customers-list');
    const el = document.createElement('erp-customers-list') as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
      detail: unknown;
      pendingDelete: unknown;
      pendingErase: boolean;
    };
    document.body.appendChild(el);
    await el.updateComplete;
    const customer = { id: 'c1', name: 'Ada Lovelace', is_active: 1 };
    el.detail = customer;
    el.pendingDelete = customer;
    el.pendingErase = true;
    await el.updateComplete;

    const buttons = [...el.shadowRoot.querySelectorAll('ion-button')];
    const label = (b: Element) => b.textContent?.trim() ?? '';
    const destructive = buttons.filter((b) => ['ui.delete', 'ui.eraseData'].includes(label(b)));
    // Header: Delete (outline) + Erase data (clear); erase panel: Erase data (solid).
    expect(destructive.map((b) => `${label(b)}:${b.getAttribute('fill') ?? 'solid'}`).sort()).toEqual(
      ['ui.delete:outline', 'ui.eraseData:clear', 'ui.eraseData:solid'],
    );
    expect(destructive.filter((b) => !b.classList.contains('tone-danger')).map(label)).toEqual([]);
    expect(buttons.filter((b) => b.hasAttribute('color')).map(label)).toEqual([]);
    // customers#95: the delete question is an <ion-alert> on document.body, whose «Delete» Ionic
    // paints in the danger tone by its `destructive` role.
    const dialog = document.querySelector('ion-alert[data-testid="customers-list-delete-confirm"]') as
      | (HTMLElement & { buttons: Array<{ text: string; role?: string }> })
      | null;
    expect(dialog?.buttons.find((b) => b.text === 'ui.delete')?.role).toBe('destructive');
    el.remove();
  });
});
