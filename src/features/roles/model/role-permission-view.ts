import type { PermissionDto } from '@/generated/api/iam/iam.schemas';
import { buildPermissionTree, type PermissionTreeGroup } from './permission-tree';

/**
 * Cây quyền (nhóm menu → màn hình → hành động) của MỘT vai trò, dùng chung `buildPermissionTree`
 * với ô chọn quyền nên không có cách gom thứ hai.
 *
 * Mã vai trò đang giữ nhưng không còn trong danh mục quyền vẫn được đưa vào cây (rơi vào nhóm
 * "Quyền hệ thống khác") — giấu đi thì người xem tưởng vai trò không có quyền đó.
 */
export function buildRolePermissionTree(
  codes: readonly string[],
  catalog: readonly PermissionDto[],
): PermissionTreeGroup[] {
  const byCode = new Map(catalog.map((permission) => [permission.code, permission]));
  const granted = [...new Set(codes)].map(
    (code): PermissionDto =>
      byCode.get(code) ?? { code, module: '', action: code.split('.').at(-1) ?? code, sensitive: false },
  );
  return buildPermissionTree(granted);
}

/**
 * Lọc cây theo từ khoá trên mã quyền, nhãn quyền, nhãn màn hình hoặc nhãn nhóm.
 * Khớp nhóm/màn hình thì giữ toàn bộ quyền bên dưới.
 */
export function filterPermissionTree(
  groups: readonly PermissionTreeGroup[],
  keyword: string,
): PermissionTreeGroup[] {
  const needle = keyword.trim().toLocaleLowerCase('vi');
  if (!needle) return [...groups];
  const matches = (text: string) => text.toLocaleLowerCase('vi').includes(needle);
  return groups
    .map((group) => ({
      ...group,
      screens: group.screens
        .map((screen) => ({
          ...screen,
          permissions:
            matches(group.label) || matches(screen.label)
              ? screen.permissions
              : screen.permissions.filter(
                  (item) => matches(item.code) || matches(item.label),
                ),
        }))
        .filter((screen) => screen.permissions.length > 0),
    }))
    .filter((group) => group.screens.length > 0);
}

export function countGroupPermissions(group: PermissionTreeGroup): number {
  return group.screens.reduce((total, screen) => total + screen.permissions.length, 0);
}
