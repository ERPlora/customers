# Módulo `customers` — CRM del POS

Ficha de cliente con datos de contacto y fiscales, segmentación por **grupos** (con descuento) y
**etiquetas**, **campos personalizados** por tenant, **timeline** de actividad y notas, y métricas de
compra (nº de compras, gasto, última compra, etapa de ciclo de vida). Recibe automáticamente las
ventas completadas para actualizar el historial del cliente.

> **Module id:** `customers`. **Depende de:** nada (`depends_on: []` a propósito — declarar `sales`
> haría que instalar un CRM arrastre el POS entero, ADR-0141).
> Módulo híbrido: SQL + handler WASM (`bulk_create`, `set_groups`, `set_tags`).

## Documentación de usuario — [`docs/`](docs/)

Viaja **dentro** del módulo y se versiona con él: el asistente del hub (ADR-0282) la indexa por
versión instalada y cita la de TU versión, no la de la última publicada. En inglés (idioma fuente).

| Fichero | Para qué |
| ------- | -------- |
| [`docs/overview.md`](docs/overview.md) | Qué hace y qué NO hace; el slot que aporta al TPV |
| [`docs/screens.md`](docs/screens.md) | Customers / Groups / Tags / Fields y el selector de cliente en la venta |
| [`docs/concepts.md`](docs/concepts.md) | El cliente de la factura es un **snapshot congelado**, la junction la owna customers, `set_groups`/`set_tags` REEMPLAZAN, transiciones de lifecycle |
| [`docs/limits.md`](docs/limits.md) | Huecos conocidos, validaciones, permisos por acción y diagnóstico |

## Qué expone hoy

| Tipo | Nombre | Permiso |
| ---- | ------ | ------- |
| query | `customers.list` / `.get` / `.stats` / `.group_ids` / `.tag_ids` / `.orders.by_customer` | `view_customer` |
| query | `customers.groups.list` · `customers.tags.list` | `view_customergroup` · `view_customertag` |
| query | `customers.fields.list` / `.fields.values` | `view_customer` |
| query | `customers.activities` | `view_activity` |
| command | `customers.create` / `.bulk_create` (WASM, cap 50) | `add_customer` |
| command | `customers.update` / `.set_groups` (WASM) / `.set_tags` (WASM) / `.orders.link` / `.record_purchase` | `change_customer` |
| command | `customers.delete` | `delete_customer` (solo admin) |
| command | `customers.groups.*` / `customers.tags.*` / `customers.fields.*` | los `*_customergroup` / `*_customertag` / `manage_custom_fields` |
| command | `customers.notes.add` (nota + entrada del timeline en una transacción) · `customers.activity.add` | `add_note` · `add_activity` (admin/manager; el rol de lectura no muta el timeline) |
| escucha | `sale.completed` → `customers.record_purchase` (venta anónima = no-op) | — |
| emite | `customer.created` / `.updated` / `.deleted` | — |
| slot | `sales.pos.assign` → `erp-customers-pos-search` (prioridad 200) | `view_customer` |

Navegación: `erp-customers-list`, `erp-customers-groups`, `erp-customers-tags`,
`erp-customers-fields`.

## Layout

```text
module.json                   # manifest (contrato técnico)
migrations/postgres/          # esquema §2.5 (hub_id + soft-delete + auditoría)
queries/*.sql                 # lecturas declarativas (:hub_id inyectado)
commands/*.sql                # escrituras declarativas (las `_` son intenciones del WASM)
schemas/*.json                # JSON Schemas de input (draft 2020-12)
handler/                      # WASM Tier 2 → dist/handler.wasm
ui/                           # Web Components (Lit/Ionic/OutfitKit)
docs/                         # documentación de usuario + corpus del asistente
```

## Estado y trabajo abierto

El estado vive en las **Issues de este repo**, no aquí. Huecos conocidos y documentados en
`docs/limits.md`: sin pantalla para los **valores** de campos personalizados y sin pantalla de
import masivo (`bulk_create` es solo API).

Doc de arquitectura: `architecture/modules/customers.md` (cargarlo antes de tocar el módulo).
