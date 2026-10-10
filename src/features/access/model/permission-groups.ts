import type { PermissionDto } from '@/generated/api/iam/iam.schemas';
import { PERMISSION_MODULE_PRESENTATION } from '../constants/access.constants';

export interface PermissionGroup {
  module: string;
  label: string;
  icon: string;
  permissions: PermissionDto[];
}

/** Gom danh sách quyền từ API theo module, giữ thứ tự xuất hiện đầu tiên của module. */
export function groupPermissionsByModule(permissions: readonly PermissionDto[]): PermissionGroup[] {
  const map = new Map<string, PermissionDto[]>();
  for (const permission of permissions) {
    const list = map.get(permission.module) ?? [];
    list.push(permission);
    map.set(permission.module, list);
  }
  return Array.from(map.entries()).map(([module, grouped]) => {
    const presentation = Object.hasOwn(PERMISSION_MODULE_PRESENTATION, module)
      ? PERMISSION_MODULE_PRESENTATION[module]
      : undefined;
    return {
      module,
      label: presentation?.label ?? module,
      icon: presentation?.icon ?? '📁',
      permissions: grouped,
    };
  });
}
