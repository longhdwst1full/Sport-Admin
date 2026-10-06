import type { CarrierShipmentStatus, ReturnCondition } from '@/generated/api/fulfillments/fulfillments.schemas';
import { fulfillmentStatusPresentation } from '@/shared/constants/fulfillment-status-presentation';
import { toOptions } from '@/shared/utils/options';
// Nhãn trạng thái vận đơn sống ở shared vì `orders` cũng cần nó (xem comment tại nguồn).
export { fulfillmentStatusPresentation };

export const fulfillmentStatusOptions = toOptions(fulfillmentStatusPresentation);

export const FULFILLMENT_PAGE_SIZE = 20;

/** Nhóm trạng thái mà nhân viên kho cần hành động ngay. */
export const ACTIONABLE_FULFILLMENT_STATUSES = ['PENDING', 'PICKING', 'PACKED'] as const;

/** Lý do giao thất bại chuẩn hoá gửi kèm lệnh `fail`. */
export const deliveryFailureReasonOptions = toOptions({
  CUSTOMER_UNAVAILABLE: 'Không liên hệ được khách',
  CUSTOMER_REJECTED: 'Khách từ chối nhận',
  ADDRESS_INVALID: 'Địa chỉ không hợp lệ',
  OTHER: 'Lý do khác',
});

/** Tình trạng hàng hoàn khi nhận lại kho; chỉ SELLABLE được hoàn tồn bán. */
export const returnConditionOptions = toOptions<ReturnCondition>({
  SELLABLE: 'Còn bán được — hoàn tồn bán',
  DAMAGED: 'Hư hỏng — không hoàn tồn bán',
  MISSING: 'Thiếu/mất — không hoàn tồn bán',
});

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
