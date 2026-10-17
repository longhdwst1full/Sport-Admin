import type { StatusPresentation } from '@/foundation/management/status-tag';
import { RoleDeleteBlockReason, RoleDeleteOrphanAction, RoleStatus } from '@/generated/api/iam/iam.schemas';
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
  HELD_BY_ACTOR: 'IAM_ROLE_HELD_BY_ACTOR',
  LAST_MANAGER: 'IAM_ROLE_LAST_MANAGER',
  FALLBACK_INVALID: 'IAM_ROLE_FALLBACK_INVALID',
  ORPHAN_ACTION_REQUIRED: 'IAM_ROLE_ORPHAN_ACTION_REQUIRED',
} as const;

export const ROLE_DELETE_ERROR_MESSAGES: Record<
  (typeof ROLE_DELETE_ERROR_CODE)[keyof typeof ROLE_DELETE_ERROR_CODE],
  string
> = {
  [ROLE_DELETE_ERROR_CODE.PROTECTED]: 'Vai trò hệ thống không được xoá; các vai trò khác chỉ Chủ hệ thống được xoá.',
  [ROLE_DELETE_ERROR_CODE.VERSION_CONFLICT]: 'Vai trò vừa thay đổi, đã tải lại danh sách. Hãy thử lại.',
  [ROLE_DELETE_ERROR_CODE.FALLBACK_UNAVAILABLE]:
    'Vai trò được chọn để chuyển sang không còn hoặc đang ngừng hoạt động. Hãy chọn vai trò khác.',
  [ROLE_DELETE_ERROR_CODE.FALLBACK_INVALID]: 'Vai trò chuyển sang phải khác vai trò đang xoá.',
  [ROLE_DELETE_ERROR_CODE.ORPHAN_ACTION_REQUIRED]:
    'Có tài khoản sẽ không còn vai trò nào. Hãy chọn Ngừng hoạt động hoặc Xoá tài khoản rồi thử lại.',
  [ROLE_DELETE_ERROR_CODE.HELD_BY_ACTOR]:
    'Bạn đang giữ vai trò này nên không thể tự xoá. Hãy gỡ vai trò khỏi tài khoản của mình hoặc nhờ quản trị viên khác.',
  [ROLE_DELETE_ERROR_CODE.LAST_MANAGER]:
    'Xoá vai trò này sẽ không còn ai quản lý được vai trò. Hãy gán quyền quản lý vai trò cho người khác trước.',
};

/** Xử lý tài khoản không còn vai trò nào khác khi xoá vai trò mà không chuyển sang vai trò khác. */
export const DEFAULT_ROLE_DELETE_ORPHAN_ACTION: RoleDeleteOrphanAction = RoleDeleteOrphanAction.DEACTIVATE;

export const ROLE_DELETE_ORPHAN_ACTION_LABELS: Record<RoleDeleteOrphanAction, string> = {
  [RoleDeleteOrphanAction.DEACTIVATE]: 'Ngừng hoạt động tài khoản',
  [RoleDeleteOrphanAction.DELETE_ACCOUNT]: 'Xoá tài khoản',
};

/** Gợi ý (tooltip) khi nút Xoá bị khoá, theo `deleteBlockedReason` server tính cho người đang xem. */
export const ROLE_DELETE_BLOCK_LABELS: Record<RoleDeleteBlockReason, string> = {
  [RoleDeleteBlockReason.SYSTEM_ROLE]: 'Vai trò hệ thống không được xoá; dùng Sửa để ngừng hoạt động',
  [RoleDeleteBlockReason.OWNER_ONLY]: 'Chỉ Chủ hệ thống được xoá vai trò',
  [RoleDeleteBlockReason.HELD_BY_ACTOR]: 'Bạn đang giữ vai trò này nên không thể tự xoá',
  [RoleDeleteBlockReason.ALREADY_DELETED]: 'Vai trò đã ngừng và không còn ai được gán',
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
  reply: 'Trả lời',
  use: 'Sử dụng',
  execute: 'Thực thi',
  mfa_manage: 'Quản lý MFA',
  assign: 'Phân công',
  close: 'Đóng',
  post: 'Ghi sổ',
  override: 'Cho phép ngoại lệ',
  approve: 'Duyệt',
  request: 'Yêu cầu',
};

/**
 * Nhãn tiếng Việt cho từng mã quyền. `PermissionDto` của API chỉ có `code/module/action/sensitive`
 * (không có tên/mô tả), nên nhãn hiển thị phải khai ở đây. Mã không có trong bảng rơi về nhãn hành
 * động (`permissionActionLabels`) — xem `permissionLeafLabel`.
 */
