import type { ColumnItem } from '@/foundation/table';
import type { OrderStatus, OrderStatusGroup } from '@/generated/api/orders/orders.schemas';

export const ORDER_PAGE_SIZE = 20;

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

export const orderStatusPresentation: Record<OrderStatus, { label: string; color: string }> = {
  PENDING_CONFIRMATION: { label: 'Chờ xác nhận', color: 'gold' },
  CONFIRMED: { label: 'Đã xác nhận', color: 'blue' },
  PICKING: { label: 'Đang lấy hàng', color: 'cyan' },
  PACKED: { label: 'Đã đóng gói', color: 'geekblue' },
  SHIPPED: { label: 'Đang vận chuyển', color: 'purple' },
  DELIVERED: { label: 'Đã giao', color: 'green' },
  COMPLETED: { label: 'Hoàn thành', color: 'success' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
};

// paymentStatusPresentation là single source ở feature payments (rule 08); import qua barrel `@/features/payments`.
export { paymentStatusPresentation } from '@/features/payments';

