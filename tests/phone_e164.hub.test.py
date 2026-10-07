#!/usr/bin/env python3
"""The customer's phone is SAVED in E.164 (`+34600111222`) by the real kernel (customers#121).

Why: the card's phone is what the rest of the hub compares against. Appointments copies it into the
appointment, and the «appointment confirmed» WhatsApp notice looks the conversation up with that
copy; WhatsApp keys its conversations by the international number. A card typed «600 111 222»
never matched its conversation (the notice did not arrive), and a card typed «600111» matched any
number that merely contained those digits (the notice went to somebody else). Saving every phone in
one canonical form — and refusing the ones that are not a phone of their country — removes both.

Contract fixed here, through the SHIPPED `dist/handler.wasm` on the real dispatcher:

  * `customers.create` with «600 111 222» (no prefix → the business's country, Spain when the hub
    never saved one) stores `+34600111222`; «0034 611-222-333» stores `+34611222333`.
  * A number that is not possible for its country («600111», too short for Spain) is refused with
    the business code `customers.phone_invalid` and no card is written.
  * An empty phone is still fine: only the name is required (CUSTOMERS-F01).
  * `customers.update` and `customers.update_with_fields` normalise the same way
    («+44 (0)7700 900123» → `+447700900123`) and refuse the same way.
  * `customers.bulk_create` creates the good rows normalised, does NOT create the bad one, and says
    which item it skipped and why (`result.rejected = [{index, code}]`).
  * Searching the list by the number as digits finds the card (CUSTOMERS-F02).
  * `customers.by_phone` reads the QUESTION with the same rules: the card saved from
    «+44 (0)7700 9…» answers «+44 (0)7700 9…», «0044 (0)7700 9…» and WhatsApp's «447700 9…»
    (customers#130, CUSTOMERS-F10).

Usage: `erplora test <dir> --against-hub` (module-toolkit#110). Without a runtime it fails.
"""

import sys
import uuid

from hub_harness import Hub, key


def refusal(status: int, body) -> str:
    """The error code of a refused command, or 'accepted' when it went through."""
    if status == 200 and (body or {}).get("ok"):
        return "accepted"
    err = (body or {}).get("error") or body or {}
    if isinstance(err, str):
        return body.get("code")
    return err.get("code")


def phone_of(hub: Hub, customer_id: str):
    rows = hub.query("customers.get", {"customer_id": customer_id})
    return rows[0].get("phone") if len(rows) == 1 else None


def named(hub: Hub, name: str) -> list:
    return [
        r
        for r in hub.query("customers.list", {"search": name})
        if r.get("name") == name
    ]


def sheet(customer_id: str, name: str, phone: str) -> dict:
    return {
        "customer_id": customer_id,
        "name": name,
        "email": "",
        "phone": phone,
        "tax_id": "",
        "address": "",
        "city": "",
        "postal_code": "",
        "country": "",
        "notes": "",
        "lifecycle_stage": "lead",
        "source": "walk_in",
        "company_name": "",
        "birthday": None,
        "anniversary": None,
        "preferred_channel": "none",
        "marketing_consent": 0,
        "is_active": 1,
    }


def test_create_saves_e164(hub: Hub) -> str | None:
    print("\n1 · customers.create saves the phone in E.164")
    out = hub.run("customers.create", {"name": key("spaced"), "phone": "600 111 222"})
    cid = (out.get("new_ids") or [None])[0]
    hub.check_true("the card exists", isinstance(cid, str) and cid != "", str(out))
    if not cid:
        return None
    hub.check(
        "«600 111 222» is stored as +34600111222", phone_of(hub, cid), "+34600111222"
    )

    out = hub.run("customers.create", {"name": key("idd"), "phone": "0034 611-222-333"})
    other = (out.get("new_ids") or [None])[0]
    hub.check(
        "«0034 611-222-333» is stored as +34611222333",
        phone_of(hub, other),
        "+34611222333",
    )

    out = hub.run("customers.create", {"name": key("nophone")})
    bare = (out.get("new_ids") or [None])[0]
    hub.check(
        "a card without phone is still created (only the name is required)",
        phone_of(hub, bare),
        "",
    )
    return cid


def test_create_refuses_an_impossible_number(hub: Hub) -> None:
    print("\n2 · customers.create refuses a number that is not a phone of its country")
    name = key("short")
    status, body = hub.command("customers.create", {"name": name, "phone": "600111"})
    hub.check(
        "«600111» is refused with the business code",
        refusal(status, body),
        "customers.phone_invalid",
    )
    hub.check("and no card is written", named(hub, name), [])


