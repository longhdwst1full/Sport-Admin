import { describe, expect, it } from 'vitest';
import type { PermissionDto } from '@/generated/api/iam/iam.schemas';
import { UNMAPPED_GROUP_KEY } from './permission-tree';
import {
  buildRolePermissionTree,
  countGroupPermissions,
  filterPermissionTree,
  summarizePermissionCodes,
} from './role-permission-view';

const permission = (code: string, action: string, sensitive = false): PermissionDto => ({
  code,
  action,
  sensitive,
  module: code.split('.')[0],
});

const catalog = [
  permission('order.view', 'view'),
  permission('order.manage', 'manage'),
  permission('catalog.product.view', 'view'),
  permission('catalog.product.manage', 'manage'),
];

describe('tóm tắt mã quyền trong ô bảng', () => {
  it('hiện vài mã đầu theo thứ tự và đếm phần còn lại', () => {
    expect(summarizePermissionCodes(['order.view', 'a.view', 'z.view', 'b.view'], 2)).toEqual({
      visible: ['a.view', 'b.view'],
      hiddenCount: 2,
    });
  });

  it('không có phần dư khi ít mã', () => {
    expect(summarizePermissionCodes(['order.view'])).toEqual({ visible: ['order.view'], hiddenCount: 0 });
    expect(summarizePermissionCodes([])).toEqual({ visible: [], hiddenCount: 0 });
  });
});

describe('cây quyền của một vai trò', () => {
  it('chỉ gồm quyền vai trò đang có, gom theo màn hình', () => {
    const tree = buildRolePermissionTree(['order.view', 'catalog.product.manage'], catalog);
    const codes = tree.flatMap((group) => group.screens.flatMap((screen) => screen.permissions.map((p) => p.code)));
    expect(codes.sort()).toEqual(['catalog.product.manage', 'order.view']);
    expect(tree.find((group) => group.key === 'sales')?.screens[0]).toMatchObject({ key: 'order', label: 'Đơn hàng' });
  });

  it('giữ mã không còn trong danh mục ở nhóm "Quyền hệ thống khác"', () => {
    const tree = buildRolePermissionTree(['legacy.thing.do', 'order.view', 'order.view'], catalog);
    const unmapped = tree.find((group) => group.key === UNMAPPED_GROUP_KEY);
    expect(unmapped?.screens[0].permissions).toEqual([
      { code: 'legacy.thing.do', action: 'do', label: 'Quyền khác', sensitive: false },
    ]);
    expect(tree.reduce((total, group) => total + countGroupPermissions(group), 0)).toBe(2);
  });
});

describe('lọc cây quyền', () => {
  const tree = buildRolePermissionTree(catalog.map(({ code }) => code), catalog);

  it('khớp theo mã quyền hoặc nhãn quyền', () => {
    const byCode = filterPermissionTree(tree, 'product.manage');
    expect(byCode.flatMap((g) => g.screens.flatMap((s) => s.permissions.map((p) => p.code)))).toEqual([
      'catalog.product.manage',
    ]);
    const byLabel = filterPermissionTree(tree, 'quản lý');
    expect(byLabel.flatMap((g) => g.screens.flatMap((s) => s.permissions.map((p) => p.code))).sort()).toEqual([
      'catalog.product.manage',
      'order.manage',
    ]);
  });

  it('khớp nhãn màn hình thì giữ cả màn hình', () => {
    const result = filterPermissionTree(tree, 'đơn hàng');
    expect(result.flatMap((g) => g.screens.map((s) => s.key))).toEqual(['order']);
    expect(countGroupPermissions(result[0])).toBe(2);
  });

  it('từ khoá rỗng trả nguyên cây, không khớp trả rỗng', () => {
    expect(filterPermissionTree(tree, '  ')).toEqual(tree);
    expect(filterPermissionTree(tree, 'khong-ton-tai')).toEqual([]);
  });
});

describe('quyền trước đây rơi vào "Chưa có màn hình"', () => {
  const codes = [
    permission('assistant.use', 'use'),
    permission('assistant.tool.execute', 'execute', true),
    permission('iam.user.mfa.manage', 'mfa_manage', true),
    permission('social.post.manage', 'manage', true),
    permission('social.post.publish', 'publish', true),
  ];
  const tree = buildRolePermissionTree(codes.map(({ code }) => code), codes);
  const leaf = (code: string) =>
    tree.flatMap((g) => g.screens.flatMap((s) => s.permissions.map((p) => ({ group: g.key, screen: s.label, ...p })))).find((p) => p.code === code);

  it('gắn vào màn hình thật, không còn nhóm khác', () => {
    expect(tree.find((group) => group.key === UNMAPPED_GROUP_KEY)).toBeUndefined();
    expect(leaf('assistant.use')).toMatchObject({ group: 'experience', screen: 'Trợ lý AI' });
    expect(leaf('assistant.tool.execute')).toMatchObject({ group: 'experience', screen: 'Trợ lý AI' });
    expect(leaf('iam.user.mfa.manage')).toMatchObject({ group: 'system', screen: 'Nhân sự' });
    expect(leaf('social.post.publish')).toMatchObject({ group: 'experience', screen: 'Bài đăng mạng xã hội' });
  });

  it('mỗi lá có nhãn tiếng Việt, không phải mảnh mã', () => {
    expect(leaf('assistant.use')?.label).toBe('Dùng trợ lý AI');
    expect(leaf('assistant.tool.execute')?.label).toBe('Cho trợ lý thực thi thao tác');
    expect(leaf('iam.user.mfa.manage')?.label).toBe('Quản lý MFA người dùng');
    expect(leaf('social.post.manage')?.label).toBe('Quản lý bài đăng mạng xã hội');
    expect(leaf('social.post.publish')?.label).toBe('Đăng bài mạng xã hội');
  });
});
