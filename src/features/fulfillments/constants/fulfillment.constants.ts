import type {
  CarrierShipmentStatus,
  FulfillmentStatus,
} from '@/generated/api/fulfillments/fulfillments.schemas';

export const FULFILLMENT_PAGE_SIZE = 20;

/**
 * Nhãn tiếng Việt map tách khỏi mã trạng thái (`08-enums-constants.md`):
 * đổi chữ hiển thị không được làm đổi phép so sánh nghiệp vụ.
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
