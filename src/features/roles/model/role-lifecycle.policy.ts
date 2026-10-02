import type { DeleteRoleResultDto, RoleDto } from '@/generated/api/iam/iam.schemas';
import { getApiErrorPayload } from '@/lib/api/error';
import { ROLE_DELETE_ERROR_CODE, ROLE_DELETE_ERROR_MESSAGES, ROOT_ROLE_CODE } from '../constants/role.constants';

export interface RoleDeleteState {
  allowed: boolean;
  /** Tooltip / aria-label của nút Xoá. */
  label: string;
}

/**
 * Nút Xoá chỉ bật theo `canDelete` do server tính (D98): vai trò hệ thống và vai trò mang quyền
 * quản trị không bao giờ xoá được. UI không tự suy luật bảo vệ — API vẫn là nơi quyết định.
 */
export function getRoleDeleteState(
  role: Pick<RoleDto, 'name' | 'status' | 'system' | 'canDelete'>,
): RoleDeleteState {
  if (role.canDelete) return { allowed: true, label: `Xoá vai trò ${role.name}` };
  if (role.system) {
    return { allowed: false, label: 'Vai trò hệ thống không được xoá; dùng Sửa để ngừng hoạt động' };
  }
  if (role.status === 'INACTIVE') {
    return { allowed: false, label: 'Vai trò đã ngừng và không còn ai được gán' };
  }
  return { allowed: false, label: 'Vai trò mang quyền quản trị không được xoá' };
}

/** Câu cảnh báo trong hộp xác nhận: nói rõ bao nhiêu phân quyền sẽ bị chuyển về Nhân viên. */
export function describeRoleDeleteImpact(role: Pick<RoleDto, 'activeAssignmentCount'>): string {
  if (role.activeAssignmentCount === 0) {
    return 'Vai trò chưa được gán cho ai đang hoạt động. Thao tác không hoàn tác được.';
  }
  return `${role.activeAssignmentCount} phân quyền đang hoạt động sẽ được chuyển về vai trò Nhân viên `
    + '(giữ nguyên chi nhánh/phạm vi). Nhân viên bị ảnh hưởng phải đăng nhập lại để nhận quyền mới. '
    + 'Thao tác không hoàn tác được.';
}

/** Thông báo thành công; đếm theo số nhân viên vì một người có thể giữ vai trò ở nhiều chi nhánh. */
export function describeRoleDeleteResult(result: Pick<DeleteRoleResultDto, 'affectedUsers'>): string {
  return result.affectedUsers > 0
    ? `Đã chuyển ${result.affectedUsers} nhân viên về vai trò Nhân viên`
    : 'Đã xoá vai trò';
}

/** Lỗi xoá vai trò theo mã ổn định; mã khác dùng thông báo server. */
export function roleDeleteErrorMessage(error: unknown, fallback: string): string {
  const code = getApiErrorPayload(error)?.code;
  if (code && code in ROLE_DELETE_ERROR_MESSAGES) {
    return ROLE_DELETE_ERROR_MESSAGES[code as keyof typeof ROLE_DELETE_ERROR_MESSAGES];
  }
  return fallback;
}

/** Lỗi do danh sách đang cũ (role vừa đổi, vừa bị xoá, vừa thành vai trò quản trị) — cần tải lại. */
export function shouldReloadAfterRoleDeleteError(error: unknown): boolean {
  const payload = getApiErrorPayload(error);
  if (!payload) return false;
  return payload.statusCode === 404
    || payload.code === ROLE_DELETE_ERROR_CODE.VERSION_CONFLICT
    || payload.code === ROLE_DELETE_ERROR_CODE.PROTECTED;
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
