import { it, expect } from 'vitest';
import { checkMoneyDisplay } from '@erplora/module-toolkit/money-display-guard';

// GUARD (pm#289, shared since pm#505/pm#508): money on screen is never formatted by hand in this
// module, and OutfitKit comes in by entry point, never as a value from the barrel.
//
// The rules live in `@erplora/module-toolkit/money-display-guard` (one piece for every module,
// tested there against its own positives); this test only says what is specific to Clientes:
//
// * witnesses — the amounts this module paints (the "total spent" column, the revenue KPI and the
//   customer detail figures, all in the list screen) go through the shell's formatter. They count
//   the CALL, not the name: the screen also declares `formatMoney(cents: number, …)` in its
//   `erplora()` interface, and a scan over empty or over-stripped content must not stay green on
//   that declaration (rv-combos-22). Both calls count — the column's `format` and the `fmt()`
//   helper behind the KPI and the detail — so either one painted raw turns this red. The helpers of
//   `lib/` are witnesses too: a shared money helper would land there first, so the scan must
//   provably read them (rv-taxes-78).
// * notDisplay — none: pm#289 found no hand formatting outside a screen amount in this module. Add
//   an entry (`'file: exact code line'` → why; an Intl hit is keyed by its folded CALL, as the
//   finding's detail prints it) only with the reason it is not a screen amount.
// * outfitkitImporters — each of the five screens imports OutfitKit (entry points + types), so the
//   barrel scan provably read all five (rv-pricing-53).
it('money on screen goes through the shared formatter and OutfitKit by entry point (pm#289)', () => {
  expect(
    checkMoneyDisplay({
      from: import.meta.url,
      witnesses: {
        'components/erp-customers-list/erp-customers-list.ts': { text: 'erplora().formatMoney(', atLeast: 2 },
        'lib/country.ts': 'export function countryCode(',
        'lib/domain-error-text.ts': 'export function domainErrorText(',
      },
      notDisplay: {},
      outfitkitImporters: [
        'components/erp-customers-list/erp-customers-list.ts',
        'components/erp-customers-groups/erp-customers-groups.ts',
        'components/erp-customers-tags/erp-customers-tags.ts',
        'components/erp-customers-fields/erp-customers-fields.ts',
        'components/erp-customers-pos-search/erp-customers-pos-search.ts',
      ],
    }),
  ).toEqual([]);
});
