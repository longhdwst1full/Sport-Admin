import { describe, expect, it } from 'vitest';
import { groupPermissionsByModule } from './permission-groups';

describe('groupPermissionsByModule', () => {
  it('groups by module with Vietnamese labels and keeps unknown modules readable', () => {
    const groups = groupPermissionsByModule([
      { code: 'catalog.product.view', module: 'Catalog', action: 'view', sensitive: false },
      { code: 'x.y', module: 'toString', action: 'view', sensitive: false },
      { code: 'catalog.product.edit', module: 'Catalog', action: 'edit', sensitive: true },
    ]);
    expect(groups.map((group) => [group.module, group.label, group.permissions.length])).toEqual([
      ['Catalog', 'Sản phẩm & Danh mục (Catalog)', 2],
      ['toString', 'toString', 1],
    ]);
  });
});