export const PERMISSION_LABELS: Record<string, string> = {
  'system.module.view': 'Truy cập trang quản trị',
  'org.branch.view': 'Xem chi nhánh',
  'org.branch.manage': 'Quản lý chi nhánh',
  'org.warehouse.view': 'Xem kho',
  'org.warehouse.manage': 'Quản lý kho',
  'iam.user.view': 'Xem người dùng',
  'iam.user.manage': 'Quản lý người dùng',
  'iam.user.mfa.manage': 'Quản lý MFA người dùng',
  'iam.role.view': 'Xem vai trò',
  'iam.role.manage': 'Quản lý vai trò',
  'iam.assignment.manage': 'Phân công vai trò cho người dùng',
  'iam.audit.view': 'Xem nhật ký hệ thống',
  'customer.view': 'Xem khách hàng',
  'customer.manage': 'Quản lý khách hàng',
  'catalog.brand.view': 'Xem thương hiệu',
  'catalog.brand.manage': 'Quản lý thương hiệu',
  'catalog.category.view': 'Xem danh mục',
  'catalog.category.manage': 'Quản lý danh mục',
  'catalog.product.view': 'Xem sản phẩm',
  'catalog.product.manage': 'Quản lý sản phẩm',
  'catalog.product.publish': 'Đăng/ngừng bán sản phẩm',
  'catalog.price.view': 'Xem giá bán',
  'catalog.price.manage': 'Quản lý giá bán',
  'catalog.flash_sale.view': 'Xem Flash Sale',
  'catalog.flash_sale.manage': 'Quản lý Flash Sale',
  'catalog.review.moderate': 'Kiểm duyệt đánh giá',
  'catalog.review.reply': 'Trả lời đánh giá',
  'cms.content.view': 'Xem bài viết',
  'cms.content.manage': 'Quản lý bài viết',
  'social.post.manage': 'Quản lý bài đăng mạng xã hội',
  'social.post.publish': 'Đăng bài mạng xã hội',
  'media.asset.view': 'Xem thư viện ảnh',
  'media.asset.upload': 'Tải ảnh lên',
  'media.asset.manage': 'Quản lý thư viện ảnh',
  'assistant.use': 'Dùng trợ lý AI',
  'assistant.tool.execute': 'Cho trợ lý thực thi thao tác',
  'assistant.knowledge.manage': 'Quản lý tri thức trợ lý',
  'support.ticket.view': 'Xem yêu cầu hỗ trợ',
  'support.ticket.create': 'Tạo yêu cầu hỗ trợ',
  'support.ticket.assign': 'Phân công yêu cầu hỗ trợ',
  'support.ticket.manage': 'Xử lý yêu cầu hỗ trợ',
  'support.ticket.close': 'Đóng yêu cầu hỗ trợ',
  'system.parameter.view': 'Xem tham số hệ thống',
  'system.parameter.manage': 'Quản lý tham số hệ thống',
  'inventory.stock.view': 'Xem tồn kho',
  'inventory.stock.adjust': 'Điều chỉnh tồn kho',
  'inventory.stocktake.manage': 'Quản lý kiểm kê',
  'inventory.transfer.view': 'Xem phiếu chuyển kho',
  'inventory.transfer.create': 'Tạo phiếu chuyển kho',
  'inventory.transfer.ship': 'Xuất hàng chuyển kho',
  'inventory.transfer.receive': 'Nhận hàng chuyển kho',
  'order.view': 'Xem đơn hàng',
  'order.manage': 'Quản lý đơn hàng',
  'payment.view': 'Xem thanh toán',
  'payment.confirm': 'Xác nhận thanh toán',
  'payment.refund.request': 'Yêu cầu hoàn tiền',
  'payment.refund.approve': 'Duyệt hoàn tiền',
  'fulfillment.view': 'Xem giao vận',
  'fulfillment.pick': 'Lấy hàng',
  'fulfillment.pack': 'Đóng gói',
  'fulfillment.ship': 'Xuất kho giao hàng',
  'fulfillment.delivery_update': 'Cập nhật trạng thái giao hàng',
  'return.view': 'Xem yêu cầu đổi trả',
  'return.create': 'Tạo yêu cầu đổi trả',
  'return.decide': 'Duyệt yêu cầu đổi trả',
  'return.receive': 'Nhận hàng trả về',
  'return.window.override': 'Nhận trả quá hạn',
  'report.operation.view': 'Xem báo cáo vận hành',
  'report.revenue.view': 'Xem báo cáo doanh thu',
  'report.inventory.view': 'Xem báo cáo tồn kho',
  'purchase.order.view': 'Xem đơn nhập hàng',
  'purchase.order.create': 'Tạo đơn nhập hàng',
  'purchase.order.approve': 'Duyệt đơn nhập hàng',
  'purchase.order.approve.finance': 'Duyệt đơn nhập (tài chính)',
  'purchase.receipt.create': 'Tạo phiếu nhập kho',
  'purchase.receipt.post': 'Ghi sổ phiếu nhập kho',
  'purchase.return.manage': 'Quản lý trả hàng NCC',
  'supplier.manage': 'Quản lý nhà cung cấp',
};

export const SENSITIVE_PERMISSION_HINT =
  'Quyền nhạy cảm: thao tác tác động tới tiền, dữ liệu cá nhân, phân quyền hoặc thay đổi khó hoàn tác. Chỉ cấp khi thật cần.';

export const OTHER_SYSTEM_PERMISSIONS_HINT =
  'Quyền không gắn với một màn hình cụ thể trong menu, ví dụ quyền truy cập chung vào trang quản trị.';
