import { RoleDeleteOrphanAction, RoleStatus } from '@/generated/api/iam/iam.schemas';
import type { DeleteRoleDto, DeleteRoleResultDto, RoleDto } from '@/generated/api/iam/iam.schemas';
import type { SelectOption } from '@/shared/utils/options';
import { getApiErrorPayload } from '@/lib/api/error';
import {
  ROLE_DELETE_BLOCK_LABELS,
  ROLE_DELETE_ERROR_CODE,
  ROLE_DELETE_ERROR_MESSAGES,
  ROOT_ROLE_CODE,
} from '../constants/role.constants';

export interface RoleDeleteState {
  allowed: boolean;
  /** Tooltip / aria-label của nút Xoá. */
  label: string;
}

/**
 * Nút Xoá chỉ bật theo `canDelete` do server tính cho người đang xem (D98): vai trò hệ thống không bao giờ
 * xoá được; chỉ Chủ hệ thống xoá được vai trò; không tự xoá vai trò mình đang giữ. Tooltip lấy theo
 * `deleteBlockedReason`; UI không tự suy luật bảo vệ — API vẫn là nơi quyết định.
 */
export function getRoleDeleteState(
  role: Pick<RoleDto, 'name' | 'status' | 'system' | 'canDelete' | 'deleteBlockedReason'>,
): RoleDeleteState {
  if (role.canDelete) return { allowed: true, label: `Xoá vai trò ${role.name}` };
  if (role.deleteBlockedReason) return { allowed: false, label: ROLE_DELETE_BLOCK_LABELS[role.deleteBlockedReason] };
  // Server cũ chưa trả lý do: suy gần đúng từ dữ liệu có sẵn.
  if (role.system) return { allowed: false, label: ROLE_DELETE_BLOCK_LABELS.SYSTEM_ROLE };
  if (role.status === RoleStatus.INACTIVE) return { allowed: false, label: ROLE_DELETE_BLOCK_LABELS.ALREADY_DELETED };
  return { allowed: false, label: ROLE_DELETE_BLOCK_LABELS.OWNER_ONLY };
}

/** Giá trị form của hộp xoá vai trò (`RoleDeleteModal`). */
export interface RoleDeleteFormValues {
  /** `null` = không chuyển sang vai trò nào. */
  fallbackRoleId: string | null;
  orphanAction: RoleDeleteOrphanAction;
  reason: string;
}

/** Lựa chọn hiện tại để mô tả hệ quả: chuyển sang một vai trò, hoặc xử lý tài khoản mồ côi. */
export type RoleDeleteChoice =
  | { kind: 'move'; roleLabel: string }
  | { kind: 'orphan'; orphanAction: RoleDeleteOrphanAction };

/** Vai trò có thể nhận người đang giữ: đang hoạt động và khác vai trò đang xoá. Nhãn "Tên (MÃ)". */
export function toRoleFallbackOptions(
  roles: readonly Pick<RoleDto, 'id' | 'name' | 'code' | 'status'>[],
  deletingRoleId: string,
): SelectOption[] {
  return roles
    .filter((role) => role.status === RoleStatus.ACTIVE && role.id !== deletingRoleId)
    .map((role) => ({ value: role.id, label: `${role.name} (${role.code})` }));
}

/**
 * CONTRACT: form -> body `deleteAdminRole` (trừ `expectedVersion`, do hook gắn). Có vai trò chuyển sang thì
 * chỉ gửi `fallbackRoleId`; không có thì gửi `orphanAction` khi vai trò còn người giữ. Vai trò chưa ai giữ
 * không gửi gì thêm: nếu vừa có người được gán song song, API trả 400 `IAM_ROLE_ORPHAN_ACTION_REQUIRED`
 * thay vì âm thầm ngừng/xoá tài khoản.
 */
export function toDeleteRolePayload(
  role: Pick<RoleDto, 'activeAssignmentCount'>,
  values: RoleDeleteFormValues,
): Omit<DeleteRoleDto, 'expectedVersion'> {
  const reason = values.reason.trim();
  if (values.fallbackRoleId) return { reason, fallbackRoleId: values.fallbackRoleId };
  if (role.activeAssignmentCount === 0) return { reason };
  return { reason, orphanAction: values.orphanAction };
}

