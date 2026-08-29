"""Plumbing shared by the `*.hub.test.py` batteries — the ones that talk to a REAL kernel.

`erplora test <dir> --against-hub` (module-toolkit#110) starts the published hub image with its
own Postgres, installs the module through `POST /api/modules/install` and hands the url over in
`ERPLORA_HUB_BASE_URL`. Everything below is the thin layer between a battery and that runtime:
the two doors (`/api/query`, `/api/command`), the error envelope, the event shape, and the one
piece of bookkeeping every battery needs — a `check()` that records a failure instead of dying on
it, so a red run names EVERY broken assertion and not just the first.

Why HTTP and not a scratch Postgres: this battery replaces the hub's own `customers_e2e.rs`
(ERPlora/hub#1264, contract «El Hub se CIERRA como KERNEL» §5). What it asserts is the ONE thing
no hand-written harness can prove: that a REAL `sale.completed` event, emitted by a REAL `sales`
module, actually reaches `customers.record_purchase` through the runtime's own outbox relay —
`customers.record_purchase` is `"internal": true` (customers#8), so it is not even reachable
through `POST /api/command`; the only door onto it is the listener wiring itself. Ported from the
identical `tests/hub_harness.py` of ERPlora/sales#239 (same shape, same design notes, one file per
module on purpose — a shared package would couple two modules that only agree by convention,
never by import).

Two facts of the runtime a battery has to know, both resolved here so no battery hard-codes them:

  * THE TENANT. Module seeds (the payment-method catalogue, the tax rules) land under the
    RUNTIME's own `hub_id`, not under whatever `X-Hub-Id` a request carries (hub#594).
    `GET /api/hub/context` says which id that is, and every request goes out under it.
  * THE SESSION USER. Dev auth trusts `X-User-Id`. Each run mints its own, because batteries share
    one hub for the length of the run and a fixed id would let one battery see rows another one
    wrote under the same identity by accident.

A third fact is specific to the seam this battery proves: `sales.complete_sale` carries
`sale.completed` through the OUTBOX, and `customers.record_purchase` only runs when the relay
delivers it — there is no HTTP door that forces a drain (draining on demand is a test-only
shortcut the runtime does not owe anyone). `wait_until` below polls instead of asserting the
instant after the sale, the boring, standard way to check an eventually-consistent side effect.

It refuses to skip. Without a runtime a battery FAILS: a check that excuses itself is the green
that proves nothing this whole toolkit exists to remove (module-toolkit#50).
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid

BASE = (
    os.environ.get("CUSTOMERS_HUB_BASE_URL")
    or os.environ.get("ERPLORA_HUB_BASE_URL")
    or ""
).rstrip("/")

# Money travels in integer cents (ADR-0007/0123).


def cents(value) -> int:
    """A money aggregate the way Postgres hands it back: `SUM(bigint)` is NUMERIC, so a total may
    arrive as a JSON string (`"5000"`) instead of a number. Either form is the same cents."""
    if isinstance(value, bool):
        raise AssertionError(f"not a money amount: {value!r}")
    if isinstance(value, (int, float)):
        return int(round(value))
    if isinstance(value, str):
        return int(round(float(value)))
    raise AssertionError(f"not a money amount: {value!r}")


class Hub:
    """One battery's view of the live runtime."""

    def __init__(self, battery: str, needs: tuple[str, ...] = ("customers",)):
        self.battery = battery
        self.failures: list[str] = []
        if not BASE:
            print(
                f"{battery}: no runtime at the other end (ERPLORA_HUB_BASE_URL is empty)."
            )
            print(
                "Run it with `erplora test <dir> --against-hub`; without a hub this is NOT a skip, "
                "it is a failure."
            )
            sys.exit(1)
        self.user = f"u-{uuid.uuid4().hex[:8]}"
        self.hub_id = self._runtime_hub_id()
        self._require_installed(needs)

    # ── transport ────────────────────────────────────────────────────────────────────────

    def _request(self, method: str, path: str, body=None):
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(
            f"{BASE}{path}",
            data=data,
            headers={
                "content-type": "application/json",
                "x-hub-id": self.hub_id,
                "x-user-id": self.user,
            },
            method=method,
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                return res.status, json.loads(res.read().decode() or "null")
        except urllib.error.HTTPError as err:
            raw = err.read().decode()
            try:
                return err.code, json.loads(raw or "null")
            except json.JSONDecodeError:
                return err.code, {"raw": raw}

    def _runtime_hub_id(self) -> str:
        req = urllib.request.Request(f"{BASE}/api/hub/context", method="GET")
        with urllib.request.urlopen(req, timeout=60) as res:
            body = json.loads(res.read().decode())
        hub_id = body.get("hub_id")
        if not hub_id:
            print(
                f"{self.battery}: GET /api/hub/context did not say the hub_id: {body}"
            )
            sys.exit(1)
        return hub_id

    def _require_installed(self, needs: tuple[str, ...]) -> None:
        status, body = self._request("GET", "/api/modules")
        installed = (
            {m["id"] for m in (body or {}).get("data", [])} if status == 200 else set()
        )
        missing = [m for m in needs if m not in installed]
        if missing:
            print(
                f"{self.battery}: the runtime at {BASE} does not have {missing} installed "
                f"(installed: {sorted(installed)}). Proving that `sale.completed` reaches "
                "`customers.record_purchase` needs a real `sales` (and its `taxes` dependency) "
                "installed ALONGSIDE `customers` — `customers` itself declares no `depends_on`, "
                "so the harness has to put every one of them there through the same install door. "
                "Not a skip: nothing below can be trusted without them."
            )
            sys.exit(1)

    # ── the two doors ────────────────────────────────────────────────────────────────────

    def query(self, name: str, params: dict | None = None) -> list:
        """Rows of a query. A query with a `list` block answers `{rows,total,…}`; the rest answer
        the bare array. Both come back as the list of rows."""
        status, body = self._request(
            "POST", "/api/query", {"name": name, "params": params or {}}
        )
        if status != 200 or not (body or {}).get("ok"):
            raise AssertionError(f"query {name} answered {status}: {body}")
        data = body["data"]
        if isinstance(data, dict) and "rows" in data:
            return data["rows"]
        return data

    def command(self, name: str, payload: dict):
        """`(status, body)` of a command, whatever the runtime answered."""
        return self._request("POST", "/api/command", {"name": name, "payload": payload})

    def run(self, name: str, payload: dict) -> dict:
        """A command that MUST succeed. Its `data` (`operations`, `new_ids`, …)."""
        status, body = self.command(name, payload)
        if status != 200 or not (body or {}).get("ok"):
            raise AssertionError(f"command {name} answered {status}: {body}")
        return body["data"]

    # ── bookkeeping ──────────────────────────────────────────────────────────────────────

    def check(self, label: str, got, want) -> None:
        if got != want:
            self.failures.append(f"{label} — expected [{want!r}], got [{got!r}]")
            print(f"  FAIL: {label} — expected [{want!r}], got [{got!r}]")
        else:
            print(f"  ok: {label} = {got!r}")

    def check_true(self, label: str, condition: bool, detail="") -> None:
        if not condition:
            self.failures.append(f"{label} — {detail}" if detail else label)
            print(f"  FAIL: {label} {detail}")
        else:
            print(f"  ok: {label}")

    def finish(self, verdict: str) -> int:
        print()
        if self.failures:
            print(f"✗ {self.battery}: {len(self.failures)} failure(s):")
            for f in self.failures:
                print(f"  - {f}")
            return 1
        print(f"✓ {self.battery}: {verdict}")
        return 0


def cash_method_id(hub: Hub) -> str:
    """Id of the CASH method from the hub's `sales`-seeded catalogue, through the public query —
    never composed by hand (sales#20: «the client proposes, the server disposes»)."""
    rows = hub.query("sales.payment_methods")
    cash = next((r for r in rows if r.get("type") == "cash"), None)
    if cash is None:
        raise AssertionError(
            f"the hub's catalogue must carry the `cash` method: {rows}"
        )
    return cash["id"]


def key(tag: str) -> str:
    """A value unique to THIS run — idempotency keys, customer names, order ids — so two runs
    against the same shared hub never collide on a row a previous run already wrote."""
    return f"hub-battery-{tag}-{uuid.uuid4().hex[:8]}"


def wait_until(poll, accept=bool, timeout: float = 8.0, interval: float = 0.25):
    """Retries `poll()` (a zero-arg callable) until `accept(value)` is true or `timeout` runs out,
    then returns whatever `poll()` last answered — never raises, so the caller's own `check()`
    still names the mismatch instead of a bare timeout.

    Why this exists: `sales.complete_sale` writes the outbox row inside the same transaction as
    the sale, but `customers.record_purchase` — a LISTENER of `sale.completed` — only runs once
    the runtime's outbox relay picks the row up: a 1s poll loop the real server always runs
    (`crates/server/src/lib.rs`), not something a request can force synchronously over HTTP. The
    cross-module promise "charging a sale records the customer's purchase" is therefore
    eventually-consistent by design, and asserting it without waiting would be timing the relay's
    poll tick, not the contract."""
    deadline = time.monotonic() + timeout
    value = poll()
    while not accept(value) and time.monotonic() < deadline:
        time.sleep(interval)
        value = poll()
    return value
