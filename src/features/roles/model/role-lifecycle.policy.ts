import type { RoleDto } from '@/generated/api/iam/iam.schemas';
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

/**
 * Tập quyền của OWNER có được phép sửa trên giao diện hay không.
 *
 * Backend từ chối mọi thay đổi tập quyền của OWNER: đây là tài khoản break-glass duy nhất, thu hẹp
 * quyền của nó là tự khoá mình ra khỏi hệ thống. Form phải khoá sẵn thay vì để người dùng bỏ tick
 * rồi mới nhận 403 — thao tác hỏng cần được biết trước khi bấm Lưu, không phải sau.
 */
export function canEditRolePermissions(role: Pick<RoleDto, 'code'> | undefined): boolean {
  return role?.code !== ROOT_ROLE_CODE;
}
