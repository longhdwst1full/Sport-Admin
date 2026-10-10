import type { StatusPresentation } from '@/foundation/management/status-tag';
import { RoleStatus } from '@/generated/api/iam/iam.schemas';
import { toOptions } from '@/shared/utils/options';

/** OWNER là tài khoản gốc duy nhất và không được ngừng hoạt động qua UI/API. */
export const ROOT_ROLE_CODE = 'OWNER';

export const ROLE_STATUS_PRESENTATION: Record<RoleStatus, StatusPresentation> = {
  [RoleStatus.ACTIVE]: { label: 'Đang dùng', color: 'success' },
  [RoleStatus.INACTIVE]: { label: 'Ngừng dùng', color: 'neutral' },
};

export const ROLE_STATUS_OPTIONS = toOptions(ROLE_STATUS_PRESENTATION);

/** Số ký tự tối thiểu của lý do xoá vai trò (khớp validate của API). */
export const ROLE_DELETE_REASON_MIN_LENGTH = 3;

/** Mã lỗi ổn định của `deleteAdminRole` (API D98). */
export const ROLE_DELETE_ERROR_CODE = {
  PROTECTED: 'IAM_ROLE_PROTECTED',
  VERSION_CONFLICT: 'IAM_ROLE_VERSION_CONFLICT',
  FALLBACK_UNAVAILABLE: 'IAM_ROLE_FALLBACK_UNAVAILABLE',
} as const;

export const ROLE_DELETE_ERROR_MESSAGES: Record<
  (typeof ROLE_DELETE_ERROR_CODE)[keyof typeof ROLE_DELETE_ERROR_CODE],
  string
> = {
  [ROLE_DELETE_ERROR_CODE.PROTECTED]: 'Vai trò quản trị hoặc vai trò hệ thống không được xoá.',
  [ROLE_DELETE_ERROR_CODE.VERSION_CONFLICT]: 'Vai trò vừa thay đổi, đã tải lại danh sách. Hãy thử lại.',
  [ROLE_DELETE_ERROR_CODE.FALLBACK_UNAVAILABLE]:
    'Vai trò Nhân viên đang ngừng hoạt động nên không thể chuyển nhân viên về. Hãy kích hoạt lại trước khi xoá.',
};

/** Nhãn tiếng Việt cho hành động của quyền. Mã quyền do API quyết định, nhãn chỉ để hiển thị. */
export const permissionActionLabels: Record<string, string> = {
  view: 'Xem',
  manage: 'Quản lý',
  create: 'Tạo',
  publish: 'Xuất bản',
  adjust: 'Điều chỉnh',
  ship: 'Xuất kho',
  receive: 'Nhận',
  pick: 'Lấy hàng',
  pack: 'Đóng gói',
  delivery_update: 'Cập nhật giao hàng',
  confirm: 'Xác nhận',
  decide: 'Duyệt',
  moderate: 'Kiểm duyệt',
  upload: 'Tải lên',
};
