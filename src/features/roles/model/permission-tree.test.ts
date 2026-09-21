import { describe, expect, it } from 'vitest';
import type { PermissionDto } from '@/generated/api/iam/models';
import {
  UNMAPPED_GROUP_KEY,
  buildPermissionTree,
  permissionFamily,
} from './permission-tree';

const permission = (code: string, action: string, sensitive = false): PermissionDto =>
  ({ code, action, sensitive, module: code.split('.')[0] }) as PermissionDto;

describe('cây quyền theo màn hình', () => {
  it('tách họ quyền bằng cách bỏ đoạn hành động cuối', () => {
    expect(permissionFamily('catalog.product.manage')).toBe('catalog.product');
    expect(permissionFamily('order.view')).toBe('order');
    expect(permissionFamily('standalone')).toBe('standalone');
  });

  it('gom quyền vào đúng nhóm menu của màn hình', () => {
    const tree = buildPermissionTree([
      permission('order.view', 'view'),
      permission('order.manage', 'manage', true),
      permission('catalog.product.view', 'view'),
    ]);

    const sales = tree.find((group) => group.key === 'sales');
    expect(sales?.label).toBe('Bán hàng');
    expect(sales?.screens).toHaveLength(1);
    expect(sales?.screens[0]).toMatchObject({ key: 'order', label: 'Đơn hàng' });
    expect(sales?.screens[0].permissions.map((item) => item.code)).toEqual([
      'order.manage',
      'order.view',
    ]);
    expect(tree.find((group) => group.key === 'catalog')?.screens[0].key).toBe('catalog.product');
  });

  it('gom họ quyền phụ về cùng màn hình của nó', () => {
    // Brand và Category giờ là hai màn riêng; mỗi họ quyền tự khớp mục menu của nó.
    const tree = buildPermissionTree([
      permission('catalog.brand.view', 'view'),
      permission('catalog.category.manage', 'manage'),
    ]);

    const catalog = tree.find((group) => group.key === 'catalog');
    expect(catalog?.screens.map((screen) => screen.key)).toEqual(
      expect.arrayContaining(['catalog.brand', 'catalog.category']),
    );
  });

  it('không giấu quyền chưa gắn màn hình nào', () => {
    const tree = buildPermissionTree([permission('return.decide', 'decide', true)]);

    const unmapped = tree.find((group) => group.key === UNMAPPED_GROUP_KEY);
    expect(unmapped?.screens[0]).toMatchObject({ key: 'return', label: 'Đổi trả' });
    expect(unmapped?.screens[0].permissions[0].sensitive).toBe(true);
  });

  it('đẩy nhóm chưa có màn hình xuống cuối', () => {
    const tree = buildPermissionTree([
      permission('return.view', 'view'),
      permission('order.view', 'view'),
    ]);

    expect(tree[tree.length - 1].key).toBe(UNMAPPED_GROUP_KEY);
  });

  it('không để lọt mã quyền nào ra ngoài cây', () => {
    const codes = [
      'order.view',
      'return.decide',
      'media.asset.upload',
      'catalog.price.manage',
      'iam.assignment.manage',
    ];
    const tree = buildPermissionTree(codes.map((code) => permission(code, 'x')));

    const flattened = tree.flatMap((group) =>
      group.screens.flatMap((screen) => screen.permissions.map((item) => item.code)),
    );
    expect(flattened.sort()).toEqual([...codes].sort());
  });
});
