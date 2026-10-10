import type { StatusPresentation } from '@/foundation/management';
import type { OrderStatus } from '@/generated/api/orders/orders.schemas';

/** Trạng thái đơn (vòng đời `OrderStatus`), khoá theo enum sinh tự động: contract thêm trạng thái là lỗi biên dịch. */
export const orderStatusPresentation: Record<OrderStatus, StatusPresentation> = {
  PENDING_CONFIRMATION: { label: 'Chờ xác nhận', color: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', color: 'info' },
  PICKING: { label: 'Đang lấy hàng', color: 'progress' },
  PACKED: { label: 'Đã đóng gói', color: 'progress' },
  SHIPPED: { label: 'Đang vận chuyển', color: 'progress' },
  DELIVERED: { label: 'Đã giao', color: 'success' },
  COMPLETED: { label: 'Hoàn thành', color: 'success' },
  CANCELLED: { label: 'Đã huỷ', color: 'neutral' },
};