def test_update_normalises_and_refuses(hub: Hub, cid: str) -> None:
    print("\n3 · customers.update and update_with_fields normalise the same way")
    name = hub.query("customers.get", {"customer_id": cid})[0]["name"]
    hub.run("customers.update", sheet(cid, name, "+44 (0)7700 900123"))
    hub.check(
        "«+44 (0)7700 900123» is stored as +447700900123",
        phone_of(hub, cid),
        "+447700900123",
    )

    status, body = hub.command("customers.update", sheet(cid, name, "12345"))
    hub.check(
        "update refuses «12345»", refusal(status, body), "customers.phone_invalid"
    )
    hub.check("and keeps the stored phone", phone_of(hub, cid), "+447700900123")

    payload = sheet(cid, name, "(+34) 655.44.33.22")
    payload["fields"] = []
    hub.run("customers.update_with_fields", payload)
    hub.check(
        "update_with_fields stores +34655443322", phone_of(hub, cid), "+34655443322"
    )

    payload["phone"] = "655"
    status, body = hub.command("customers.update_with_fields", payload)
    hub.check(
        "update_with_fields refuses «655»",
        refusal(status, body),
        "customers.phone_invalid",
    )


def test_search_finds_the_digits(hub: Hub, cid: str) -> None:
    print("\n4 · searching the list by the number finds the card")
    rows = [
        r
        for r in hub.query("customers.list", {"search": "655443322"})
        if r.get("id") == cid
    ]
    hub.check("search «655443322» finds it", len(rows), 1)


def test_bulk_create_skips_the_bad_row(hub: Hub) -> None:
    print("\n5 · customers.bulk_create creates the good rows and reports the bad one")
    names = [key("bulk-ok"), key("bulk-bad"), key("bulk-ok2")]
    out = hub.run(
        "customers.bulk_create",
        {
            "items": [
                {"name": names[0], "phone": "611 22 33 44"},
                {"name": names[1], "phone": "12"},
                {"name": names[2], "phone": "+33 6 12 34 56 78"},
            ]
        },
    )
    hub.check("two creates", out.get("operations"), 2)
    hub.check(
        "the bad item is reported with its index and code",
        (out.get("result") or {}).get("rejected"),
        [{"index": 1, "code": "customers.phone_invalid"}],
    )
    ok = named(hub, names[0])
    hub.check(
        "item 0 stored as +34611223344", [r.get("phone") for r in ok], ["+34611223344"]
    )
    hub.check("item 1 was not created", named(hub, names[1]), [])
    fr = named(hub, names[2])
    hub.check(
        "item 2 keeps its own country: +33612345678",
        [r.get("phone") for r in fr],
        ["+33612345678"],
    )


def test_by_phone_reads_the_question_like_the_alta(hub: Hub) -> None:
    print("\n6 · customers.by_phone reads the question with the alta's rules (customers#130)")
    # A number of its own per run: the hub is shared and by_phone answers every card that has it.
    tail = f"{uuid.uuid4().int % 100000:05d}"
    typed = f"+44 (0)7700 9{tail}"
    out = hub.run("customers.create", {"name": key("uk"), "phone": typed})
    cid = (out.get("new_ids") or [None])[0]
    hub.check(f"«{typed}» is stored as +4477009{tail}", phone_of(hub, cid), f"+4477009{tail}")
    for asked in (typed, f"0044 (0)7700 9{tail}", f"4477009{tail}"):
        ids = [r.get("id") for r in hub.query("customers.by_phone", {"phone": asked})]
        hub.check(f"customers#130: by_phone «{asked}» finds that card", ids, [cid])


def main() -> int:
    hub = Hub("phone_e164", needs=("customers",))
    cid = test_create_saves_e164(hub)
    test_create_refuses_an_impossible_number(hub)
    if cid:
        test_update_normalises_and_refuses(hub, cid)
        test_search_finds_the_digits(hub, cid)
    test_bulk_create_skips_the_bad_row(hub)
    test_by_phone_reads_the_question_like_the_alta(hub)
    return hub.finish(
        "every way of saving a card stores its phone in E.164 or refuses it"
    )


if __name__ == "__main__":
    sys.exit(main())
