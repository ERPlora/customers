// RBAC contract of the manifest (customers#9).
//
// The UI is never the security barrier: `can()` hides buttons, the RUNTIME enforces
// `role_permissions` on every query/command. So the door that matters is `module.json`, and this
// file pins what it must say. Found in origin/main@053c659: `customers.activity.add` was guarded by
// `customers.view_activity` — a READ permission on a MUTATION — so the `employee` role (read-only
// plus customer/note creation) could inject entries into any customer's timeline by API.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'module.json'), 'utf8')) as {
  permissions: string[];
  role_permissions: Record<string, string[]>;
  commands: Record<string, { permission: string }>;
  queries: Record<string, { permission: string }>;
};

const granted = (role: string, permission: string) =>
  manifest.role_permissions[role].includes('*') || manifest.role_permissions[role].includes(permission);

describe('a read permission never guards a mutation (customers#9)', () => {
  it.each(Object.keys(manifest.commands))('%s is guarded by a mutating permission', (name) => {
    const permission = manifest.commands[name].permission;
    expect(manifest.permissions, 'the permission must be one this module declares').toContain(permission);
    expect(permission, `\`${name}\` mutates: a view_* permission would let a read-only role write`).not.toMatch(
      /\.view_/,
    );
  });

  it('customers.activity.add is guarded by its own mutating permission', () => {
    expect(manifest.commands['customers.activity.add'].permission).toBe('customers.add_activity');
  });
});

describe('role matrix admin / manager / employee', () => {
  it('employee cannot write the timeline; manager and admin can', () => {
    const permission = manifest.commands['customers.activity.add'].permission;
    expect(granted('employee', permission), 'employee is read-only on the timeline').toBe(false);
    expect(granted('manager', permission)).toBe(true);
    expect(granted('admin', permission)).toBe(true);
  });

  it('viewing a customer sheet grants no mutation of groups, tags, fields, notes or activity', () => {
    // Every command guarded by `view_customer` would be a mutation reachable by simply being
    // allowed to look — the manifest must not have any.
    const guardedByView = Object.entries(manifest.commands)
      .filter(([, def]) => def.permission.includes('.view_'))
      .map(([name]) => name);
    expect(guardedByView).toEqual([]);
  });

  it('employee holds none of the change_/delete_/manage_ permissions', () => {
    const employee = manifest.role_permissions.employee;
    expect(employee).not.toContain('*');
    expect(employee.filter((p) => /\.(change_|delete_|manage_)/.test(p))).toEqual([]);
  });

  it('every permission a role names is one the module declares', () => {
    for (const [role, perms] of Object.entries(manifest.role_permissions)) {
      for (const p of perms) {
        if (p === '*') continue;
        expect(manifest.permissions, `role ${role} names an undeclared permission`).toContain(p);
      }
    }
  });
});
