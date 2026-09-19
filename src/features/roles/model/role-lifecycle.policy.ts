import type { RoleDto } from '@/generated/api/iam/models';
import { ROOT_ROLE_CODE } from '../constants/role.constants';

export type RoleRemovalMode = 'BLOCKED' | 'DEACTIVATE' | 'DELETE';

/**
 * Phân biệt xóa vật lý role tự tạo với ngừng lifecycle role hệ thống.
 * OWNER luôn bị chặn để UI không đưa ra thao tác có thể khóa toàn bộ quản trị.
 */
export function getRoleRemovalMode(
  role: Pick<RoleDto, 'code' | 'status' | 'system'>,
): RoleRemovalMode {
  if (role.code === ROOT_ROLE_CODE) return 'BLOCKED';
  if (!role.system) return 'DELETE';
  return role.status === 'ACTIVE' ? 'DEACTIVATE' : 'BLOCKED';
}
