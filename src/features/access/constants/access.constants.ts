import type { StatusPresentation } from '@/foundation/management';
import {
  AssignableStaffRoleCode,
  ScopeType,
  type UserDtoStatus,
} from '@/generated/api/iam/iam.schemas';

/**
 * Nhãn hiển thị cho vai trò cấp dưới gán được (BRANCH_MANAGER/STAFF).
 *
 * Chỉ là lớp trình bày: tên vai trò và số quyền luôn đọc từ `listAdminRoles`; mô tả ở đây chỉ dùng
 * khi vai trò trên server chưa có `description`.
 */
export const ASSIGNABLE_ROLE_PRESENTATION: Record<
  AssignableStaffRoleCode,
  { tag: string; color: string; accentClass: string; fallbackDescription: string }
> = {
  [AssignableStaffRoleCode.BRANCH_MANAGER]: {
    tag: 'Quản lý',
    color: 'green',
    accentClass: 'text-emerald-800',
    fallbackDescription:
      'Toàn quyền điều hành hàng hóa, kiểm kê tồn kho, duyệt chuyển kho và đơn hàng tại chi nhánh.',
  },
  [AssignableStaffRoleCode.STAFF]: {
    tag: 'Vận hành',
    color: 'blue',
    accentClass: 'text-blue-800',
    fallbackDescription:
      'Tra cứu danh mục sản phẩm, theo dõi tồn kho và tiếp nhận, xử lý đơn đặt hàng hàng ngày.',
  },
};

export const ASSIGNABLE_ROLE_CODES = Object.values(AssignableStaffRoleCode);

/** Mã lỗi tạo nhân viên cần thông báo riêng (API trả 409). */
export const STAFF_CREATION_ERROR_CODE = {
  EMAIL_RESERVED: 'IAM_EMAIL_RESERVED',
} as const;

export const STAFF_CREATION_ERROR_MESSAGES: Record<string, string> = {
  [STAFF_CREATION_ERROR_CODE.EMAIL_RESERVED]: 'Email này dành cho tài khoản quản trị gốc.',
};

export const USER_STATUS_PRESENTATION: Record<UserDtoStatus, StatusPresentation> = {
  ACTIVE: { color: 'success', label: 'Hoạt động' },
  LOCKED: { color: 'danger', label: 'Đã khóa' },
  INACTIVE: { color: 'neutral', label: 'Ngừng hoạt động' },
};

/** Nhãn mã vai trò khi chưa có tên vai trò từ `listAdminRoles`; mã lạ thì hiện nguyên mã. */
const ROLE_CODE_LABELS: Record<string, string> = {
  OWNER: 'Quản trị gốc',
  [AssignableStaffRoleCode.BRANCH_MANAGER]: 'Quản lý chi nhánh',
  [AssignableStaffRoleCode.STAFF]: 'Nhân viên',
};

export function roleCodeLabel(code: string): string {
  return Object.hasOwn(ROLE_CODE_LABELS, code) ? ROLE_CODE_LABELS[code] : code;
}

export const SCOPE_TYPE_LABELS: Record<ScopeType, string> = {
  [ScopeType.GLOBAL]: 'Toàn hệ thống',
  [ScopeType.BRANCH]: 'Chi nhánh',
};

/** Trạng thái đổi mật khẩu lần đầu của tài khoản (cờ `mustChangePassword`). */
export type PasswordState = 'MUST_CHANGE' | 'CHANGED';

export const PASSWORD_STATE_PRESENTATION: Record<PasswordState, StatusPresentation> = {
  MUST_CHANGE: { color: 'warning', label: 'Phải đổi mật khẩu' },
  CHANGED: { color: 'success', label: 'Mật khẩu đã đổi' },
};

/** Nhãn + biểu tượng nhóm quyền theo `PermissionDto.module`; module lạ hiện nguyên tên. */
export const PERMISSION_MODULE_PRESENTATION: Record<string, { label: string; icon: string }> = {
  Catalog: { label: 'Sản phẩm & Danh mục (Catalog)', icon: '📦' },
  Pricing: { label: 'Bảng giá & Khuyến mãi (Pricing)', icon: '🏷️' },
  Order: { label: 'Bán hàng & Đơn hàng (Order)', icon: '🛒' },
  Payment: { label: 'Thanh toán & Đối soát (Payment)', icon: '💳' },
  Fulfillment: { label: 'Xử lý đóng gói & Giao nhận (Fulfillment)', icon: '🚚' },
  Inventory: { label: 'Kho vận & Tồn kho (Inventory)', icon: '🏭' },
  Customer: { label: 'Khách hàng (Customer)', icon: '👥' },
  Review: { label: 'Đánh giá & Bình luận (Review)', icon: '⭐' },
  Organization: { label: 'Chi nhánh & Kho trực thuộc (Organization)', icon: '🏢' },
  IAM: { label: 'Phân quyền & Tài khoản (IAM)', icon: '🛡️' },
  CMS: { label: 'Nội dung & Bài viết (CMS)', icon: '📰' },
  Media: { label: 'Quản lý File & Ảnh (Media)', icon: '🖼️' },
  Reporting: { label: 'Báo cáo & Thống kê (Reporting)', icon: '📊' },
  System: { label: 'Hệ thống (System)', icon: '⚙️' },
};
