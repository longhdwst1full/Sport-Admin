import type { StatusPresentation } from '@/foundation/management';
import type {
  ReturnFault,
  ReturnCondition,
  ReturnItemDisposition,
  RefundMethod,
  RefundStatus,
  ReturnReasonCode,
  ReturnStatus,
  ReturnIneligibleReason,
  ReturnAction,
} from '@/generated/api/returns/returns.schemas';

export const RETURN_PAGE_SIZE = 20;

/** Mã quyền dùng để ẩn/hiện thao tác. PERMISSION: API vẫn chặn lại mọi lệnh. */
export const RETURN_PERMISSION = {
  VIEW: 'return.view',
  CREATE: 'return.create',
  DECIDE: 'return.decide',
  RECEIVE: 'return.receive',
  WINDOW_OVERRIDE: 'return.window.override',
  REFUND_REQUEST: 'payment.refund.request',
  REFUND_APPROVE: 'payment.refund.approve',
} as const;

/**
 * Nhãn tách khỏi mã trạng thái (`08-enums-constants.md`): đổi chữ hiển thị không làm đổi phép so
 * sánh nghiệp vụ. Kiểu `Record<Enum, …>` bắt lỗi khi contract thêm trạng thái mà quên nhãn.
 */
export const returnStatusPresentation: Record<ReturnStatus, StatusPresentation> = {
  REQUESTED: { label: 'Chờ duyệt', color: 'gold' },
  APPROVED: { label: 'Chờ nhận hàng', color: 'blue' },
  REJECTED: { label: 'Từ chối', color: 'red' },
  RECEIVED: { label: 'Chờ hoàn tiền', color: 'purple' },
  REFUNDED: { label: 'Đã hoàn tiền', color: 'cyan' },
  CLOSED: { label: 'Đã đóng', color: 'green' },
  CANCELLED: { label: 'Đã huỷ', color: 'default' },
};

export const returnReasonLabels: Record<ReturnReasonCode, string> = {
  DEFECTIVE: 'Hàng lỗi',
  WRONG_ITEM: 'Giao sai hàng',
  NOT_AS_DESCRIBED: 'Không đúng mô tả',
  WRONG_SIZE: 'Sai size',
  CHANGED_MIND: 'Đổi ý',
  OTHER: 'Khác',
};

export const returnFaultLabels: Record<ReturnFault, string> = {
  SHOP: 'Lỗi cửa hàng (hoàn cả phí giao)',
  CUSTOMER: 'Lỗi/khách đổi ý',
};

export const inspectionConditionLabels: Record<ReturnCondition, string> = {
  SELLABLE: 'Còn bán được',
  DAMAGED: 'Hỏng',
  MISSING: 'Không nhận được',
};

/** UX: không dùng chữ "kho lỗi" — V1 chưa có tồn hàng lỗi, HOLD chỉ là ghi nhận giữ lại. */
export const inspectionDispositionLabels: Record<ReturnItemDisposition, string> = {
  RESTOCK: 'Nhập lại kho bán',
  HOLD: 'Giữ lại (không bán)',
  WRITE_OFF: 'Huỷ bỏ',
};

export const refundMethodLabels: Record<RefundMethod, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
};

export const refundStatusPresentation: Record<RefundStatus, StatusPresentation> = {
  PENDING: { label: 'Chờ xác nhận', color: 'gold' },
  SUCCEEDED: { label: 'Đã hoàn', color: 'green' },
  FAILED: { label: 'Không thực hiện được', color: 'red' },
};

export const returnActionLabels: Record<ReturnAction, string> = {
  CREATE: 'Tạo phiếu',
  APPROVE: 'Duyệt',
  REJECT: 'Từ chối',
  CANCEL: 'Huỷ',
  RECEIVE: 'Nhận & kiểm hàng',
  REFUND_REQUEST: 'Tạo lượt hoàn',
  REFUND_CONFIRM: 'Xác nhận đã hoàn',
  REFUND_FAIL: 'Lượt hoàn lỗi',
  CLOSE: 'Đóng phiếu',
};

export const returnEligibilityReasonLabels: Record<NonNullable<ReturnIneligibleReason>, string> = {
  ORDER_NOT_RETURNABLE: 'Đơn chưa giao thành công nên chưa tạo được phiếu trả.',
  OPEN_RETURN_EXISTS: 'Đơn đang có phiếu trả chưa xử lý xong.',
  WINDOW_EXPIRED: 'Đơn đã quá hạn đổi trả.',
  NOTHING_RETURNABLE: 'Không còn sản phẩm nào có thể trả.',
};

/** Mã lỗi phải tải lại dữ liệu: người khác vừa thao tác trên cùng phiếu. */
export const RETURN_VERSION_CONFLICT = 'RETURN_VERSION_CONFLICT';
