import type { PermissionDto } from '@/generated/api/iam/iam.schemas';
import { buildPermissionTree, type PermissionTreeGroup } from './permission-tree';

/** Số mã quyền hiện thẳng trong ô bảng trước khi gom vào "+N". */
export const PERMISSION_CODE_PREVIEW_LIMIT = 3;

export interface PermissionCodeSummary {
  visible: string[];
  hiddenCount: number;
}

/** Ô "Mã quyền" chỉ hiện vài mã đầu (theo thứ tự chữ cái), phần còn lại gom thành "+N". */
export function summarizePermissionCodes(
  codes: readonly string[],
  limit = PERMISSION_CODE_PREVIEW_LIMIT,
): PermissionCodeSummary {
  const sorted = [...codes].sort((left, right) => left.localeCompare(right));
  return { visible: sorted.slice(0, limit), hiddenCount: Math.max(sorted.length - limit, 0) };
}

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
