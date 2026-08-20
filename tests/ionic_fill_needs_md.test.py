#!/usr/bin/env python3
"""A control that declares `fill` must declare `mode="md"`, or it paints no box at all (customers#48).

Why this file exists: QA opened the edit form of a customer sheet and saw the labels — «Teléfono»,
«NIF/CIF», «Empresa», «Dirección»… — floating on the page background with NO input box around them.
Nothing threw, nothing warned; the form simply looked like static text and the user could not tell
what was editable or where to click.

The cause is one line of Ionic 8 (`@ionic/core/dist/collection/components/input/input.js`):

    const hasOutlineFill = mode === 'md' && this.fill === 'outline';

`fill` is implemented for `md` ONLY. The Hub pins Ionic to `ios` globally (ADR-0143, hub#760,
`hub/apps/web/src/main.ts`: `createApp(App).use(IonicVue, { mode: 'ios', … })`), so every
`fill="outline"` in a module's Web Component is a silent no-op. The per-control escape hatch that
Ionic documents is `mode="md"` on the control itself, which is what this module now does.

This is a SOURCE test on purpose, and it is a Python one so the module gate runs it (`erplora test`
picks up `tests/**/*.test.py`). A styling bug that raises no error needs something that looks at it
for you, or it creeps back into the next screen. Same guard the Hub and the Cloud Portal already
carry (`hub/apps/web/src/theme/ionic-fill-needs-md.test.ts`,
`saas/tests/unit/test_ionic_fill_needs_md.py`) — parity Cloud ↔ Hub ↔ módulos.

Usage: tests/ionic_fill_needs_md.test.py   (exit 0 = green). No Postgres, no Docker: it reads the
source of `ui/`.
"""

import pathlib
import re
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
UI = MODULE_DIR / "ui"

#: Opening tag of an Ionic form control, even when its attributes span several lines.
CONTROL = re.compile(r"<ion-(?:input|select|textarea)(?=[\s/>])[^>]*>", re.S)

failures: list[str] = []


def check(label: str, expected, actual):
    if expected != actual:
        failures.append(f"{label} — expected [{expected}], got [{actual}]")
        print(f"  FAIL: {label} — expected [{expected}], got [{actual}]")
    else:
        print(f"  ok: {label} = {expected}")


def controls_with_dead_fill(source: str) -> list[str]:
    dead = []
    for tag in CONTROL.findall(source):
        if not re.search(r"\bfill=", tag):
            continue
        if re.search(r'\bmode="md"', tag):
            continue
        dead.append(re.sub(r"\s+", " ", tag)[:110])
    return dead


def main() -> int:
    sources = sorted(p for p in UI.rglob("*.ts") if not p.name.endswith(".test.ts"))
    print(f"· scanning {len(sources)} component source(s) under ui/")
    check("there is UI to scan at all", True, bool(sources))

    offenders: list[str] = []
    declared = 0
    for path in sources:
        text = path.read_text()
        declared += len([t for t in CONTROL.findall(text) if re.search(r"\bfill=", t)])
        for tag in controls_with_dead_fill(text):
            offenders.append(f"  {path.relative_to(MODULE_DIR)}: {tag}")

    print(f"· {declared} control(s) declare a `fill`")
    check('every control that declares `fill` also pins mode="md"', [], offenders)

    if failures:
        print(
            f'\n{len(offenders)} control(s) will render with NO box at all — add mode="md" to each:'
        )
        for line in offenders:
            print(line)
        return 1
    print("\nOK: no `fill` in this module is a silent no-op")
    return 0


if __name__ == "__main__":
    sys.exit(main())
