// La relación M2M solo se crea contra un padre del MISMO hub (pm#146).
//
// La mitad de LECTURA ya está: los JOIN de `group_ids`, `tag_ids` y `groups_list` llevan la
// igualdad de hub desde pm#89. Pero un JOIN acotado no impide que la fila cruzada EXISTA — solo
// impide verla desde el lado que se acotó.
//
// Y aquí la escritura estaba abierta de par en par:
//
//     INSERT INTO customers_customer_groups (customer_id, group_id)
//     VALUES (:customer_id, :group_id)
//
// Las dos ids vienen del payload, y **la tabla de unión no tiene `hub_id`**: no hay ninguna columna
// donde el aislamiento pudiera apoyarse. Un cliente del hub A podía quedar unido a un grupo del hub
// B, y esa fila se queda ahí aunque la lectura ya no la enseñe.
//
// La receta es la de services#7, y son DOS cosas, no una:
//
//   1. la relación se crea resolviendo **los dos padres** contra el `:hub_id` que inyecta el
//      runtime — nunca contra un campo del payload;
//   2. y si no casan, **falla** (`expect_rows`). Un INSERT condicional sin esa guarda es PEOR que
//      el bug original: no escribe, y aun así devuelve OK y emite el evento — el sistema afirma
//      que hizo algo que no hizo.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'module.json'), 'utf8')) as {
  id: string;
  commands: Record<
    string,
    { sql?: string[]; expect_rows?: { op: string; n: number; error: string; message?: string } }
  >;
};

/** El SQL declarado de un command, sin sus comentarios `--`. */
const sqlOf = (name: string) =>
  (manifest.commands[name].sql ?? [])
    .map((rel) =>
      readFileSync(join(ROOT, rel), 'utf8')
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n'),
    )
    .join('\n');

describe('una relación solo se escribe contra un padre del mismo hub (pm#146)', () => {
  const RELATIONS = [
    { command: 'customers._group_add', parent: 'customers_customergroup' },
    { command: 'customers._tag_add', parent: 'customers_customertag' },
  ] as const;

  it.each(RELATIONS)('$command resuelve el padre contra el hub inyectado', ({ command, parent }) => {
    const sql = sqlOf(command);

    expect(sql, `toma cualquier id: también el de otro hub`).toMatch(new RegExp(parent));
    expect(sql, 'el cliente también es un padre, y también hay que acotarlo').toMatch(
      /customers_customer\b/,
    );
    // Dos, uno por padre: acotar solo el cliente dejaría entrar el grupo del vecino.
    expect(
      (sql.match(/hub_id\s*=\s*:hub_id/g) ?? []).length,
      'los DOS padres se resuelven contra `:hub_id`, no uno',
    ).toBeGreaterThanOrEqual(2);
  });

  it.each(RELATIONS)('$command falla en vez de no escribir y decir que sí', ({ command }) => {
    const gate = manifest.commands[command].expect_rows;

    expect(gate, 'un INSERT condicional sin `expect_rows` es un no-op silencioso que aun así emite')
      .toBeTruthy();
    expect(gate!.op).toBe('min');
    expect(gate!.n).toBeGreaterThanOrEqual(1);
    expect(gate!.error.split('.')[0], 'el instalador exige el namespace del módulo').toBe(
      manifest.id,
    );
    expect(gate!.message, 'ningún shell traduce estos códigos todavía: hace falta el texto').toBeTruthy();
  });
});

// customers#7 — the OTHER half: the writes that are not an `add`.
//
// `_group_clear`/`_tag_clear` deleted by `customer_id` alone: a caller of hub A that knew a UUID of
// hub B could empty its groups/tags. `_field_value_set` wrote the caller's hub but never checked
// that the customer or the field belong to it. The live-database proof is
// `tests/tenant_scope_writes.pg.test.py` (two hubs, real Postgres); this is the lexical tripwire so
// the next edit of these files is born red if it drops the scope.
describe('the other writes are scoped to the hub too (customers#7)', () => {
  it.each(['customers._group_clear', 'customers._tag_clear'])(
    '%s only deletes relations of a customer of the injected hub',
    (command) => {
      const sql = sqlOf(command);
      expect(sql).toMatch(/customers_customer\b/);
      expect(sql, 'the scope comes from the parent: the junction table has no hub_id').toMatch(
        /hub_id\s*=\s*:hub_id/,
      );
    },
  );

  it('customers._field_value_set resolves BOTH parents against the injected hub and fails otherwise', () => {
    const sql = sqlOf('customers._field_value_set');
    expect(sql).toMatch(/customers_customerfield\b/);
    expect(sql).toMatch(/customers_customer\b/);
    expect((sql.match(/hub_id\s*=\s*:hub_id/g) ?? []).length).toBeGreaterThanOrEqual(2);

    const gate = manifest.commands['customers._field_value_set'].expect_rows;
    expect(gate, 'a conditional INSERT without `expect_rows` is a silent no-op that says OK').toBeTruthy();
    expect(gate!.op).toBe('min');
    expect(gate!.n).toBeGreaterThanOrEqual(1);
    expect(gate!.error.split('.')[0]).toBe(manifest.id);
    expect(gate!.message).toBeTruthy();
  });
});
