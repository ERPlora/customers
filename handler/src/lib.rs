//! Handlers WASM (Tier 2) del módulo `customers` — las operaciones **batch** del legacy:
//!
//! * `bulk_create` — alta de N clientes (cap 50, igual que CustomerService.bulk_create).
//!   Normaliza lifecycle "customer" → "active" (fiel a create_customer).
//! * `set_groups` — asigna los grupos de un cliente (M2M): emite un `_group_clear`
//!   + un `_group_add` por group_id (reemplaza la colección completa, como routes).
//! * `set_tags` — idem para etiquetas (`_tag_clear` + N `_tag_add`).
//!
//! Lógica pura (sin BD): recibe `{payload, context}`, devuelve **intenciones** (ops SQL
//! por nombre de command del mismo módulo + params) que el host valida y ejecuta en una
//! transacción. Los ids de filas nuevas salen de `context.new_ids` (autoridad del host).

pub mod phone;
mod phone_metadata;

use erplora_guest_sdk::{DomainError, Event, Operation, Output};
use serde_json::{json, Map, Value};

#[cfg(feature = "guest")]
use extism_pdk::*;

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn bulk_create(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    Ok(Json(bulk_create_pure(input.into_inner().into_value())))
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn create(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    Ok(Json(create_pure(input.into_inner().into_value())))
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn update(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    Ok(Json(update_pure(input.into_inner().into_value())))
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn set_groups(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    Ok(Json(set_membership(
        input.into_inner().into_value(),
        "group",
    )))
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn update_with_fields(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    Ok(Json(update_with_fields_pure(input.into_inner().into_value())))
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn set_tags(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    Ok(Json(set_membership(input.into_inner().into_value(), "tag")))
}

const MAX_BULK: usize = 50;

fn as_str(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        _ => String::new(),
    }
}

fn opt_str(item: &Value, key: &str) -> Value {
    match item.get(key) {
        Some(Value::Null) | None => Value::Null,
        Some(v) => Value::String(as_str(v)),
    }
}

fn str_or(item: &Value, key: &str, default: &str) -> String {
    let s = as_str(item.get(key).unwrap_or(&Value::Null));
    if s.is_empty() {
        default.to_string()
    } else {
        s
    }
}

fn payload_context(input: &Value) -> (Value, Vec<Value>) {
    let payload = input.get("payload").cloned().unwrap_or(Value::Null);
    let empty: Vec<Value> = Vec::new();
    let new_ids = input
        .get("context")
        .and_then(|c| c.get("new_ids"))
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or(empty);
    (payload, new_ids)
}

/// Normaliza el lifecycle: "customer" → "active" (fiel a create_customer del legacy).
fn norm_stage(item: &Value) -> String {
    let s = str_or(item, "lifecycle_stage", "active");
    if s == "customer" {
        "active".to_string()
    } else {
        s
    }
}

/// Lógica pura de `bulk_create`.
pub fn bulk_create_pure(input: Value) -> Output {
    let (payload, new_ids) = payload_context(&input);
    let empty: Vec<Value> = Vec::new();
    let items = payload
        .get("items")
        .and_then(|v| v.as_array())
        .unwrap_or(&empty);

    let mut ops: Vec<Operation> = Vec::new();
    // customers#121: a row whose phone is not a phone of its country is NOT created; the answer
    // names it (`result.rejected`, by item index) so the import can say which line it skipped.
    let mut rejected: Vec<Value> = Vec::new();
    let home = business_country(&input);
    for (i, item) in items.iter().take(MAX_BULK).enumerate() {
        let phone = match phone::to_e164(&str_or(item, "phone", ""), &home) {
            Ok(phone) => phone,
            Err(_) => {
                rejected.push(json!({ "index": i, "code": format!("customers.{PHONE_INVALID}") }));
                continue;
            }
        };
        // Item `i` keeps batch id `i` whether or not an earlier row was skipped.
        let id = new_ids.get(i).cloned().unwrap_or(Value::Null);
        let mut p = Map::new();
        p.insert("new_id".into(), id); // create.sql usa :new_id
        p.insert(
            "name".into(),
            json!(as_str(item.get("name").unwrap_or(&Value::Null))),
        );
        p.insert("email".into(), json!(str_or(item, "email", "")));
        p.insert("phone".into(), json!(phone));
        p.insert("tax_id".into(), json!(str_or(item, "tax_id", "")));
        p.insert("address".into(), json!(str_or(item, "address", "")));
        p.insert("city".into(), json!(str_or(item, "city", "")));
        p.insert("postal_code".into(), json!(str_or(item, "postal_code", "")));
        p.insert("country".into(), json!(str_or(item, "country", "")));
        p.insert("avatar".into(), json!(str_or(item, "avatar", "")));
        p.insert("notes".into(), json!(str_or(item, "notes", "")));
        p.insert("lifecycle_stage".into(), json!(norm_stage(item)));
        p.insert("source".into(), json!(str_or(item, "source", "import")));
        p.insert(
            "company_name".into(),
            json!(str_or(item, "company_name", "")),
        );
        p.insert("birthday".into(), opt_str(item, "birthday"));
        p.insert("anniversary".into(), opt_str(item, "anniversary"));
        p.insert(
            "preferred_channel".into(),
            json!(str_or(item, "preferred_channel", "none")),
        );
        p.insert(
            "marketing_consent".into(),
            json!(item
                .get("marketing_consent")
                .and_then(|v| v.as_bool())
                .unwrap_or(false) as i64),
        );
        p.insert("consent_date".into(), opt_str(item, "consent_date"));
        ops.push(Operation::sql("customers._create", p));
    }
    Output {
        operations: ops,
        events: vec![],
        result: Some(json!({ "rejected": rejected })),
        ..Default::default()
    }
}

const PHONE_INVALID: &str = "phone_invalid";
const PHONE_INVALID_MESSAGE: &str =
    "That is not a phone number of its country: check the digits, or write it with its international prefix (+44…).";

/// The business's country (`hub_settings.country_code`, handed over by the host as
/// `context.country_code`): the one a phone typed without prefix belongs to.
fn business_country(input: &Value) -> String {
    as_str(input.get("context").and_then(|c| c.get("country_code")).unwrap_or(&Value::Null))
}

/// The card as the caller sent it, with its phone in E.164 (customers#121) — or the refusal.
/// An absent or null phone is left alone: the SQL keeps its own default for it.
fn card_with_e164_phone(input: &Value, card: &Value) -> Result<Map<String, Value>, Output> {
    let mut card = card.as_object().cloned().unwrap_or_default();
    if let Some(raw) = card.get("phone").filter(|v| !v.is_null()) {
        let e164 = phone::to_e164(&as_str(raw), &business_country(input))
            .map_err(|_| domain_error(PHONE_INVALID, PHONE_INVALID_MESSAGE.into()))?;
        card.insert("phone".into(), json!(e164));
    }
    Ok(card)
}

/// `customers.create`: the card's SQL (`customers._create`) with its phone in E.164, and the
/// `customer.created` notice carrying the card AS SAVED — the host announces the handler's copy
/// instead of the caller's payload (hub#1786), so listeners (WhatsApp linking its conversations)
/// see the stored phone and the row's id in `new_id`, as they did when the command was plain SQL.
pub fn create_pure(input: Value) -> Output {
    let (payload, new_ids) = payload_context(&input);
    let mut card = match card_with_e164_phone(&input, &payload) {
        Ok(card) => card,
        Err(refusal) => return refusal,
    };
    card.insert("new_id".into(), new_ids.first().cloned().unwrap_or(Value::Null));
    Output {
        operations: vec![Operation::sql("customers._create", card.clone())],
        events: vec![Event::new("customer.created", Value::Object(card))],
        ..Default::default()
    }
}

/// `customers.update`: same as [`create_pure`] for an existing card (`customers._update`,
/// `customer.updated`).
pub fn update_pure(input: Value) -> Output {
    let (payload, _ids) = payload_context(&input);
    let card = match card_with_e164_phone(&input, &payload) {
        Ok(card) => card,
        Err(refusal) => return refusal,
    };
    Output {
        operations: vec![Operation::sql("customers._update", card.clone())],
        events: vec![Event::new("customer.updated", Value::Object(card))],
        ..Default::default()
    }
}

/// The binds `customers.update` expects (schemas/update.json): the handler forwards the sheet as
/// the caller sent it — the SQL is the one place that knows the columns.
const UPDATE_BINDS: &[&str] = &[
    "customer_id", "name", "email", "phone", "tax_id", "address", "city", "postal_code",
    "country", "notes", "lifecycle_stage", "source", "company_name", "birthday", "anniversary",
    "preferred_channel", "marketing_consent", "is_active",
];

fn domain_error(code: &str, message: String) -> Output {
    Output {
        error: Some(DomainError::new(format!("customers.{code}"), message)),
        ..Default::default()
    }
}

/// Validates ONE value against its field definition. `Ok(())` or `(error code, message)`.
/// The stored value is TEXT for every type; the type governs its shape (customers#13):
/// number = decimal, date = ISO `YYYY-MM-DD`, boolean = `1`/`0`, select = one of `options`.
/// The empty string is "unset" for every type — `required` is checked apart.
fn validate_field_value(field: &Value, value: &str) -> Result<(), (&'static str, String)> {
    if value.is_empty() {
        return Ok(());
    }
    let name = as_str(field.get("name").unwrap_or(&Value::Null));
    match as_str(field.get("field_type").unwrap_or(&Value::Null)).as_str() {
        "number" => value
            .parse::<f64>()
            .ok()
            .filter(|n| n.is_finite())
            .map(|_| ())
            .ok_or_else(|| ("field_invalid_number", format!("`{name}` must be a number, got `{value}`."))),
        "date" => {
            let b = value.as_bytes();
            let ok = b.len() == 10
                && b[4] == b'-'
                && b[7] == b'-'
                && b.iter().enumerate().all(|(i, c)| i == 4 || i == 7 || c.is_ascii_digit())
                && (1..=12).contains(&value[5..7].parse::<u8>().unwrap_or(0))
                && (1..=31).contains(&value[8..10].parse::<u8>().unwrap_or(0));
            if ok { Ok(()) } else { Err(("field_invalid_date", format!("`{name}` must be a date `YYYY-MM-DD`, got `{value}`."))) }
        }
        "boolean" => {
            if value == "1" || value == "0" { Ok(()) } else { Err(("field_invalid_boolean", format!("`{name}` must be `1` or `0`, got `{value}`."))) }
        }
        "select" => {
            let raw = as_str(field.get("options").unwrap_or(&Value::Null));
            let options: Vec<String> = serde_json::from_str::<Vec<Value>>(&raw)
                .unwrap_or_default()
                .iter()
                .map(as_str)
                .collect();
            if options.iter().any(|o| o == value) {
                Ok(())
            } else {
                Err(("field_invalid_option", format!("`{name}` must be one of {options:?}, got `{value}`.")))
            }
        }
        _ => Ok(()), // text | textarea: free text
    }
}

/// `customers.update_with_fields` (customers#13): the customer sheet AND its custom-field values in
/// one validated, atomic write. `context.reads["customers.fields.values"]` (a `required` read) is
/// the hub's active field definitions with this customer's current values, so the handler — not the
/// browser — decides: unknown field → `field_unavailable`; wrong shape for the type →
/// `field_invalid_*`; a required field left empty (after applying the payload over the stored
/// value) → `field_required`. Any rejection aborts the whole command: the sheet is never half-saved.
///
/// Scope of `required` (market: Square/Toast/Lightspeed/Fresha/Odoo enforce custom-field rules on
/// the profile form, never on the walk-in): it applies to the FULL SHEET (this command). The walk-in
/// `customers.create`, `bulk_create` and the CSV import may leave required fields pending.
pub fn update_with_fields_pure(input: Value) -> Output {
    let (payload, _ids) = payload_context(&input);
    // customers#121: the phone in E.164, or nothing is written.
    let payload = match card_with_e164_phone(&input, &payload) {
        Ok(card) => Value::Object(card),
        Err(refusal) => return refusal,
    };
    let empty: Vec<Value> = Vec::new();
    let defs = input
        .get("context")
        .and_then(|c| c.get("reads"))
        .and_then(|r| r.get("customers.fields.values"))
        .and_then(|v| v.as_array())
        .unwrap_or(&empty);
    let sent = payload.get("fields").and_then(|v| v.as_array()).unwrap_or(&empty);

    // 1) every sent field must be a live field of this hub, with a value of the right shape.
    let mut values: Vec<(String, String)> = Vec::new();
    for item in sent {
        let field_id = as_str(item.get("field_id").unwrap_or(&Value::Null));
        let value = as_str(item.get("value").unwrap_or(&Value::Null)).trim().to_string();
        let Some(field) = defs.iter().find(|d| as_str(d.get("id").unwrap_or(&Value::Null)) == field_id) else {
            return domain_error(
                "field_unavailable",
                "That field is not available: it does not exist in this business or it has been deleted.".into(),
            );
        };
        if let Err((code, msg)) = validate_field_value(field, &value) {
            return domain_error(code, msg);
        }
        values.push((field_id, value));
    }
    // 2) every required field must end up with a value (payload wins over the stored one).
    for field in defs {
        let required = field.get("is_required").map(|v| as_str(v) == "1" || v == &Value::Bool(true)).unwrap_or(false);
        if !required {
            continue;
        }
        let id = as_str(field.get("id").unwrap_or(&Value::Null));
        let effective = values
            .iter()
            .find(|(fid, _)| *fid == id)
            .map(|(_, v)| v.clone())
            .unwrap_or_else(|| as_str(field.get("value").unwrap_or(&Value::Null)));
        if effective.trim().is_empty() {
            let name = as_str(field.get("name").unwrap_or(&Value::Null));
            return domain_error("field_required", format!("`{name}` is required."));
        }
    }

    // 3) intentions: the sheet, then one upsert per sent value — one transaction in the host.
    let mut update = Map::new();
    for k in UPDATE_BINDS {
        update.insert((*k).into(), payload.get(*k).cloned().unwrap_or(Value::Null));
    }
    let customer_id = update.get("customer_id").cloned().unwrap_or(Value::Null);
    let mut ops = vec![Operation::sql("customers._update", update)];
    for (field_id, value) in values {
        let mut p = Map::new();
        p.insert("customer_id".into(), customer_id.clone());
        p.insert("field_id".into(), json!(field_id));
        p.insert("value".into(), json!(value));
        ops.push(Operation::sql("customers._field_value_set", p));
    }
    // The notice carries the card AS SAVED (its E.164 phone), not the caller's payload (hub#1786).
    Output {
        operations: ops,
        events: vec![Event::new("customer.updated", payload)],
        ..Default::default()
    }
}

/// Lógica de set_groups / set_tags: clear + N adds (reemplazo de colección M2M).
/// `kind` = "group" | "tag". payload: { customer_id, ids: [..] }.
/// Sin la feature `guest` solo lo ejercitan los tests; el `allow` evita el warning
/// de no-usado en `cargo build` plano.
#[cfg_attr(all(not(feature = "guest"), not(test)), allow(dead_code))]
fn set_membership(input: Value, kind: &str) -> Output {
    let (payload, _ids) = payload_context(&input);
    let customer_id = payload.get("customer_id").cloned().unwrap_or(Value::Null);
    let empty: Vec<Value> = Vec::new();
    let ids = payload
        .get("ids")
        .and_then(|v| v.as_array())
        .unwrap_or(&empty);

    let (clear_cmd, add_cmd, id_key) = match kind {
        "group" => ("customers._group_clear", "customers._group_add", "group_id"),
        _ => ("customers._tag_clear", "customers._tag_add", "tag_id"),
    };

    let mut ops: Vec<Operation> = Vec::new();
    // 1) limpiar la colección actual del cliente.
    let mut clear = Map::new();
    clear.insert("customer_id".into(), customer_id.clone());
    ops.push(Operation::sql(clear_cmd, clear));
    // 2) añadir cada id (INSERT OR IGNORE).
    for ref_id in ids {
        if ref_id.is_null() {
            continue;
        }
        let mut a = Map::new();
        a.insert("customer_id".into(), customer_id.clone());
        a.insert(id_key.into(), ref_id.clone());
        ops.push(Operation::sql(add_cmd, a));
    }
    Output {
        operations: ops,
        events: vec![],
        ..Default::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ctx(n: usize) -> Value {
        let ids: Vec<Value> = (0..n).map(|i| json!(format!("id-{i}"))).collect();
        json!({ "context": { "new_ids": ids } })
    }
    fn with(payload: Value, mut base: Value) -> Value {
        base["payload"] = payload;
        base
    }

    #[test]
    fn bulk_create_normalizes_stage_and_correlates_ids() {
        let payload = json!({ "items": [
            { "name": "Bar Manolo", "email": "m@bar.es", "lifecycle_stage": "customer" },
            { "name": "Ana", "phone": "600 111 222" }
        ]});
        let out = bulk_create_pure(with(payload, ctx(4)));
        assert_eq!(out.operations.len(), 2);
        assert_eq!(out.operations[0].command, "customers._create");
        assert_eq!(out.operations[0].params["new_id"], json!("id-0"));
        // "customer" → "active".
        assert_eq!(out.operations[0].params["lifecycle_stage"], json!("active"));
        assert_eq!(out.operations[0].params["source"], json!("import"));
        assert_eq!(out.operations[1].params["new_id"], json!("id-1"));
        // sin lifecycle → default "active".
        assert_eq!(out.operations[1].params["lifecycle_stage"], json!("active"));
    }

    #[test]
    fn bulk_create_caps_at_50() {
        let items: Vec<Value> = (0..80)
            .map(|i| json!({ "name": format!("C{i}") }))
            .collect();
        let out = bulk_create_pure(with(json!({ "items": items }), ctx(80)));
        assert_eq!(out.operations.len(), MAX_BULK);
    }

    #[test]
    fn set_groups_emits_clear_then_adds() {
        let payload = json!({ "customer_id": "c1", "ids": ["g1", "g2"] });
        let out = set_membership(with(payload, ctx(0)), "group");
        assert_eq!(out.operations.len(), 3);
        assert_eq!(out.operations[0].command, "customers._group_clear");
        assert_eq!(out.operations[0].params["customer_id"], json!("c1"));
        assert_eq!(out.operations[1].command, "customers._group_add");
        assert_eq!(out.operations[1].params["group_id"], json!("g1"));
        assert_eq!(out.operations[2].params["group_id"], json!("g2"));
    }

    // ── customers#13: sheet + custom field values in ONE validated, atomic write ──────────

    fn fields_ctx(defs: Vec<Value>) -> Value {
        json!({ "context": { "new_ids": ["id-0", "id-1", "id-2"],
                             "reads": { "customers.fields.values": defs } } })
    }
    fn def(id: &str, ty: &str, required: i64, options: &str, value: &str) -> Value {
        json!({ "id": id, "name": id, "field_type": ty, "options": options,
                "is_required": required, "sort_order": 0, "value": value })
    }
    fn sheet(fields: Value) -> Value {
        json!({ "customer_id": "c1", "name": "Ana", "email": "", "phone": "", "tax_id": "",
                "address": "", "city": "", "postal_code": "", "country": "", "notes": "",
                "lifecycle_stage": "lead", "source": "walk_in", "company_name": "",
                "birthday": null, "anniversary": null, "preferred_channel": "none",
                "marketing_consent": 0, "is_active": 1, "fields": fields })
    }

    #[test]
    fn update_with_fields_emits_update_then_one_set_per_field() {
        let ctx = fields_ctx(vec![def("f-dye", "text", 0, "[]", ""), def("f-vip", "boolean", 0, "[]", "")]);
        let out = update_with_fields_pure(with(sheet(json!([{ "field_id": "f-dye", "value": "7.1" }])), ctx));
        assert!(out.error.is_none(), "{:?}", out.error);
        assert_eq!(out.operations.len(), 2);
        assert_eq!(out.operations[0].command, "customers._update");
        assert_eq!(out.operations[0].params["customer_id"], json!("c1"));
        assert_eq!(out.operations[0].params["name"], json!("Ana"));
        assert_eq!(out.operations[1].command, "customers._field_value_set");
        assert_eq!(out.operations[1].params["customer_id"], json!("c1"));
        assert_eq!(out.operations[1].params["field_id"], json!("f-dye"));
        assert_eq!(out.operations[1].params["value"], json!("7.1"));
    }

    #[test]
    fn update_with_fields_rejects_missing_required_field() {
        let ctx = fields_ctx(vec![def("f-dye", "text", 1, "[]", "")]);
        let out = update_with_fields_pure(with(sheet(json!([{ "field_id": "f-dye", "value": "  " }])), ctx));
        let err = out.error.expect("required field must reject");
        assert_eq!(err.code, "customers.field_required");
        assert!(out.operations.is_empty(), "nothing is written when a field is invalid");
    }

    #[test]
    fn update_with_fields_required_is_satisfied_by_the_stored_value_when_omitted() {
        // The sheet did not send the field: the stored value counts, the write is not blocked.
        let ctx = fields_ctx(vec![def("f-dye", "text", 1, "[]", "7.1")]);
        let out = update_with_fields_pure(with(sheet(json!([])), ctx));
        assert!(out.error.is_none(), "{:?}", out.error);
        assert_eq!(out.operations.len(), 1);
    }

    #[test]
    fn update_with_fields_validates_number_date_boolean_and_select() {
        let defs = || vec![
            def("f-num", "number", 0, "[]", ""),
            def("f-date", "date", 0, "[]", ""),
            def("f-bool", "boolean", 0, "[]", ""),
            def("f-sel", "select", 0, "[\"Blonde\",\"Brown\"]", ""),
        ];
        let bad = [
            ("f-num", "abc", "customers.field_invalid_number"),
            ("f-date", "31/12/2026", "customers.field_invalid_date"),
            ("f-bool", "yes", "customers.field_invalid_boolean"),
            ("f-sel", "Red", "customers.field_invalid_option"),
        ];
        for (id, v, code) in bad {
            let out = update_with_fields_pure(with(sheet(json!([{ "field_id": id, "value": v }])), fields_ctx(defs())));
            let err = out.error.unwrap_or_else(|| panic!("{id}={v} must reject"));
            assert_eq!(err.code, code, "{id}={v}");
        }
        let good = json!([
            { "field_id": "f-num", "value": "12.5" },
            { "field_id": "f-date", "value": "2026-12-31" },
            { "field_id": "f-bool", "value": "1" },
            { "field_id": "f-sel", "value": "Brown" },
        ]);
        let out = update_with_fields_pure(with(sheet(good), fields_ctx(defs())));
        assert!(out.error.is_none(), "{:?}", out.error);
        assert_eq!(out.operations.len(), 5);
    }

    #[test]
    fn update_with_fields_rejects_unknown_field_of_this_hub() {
        let ctx = fields_ctx(vec![def("f-dye", "text", 0, "[]", "")]);
        let out = update_with_fields_pure(with(sheet(json!([{ "field_id": "f-other-hub", "value": "x" }])), ctx));
        assert_eq!(out.error.expect("unknown field must reject").code, "customers.field_unavailable");
    }

    #[test]
    fn update_with_fields_empty_value_is_allowed_on_optional_field() {
        // Clearing an optional field ("no longer uses that dye") is a real change, not a no-op.
        let ctx = fields_ctx(vec![def("f-num", "number", 0, "[]", "3")]);
        let out = update_with_fields_pure(with(sheet(json!([{ "field_id": "f-num", "value": "" }])), ctx));
        assert!(out.error.is_none(), "{:?}", out.error);
        assert_eq!(out.operations[1].params["value"], json!(""));
    }

    #[test]
    fn set_tags_clear_only_when_empty() {
        let out = set_membership(
            with(json!({ "customer_id": "c1", "ids": [] }), ctx(0)),
            "tag",
        );
        assert_eq!(out.operations.len(), 1);
        assert_eq!(out.operations[0].command, "customers._tag_clear");
    }

    // ── customers#121: every write of a card saves its phone in E.164 or refuses it ─────────
    fn card_ctx(country: &str) -> Value {
        json!({ "context": { "new_ids": ["id-0", "id-1", "id-2", "id-3"], "country_code": country,
                             "reads": { "customers.fields.values": [] } } })
    }

    #[test]
    fn create_saves_e164_and_announces_the_saved_card() {
        let payload = json!({ "name": "Ana", "phone": "600 111 222", "hub_id": "h1", "new_id": "minted" });
        let out = create_pure(with(payload, card_ctx("ES")));
        assert!(out.error.is_none(), "{:?}", out.error);
        assert_eq!(out.operations.len(), 1);
        let op = &out.operations[0];
        assert_eq!(op.command, "customers._create");
        assert_eq!(op.params["phone"], json!("+34600111222"));
        assert_eq!(op.params["name"], json!("Ana"));
        // The row takes the batch id, so `new_ids[0]` of the answer is the card.
        assert_eq!(op.params["new_id"], json!("id-0"));
        assert_eq!(out.events.len(), 1);
        assert_eq!(out.events[0].name, "customer.created");
        assert_eq!(out.events[0].payload["phone"], json!("+34600111222"));
        assert_eq!(out.events[0].payload["new_id"], json!("id-0"));
        assert_eq!(out.events[0].payload["name"], json!("Ana"));
        assert_eq!(out.events[0].payload["hub_id"], json!("h1"));
    }

    #[test]
    fn create_reads_a_number_without_prefix_in_the_business_country() {
        let payload = json!({ "name": "Liz", "phone": "07700 900123" });
        let out = create_pure(with(payload, card_ctx("GB")));
        assert_eq!(out.operations[0].params["phone"], json!("+447700900123"));
    }

    #[test]
    fn create_without_phone_still_creates() {
        let out = create_pure(with(json!({ "name": "Walk-in" }), card_ctx("ES")));
        assert!(out.error.is_none(), "{:?}", out.error);
        assert_eq!(out.operations.len(), 1);
        // An absent phone stays absent: `create.sql` defaults it to ''.
        assert!(out.operations[0].params.get("phone").is_none());
    }

    #[test]
    fn create_refuses_an_impossible_number_and_writes_nothing() {
        let out = create_pure(with(json!({ "name": "Ana", "phone": "600111" }), card_ctx("ES")));
        assert_eq!(out.error.expect("must refuse").code, "customers.phone_invalid");
        assert!(out.operations.is_empty());
        assert!(out.events.is_empty());
    }

    #[test]
    fn update_saves_e164_and_announces_the_saved_card() {
        let out = update_pure(with(sheet(json!([])).tap_phone("+44 (0)7700 900123"), card_ctx("ES")));
        assert!(out.error.is_none(), "{:?}", out.error);
        assert_eq!(out.operations.len(), 1);
        assert_eq!(out.operations[0].command, "customers._update");
        assert_eq!(out.operations[0].params["phone"], json!("+447700900123"));
        assert_eq!(out.operations[0].params["customer_id"], json!("c1"));
        assert_eq!(out.events.len(), 1);
        assert_eq!(out.events[0].name, "customer.updated");
        assert_eq!(out.events[0].payload["phone"], json!("+447700900123"));
        assert_eq!(out.events[0].payload["customer_id"], json!("c1"));
    }

    #[test]
    fn update_refuses_an_impossible_number() {
        let out = update_pure(with(sheet(json!([])).tap_phone("12345"), card_ctx("ES")));
        assert_eq!(out.error.expect("must refuse").code, "customers.phone_invalid");
        assert!(out.operations.is_empty());
        assert!(out.events.is_empty());
    }

    #[test]
    fn update_with_fields_saves_e164_and_announces_it() {
        let out = update_with_fields_pure(with(sheet(json!([])).tap_phone("(+34) 655.44.33.22"), card_ctx("ES")));
        assert!(out.error.is_none(), "{:?}", out.error);
        assert_eq!(out.operations[0].command, "customers._update");
        assert_eq!(out.operations[0].params["phone"], json!("+34655443322"));
        assert_eq!(out.events.len(), 1);
        assert_eq!(out.events[0].name, "customer.updated");
        assert_eq!(out.events[0].payload["phone"], json!("+34655443322"));
    }

    #[test]
    fn update_with_fields_refuses_an_impossible_number() {
        let out = update_with_fields_pure(with(sheet(json!([])).tap_phone("655"), card_ctx("ES")));
        assert_eq!(out.error.expect("must refuse").code, "customers.phone_invalid");
        assert!(out.operations.is_empty());
    }

    #[test]
    fn bulk_create_skips_the_bad_row_and_says_which() {
        let payload = json!({ "items": [
            { "name": "A", "phone": "611 22 33 44" },
            { "name": "B", "phone": "12" },
            { "name": "C", "phone": "+33 6 12 34 56 78" }
        ]});
        let out = bulk_create_pure(with(payload, card_ctx("ES")));
        assert!(out.error.is_none(), "{:?}", out.error);
        assert_eq!(out.operations.len(), 2);
        assert_eq!(out.operations[0].params["phone"], json!("+34611223344"));
        assert_eq!(out.operations[0].params["new_id"], json!("id-0"));
        assert_eq!(out.operations[1].params["name"], json!("C"));
        assert_eq!(out.operations[1].params["phone"], json!("+33612345678"));
        assert_eq!(out.operations[1].params["new_id"], json!("id-2"));
        assert_eq!(
            out.result,
            Some(json!({ "rejected": [{ "index": 1, "code": "customers.phone_invalid" }] }))
        );
    }

    #[test]
    fn bulk_create_with_every_row_good_reports_nothing_rejected() {
        let out = bulk_create_pure(with(json!({ "items": [{ "name": "A" }] }), card_ctx("ES")));
        assert_eq!(out.result, Some(json!({ "rejected": [] })));
    }

    trait TapPhone {
        fn tap_phone(self, phone: &str) -> Value;
    }
    impl TapPhone for Value {
        fn tap_phone(mut self, phone: &str) -> Value {
            self["phone"] = json!(phone);
            self
        }
    }

    // ── customers#130: the SQL that reads phones carries the guest SDK's table, row by row ─────

    /// The `('ISO', 'code', 'trunk', 'idd', '{lengths}'::int[])` rows of a SQL file's
    /// `customers_e164_regions` list, as `iso|code|trunk|idd|lengths`.
    fn sql_regions(sql: &str) -> Vec<String> {
        sql.split("('")
            .skip(1)
            .filter_map(|row| row.split_once("'::int[])").map(|(cells, _)| cells))
            .map(|cells| {
                cells
                    .split(',')
                    .map(|c| c.trim().trim_matches(|ch| ch == '\'' || ch == '{' || ch == '}'))
                    .collect::<Vec<_>>()
            })
            .map(|cells| {
                let (fixed, lengths) = cells.split_at(4.min(cells.len()));
                format!("{}|{}", fixed.join("|"), lengths.join(","))
            })
            .collect()
    }

    fn sdk_regions() -> Vec<String> {
        erplora_guest_sdk::phone::REGIONS
            .iter()
            .map(|r| {
                let lengths: Vec<String> = r.lengths.iter().map(u8::to_string).collect();
                format!("{}|{}|{}|{}|{}", r.iso, r.code, r.trunk, r.idd, lengths.join(","))
            })
            .collect()
    }

    #[test]
    fn the_sweep_reads_phones_with_the_sdk_table() {
        // customers#121 + customers#130: the sweep rewrites old cards with exactly what an edit
        // (`erplora_guest_sdk::phone::to_e164`) would save.
        let sql = include_str!("../../commands/_phones_to_e164.sql");
        assert_eq!(sql_regions(sql), sdk_regions());
    }

    #[test]
    fn by_phone_reads_the_question_with_the_sdk_table() {
        // customers#130: «who carries this number» reads it with the alta's rules, not with a
        // prefix table of its own — «+44 (0)7700 900123» is the card saved as +447700900123.
        let sql = include_str!("../../queries/by_phone.sql");
        assert_eq!(sql_regions(sql), sdk_regions());
    }
}
