import type { ColumnItem } from '@/foundation/table';
import type { OrderStatusGroup } from '@/generated/api/orders/orders.schemas';

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

export { moneyFormatter } from '@/lib/format/money';

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

