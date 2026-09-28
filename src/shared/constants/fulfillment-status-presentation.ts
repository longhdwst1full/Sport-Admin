import type { FulfillmentStatus } from '@/generated/api/fulfillments/fulfillments.schemas';

/**
 * Nhãn trạng thái vận đơn dùng chung giữa `orders` và `fulfillments`.
 *
 * Sống ở `shared` thay vì trong feature `fulfillments` vì `orders/order-detail-drawer`
 * hiển thị trạng thái vận đơn của chính đơn hàng (`OrderShipmentDto.status`). Nếu giá trị này
 * ở trong `features/fulfillments`, import nó từ `orders` sẽ tải luôn barrel `fulfillments`
 * (kéo theo `fulfillments-page`, nơi import `OrderDetailDrawer` từ `orders`) và tạo vòng
 * phụ thuộc giữa hai feature ở cấp module.
 */
export const fulfillmentStatusPresentation: Record<FulfillmentStatus, { label: string; color: string }> = {
  PENDING: { label: 'Chờ xử lý', color: 'default' },
  PICKING: { label: 'Đang lấy hàng', color: 'processing' },
  PACKED: { label: 'Đã đóng gói', color: 'cyan' },
  SHIPPED: { label: 'Đã bàn giao', color: 'blue' },
  DELIVERED: { label: 'Đã giao', color: 'success' },
  DELIVERY_FAILED: { label: 'Giao thất bại', color: 'error' },
  RETURNING_TO_WAREHOUSE: { label: 'Đang hoàn về kho', color: 'warning' },
  RETURNED_TO_WAREHOUSE: { label: 'Đã nhận hoàn kho', color: 'warning' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
};
