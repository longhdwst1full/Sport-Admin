import { AssignableStaffRoleCode } from '@/generated/api/iam/iam.schemas';

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
    color: 'emerald',
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
