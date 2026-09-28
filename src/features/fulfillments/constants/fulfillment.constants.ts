import type { CarrierShipmentStatus } from '@/generated/api/fulfillments/fulfillments.schemas';
// Nhãn trạng thái vận đơn sống ở shared vì `orders` cũng cần nó (xem comment tại nguồn).
export { fulfillmentStatusPresentation } from '@/shared/constants/fulfillment-status-presentation';

export const FULFILLMENT_PAGE_SIZE = 20;

/** Nhóm trạng thái mà nhân viên kho cần hành động ngay. */
export const ACTIONABLE_FULFILLMENT_STATUSES = ['PENDING', 'PICKING', 'PACKED'] as const;

/**
 * Trạng thái vận đơn GHN tự tạo (D14) sau khi đơn trả trước đã thanh toán hoặc COD được xác nhận.
 * `null` nghĩa là đơn không đi luồng tự tạo — vận đơn nhập tay lúc bàn giao như trước.
 */
export const carrierShipmentStatusPresentation: Record<CarrierShipmentStatus, { label: string; color: string }> = {
  PENDING: { label: 'Chờ tạo vận đơn', color: 'default' },
  CREATING: { label: 'Đang tạo vận đơn', color: 'processing' },
  CREATED: { label: 'Đã tạo vận đơn', color: 'success' },
  CREATE_FAILED: { label: 'Tạo vận đơn lỗi', color: 'error' },
};
