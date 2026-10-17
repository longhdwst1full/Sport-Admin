import type { ColumnItem } from '@/foundation/table';
import type { OrderStatusGroup } from '@/generated/api/orders/orders.schemas';
import type { OrderAction } from '../model/order-actions.policy';

/** Cột tuỳ chỉnh được của bảng đơn; `id` trùng `key` cột trong `OrderTable`. */
export const ORDER_COLUMN_ITEMS: ColumnItem[] = [
  { id: 'order', label: 'Mã đơn hàng', fixed: true },
  { id: 'recipient', label: 'Người nhận hàng' },
  { id: 'branch', label: 'Chi nhánh xuất' },
  { id: 'itemCount', label: 'Số lượng SP' },
  { id: 'grandTotal', label: 'Tổng tiền' },
  { id: 'payment', label: 'Thanh toán' },
  { id: 'status', label: 'Trạng thái đơn' },
  { id: 'actions', label: 'Thao tác', fixed: true },
];

export const orderTabs: Array<{
  key: 'ALL' | OrderStatusGroup;
  label: string;
}> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING_CONFIRMATION', label: 'Chờ xác nhận' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'IN_TRANSIT', label: 'Vận chuyển' },
  { key: 'DELIVERED', label: 'Đã giao' },
];

/**
 * Nhóm chỉ dùng làm bộ lọc qua link (KPI "Đơn đang chờ giao" ở tổng quan), chồng lên tab
 * `Đã xác nhận`/`Vận chuyển` nên không hiện thường trực; chỉ thêm tab khi URL đang lọc theo nó.
 */
export const orderFilterOnlyTabs: Partial<Record<OrderStatusGroup, string>> = {
  AWAITING_SHIPMENT: 'Chờ giao (đã xác nhận, chưa xuất kho)',
};

// Nhãn/tone trạng thái đơn nằm ở `order-status` để payments dùng chung mà không tạo vòng orders ⇄ payments.
export { orderStatusPresentation } from '@/features/order-status';

/**
 * CONTRACT: `OrderStatusHistoryDto.actorType` là string thô; giá trị backend đang ghi là
 * USER/CUSTOMER/GUEST/SYSTEM. Giá trị lạ hiện `Không xác định` thay vì mã tiếng Anh.
 */
export const orderActorTypeLabels: Record<string, string> = {
  USER: 'Nhân viên',
  CUSTOMER: 'Khách hàng',
  GUEST: 'Khách vãng lai',
  SYSTEM: 'Hệ thống',
};

// paymentStatusPresentation là single source ở feature payments (rule 08); import qua barrel `@/features/payments`.
export { paymentStatusPresentation } from '@/features/payments';

/** CONTRACT: `paymentMethod` là string thô (CASH/BANK_TRANSFER/COD/VNPAY); mã lạ hiện nguyên văn. */
export const orderPaymentMethodLabels: Record<string, string> = {
  CASH: 'Tiền mặt tại quầy',
  BANK_TRANSFER: 'Chuyển khoản',
  COD: 'Tiền mặt khi nhận (COD)',
  VNPAY: 'VNPay',
};

/** Nhãn các bước tiến trình ở banner chi tiết; vị trí bước tính ở `getOrderProgress`. */
export const ORDER_PROGRESS_STEP_LABELS = [
  'Đặt hàng',
  'Xác nhận',
  'Xử lý & Đóng gói',
  'Đang vận chuyển',
  'Hoàn thành',
] as const;

interface OrderActionCopy {
  title: string;
  okText: string;
  description: string;
  successMessage: string;
  /**
   * Khớp `MinLength` của command DTO phía API (cancel 3, complete 5). `0` = ô không bắt buộc: confirm chỉ
   * có `note` tuỳ chọn (`ConfirmOrderCommandDto`: `@IsOptional`, `@MaxLength(500)`).
   */
  minReasonLength: number;
}

export const orderActionCopy: Record<OrderAction, OrderActionCopy> = {
  cancel: {
    title: 'Xác nhận huỷ đơn hàng',
    okText: 'Huỷ đơn',
    description:
      'Hệ thống sẽ giải phóng toàn bộ số lượng đang giữ trong kho. Thao tác không áp dụng khi đơn đã thanh toán hoặc bắt đầu xử lý.',
    successMessage: 'Đã huỷ đơn hàng',
    minReasonLength: 3,
  },
  confirm: {
    title: 'Xác nhận tiếp nhận đơn hàng',
    okText: 'Xác nhận đơn',
    description:
      'Xác nhận đơn đã đủ điều kiện xử lý: chuyển khoản đã thành công hoặc đơn COD đã được tiếp nhận.',
    successMessage: 'Đã xác nhận đơn hàng thành công',
    minReasonLength: 0,
  },
  complete: {
    title: 'Xác nhận hoàn tất đơn',
    okText: 'Hoàn tất',
    description:
      'Chỉ dùng khi đã chắc chắn khách nhận đủ hàng và đã thu đủ tiền, kể cả đơn giao ngay trong ngày.',
    successMessage: 'Đã hoàn tất đơn hàng thành công',
    minReasonLength: 5,
  },
  // Dùng `OrderCancelCommandDto` như huỷ thường nên lý do tối thiểu 3 ký tự.
  cancelAfterFailedDelivery: {
    title: 'Huỷ đơn sau giao thất bại',
    okText: 'Huỷ đơn',
    description:
      'Đơn và phiếu giao chuyển sang Đã huỷ, suất flash sale đã chốt được trả lại. Tồn kho không đổi vì hàng hoàn đã nhập lại khi nhận về kho. Thao tác không hoàn tác được.',
    successMessage: 'Đã huỷ đơn sau giao thất bại',
    minReasonLength: 3,
  },
};

/** Đơn trả trước đã thu tiền bị huỷ sau giao thất bại: API chỉ gắn cờ, kế toán hoàn ngoài hệ thống. */
export const MANUAL_REFUND_SUCCESS_MESSAGE =
  'Đã huỷ đơn. Khoản đã thu cần hoàn thủ công cho khách; ghi nhận tại màn Thanh toán sau khi chuyển trả.';