/** Câu cảnh báo trong hộp xác nhận theo lựa chọn. Vai trò luôn bị xoá ở mọi lựa chọn. */
export function describeRoleDeleteImpact(
  role: Pick<RoleDto, 'activeAssignmentCount'>,
  choice: RoleDeleteChoice,
): string {
  if (role.activeAssignmentCount === 0) {
    return 'Vai trò chưa được gán cho ai đang hoạt động. Thao tác không hoàn tác được.';
  }
  const count = role.activeAssignmentCount;
  const consequence = choice.kind === 'move'
    ? `Vai trò sẽ bị xoá. ${count} phân quyền đang hoạt động sẽ được chuyển sang vai trò ${choice.roleLabel} `
      + '(giữ nguyên chi nhánh/phạm vi). '
    : `Vai trò sẽ bị xoá và ${count} phân quyền đang hoạt động bị thu hồi. Tài khoản còn vai trò khác chỉ bị gỡ `
      + 'vai trò này. Tài khoản không còn vai trò nào khác sẽ '
      + (choice.orphanAction === RoleDeleteOrphanAction.DELETE_ACCOUNT
        ? 'bị XOÁ (khoá vĩnh viễn, thu hồi mọi phiên đăng nhập). '
        : 'chuyển sang Ngừng hoạt động và mất quyền truy cập. ');
  return `${consequence}Nhân viên bị ảnh hưởng phải đăng nhập lại để nhận quyền mới. Thao tác không hoàn tác được.`;
}

/**
 * Thông báo thành công; đếm theo số tài khoản vì một người có thể giữ vai trò ở nhiều chi nhánh.
 * `fallbackRoleLabel`: tên vai trò đã nhận người giữ (trang tự tra từ danh sách).
 */
export function describeRoleDeleteResult(
  result: Pick<DeleteRoleResultDto, 'affectedUsers' | 'movedAssignments' | 'deactivatedUsers' | 'deletedUsers'>,
  fallbackRoleLabel?: string,
): string {
  if (result.affectedUsers === 0) return 'Đã xoá vai trò';
  if (result.movedAssignments > 0) {
    return `Đã xoá vai trò và chuyển ${result.affectedUsers} nhân viên sang vai trò ${fallbackRoleLabel ?? 'đã chọn'}`;
  }
  const parts = [`gỡ vai trò khỏi ${result.affectedUsers} nhân viên`];
  if (result.deactivatedUsers > 0) parts.push(`ngừng hoạt động ${result.deactivatedUsers} tài khoản`);
  if (result.deletedUsers > 0) parts.push(`xoá ${result.deletedUsers} tài khoản`);
  return `Đã xoá vai trò, ${parts.join(', ')}`;
}

/** Lỗi xoá vai trò theo mã ổn định; mã khác dùng thông báo server. */
export function roleDeleteErrorMessage(error: unknown, fallback: string): string {
  const code = getApiErrorPayload(error)?.code;
  if (code && code in ROLE_DELETE_ERROR_MESSAGES) {
    return ROLE_DELETE_ERROR_MESSAGES[code as keyof typeof ROLE_DELETE_ERROR_MESSAGES];
  }
  return fallback;
}

/** Lỗi do danh sách đang cũ (role vừa đổi, vừa bị xoá, vừa thành vai trò quản trị, vừa được gán cho chính mình) — cần tải lại. */
export function shouldReloadAfterRoleDeleteError(error: unknown): boolean {
  const payload = getApiErrorPayload(error);
  if (!payload) return false;
  return payload.statusCode === 404
    || payload.code === ROLE_DELETE_ERROR_CODE.VERSION_CONFLICT
    || payload.code === ROLE_DELETE_ERROR_CODE.PROTECTED
    || payload.code === ROLE_DELETE_ERROR_CODE.HELD_BY_ACTOR
    || payload.code === ROLE_DELETE_ERROR_CODE.FALLBACK_UNAVAILABLE;
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
