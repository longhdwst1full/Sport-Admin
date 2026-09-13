export const FULFILLMENT_PAGE_SIZE = 20;

/**
 * Nhãn tiếng Việt map tách khỏi mã trạng thái (`08-enums-constants.md`):
 * đổi chữ hiển thị không được làm đổi phép so sánh nghiệp vụ.
 */
export const fulfillmentStatusPresentation: Record<string, { label: string; color: string }> = {
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
