import type { StatusPresentation } from '@/foundation/management';
import type {
  CarrierShipmentStatus,
  FulfillmentStatus,
  ReturnCondition,
} from '@/generated/api/fulfillments/fulfillments.schemas';
import { toOptions } from '@/shared/utils/options';

/**
 * Nhãn + tone trạng thái phiếu giao vận. `orders` hiển thị trạng thái vận đơn của đơn qua
 * `FulfillmentStatusTag` được inject (prop `renderShipmentStatus`), không import thẳng hằng này.
 */
export const fulfillmentStatusPresentation: Record<FulfillmentStatus, StatusPresentation> = {
  PENDING: { label: 'Chờ xử lý', color: 'warning' },
  PICKING: { label: 'Đang lấy hàng', color: 'progress' },
  PACKED: { label: 'Đã đóng gói', color: 'progress' },
  SHIPPED: { label: 'Đã bàn giao', color: 'progress' },
  DELIVERED: { label: 'Đã giao', color: 'success' },
  DELIVERY_FAILED: { label: 'Giao thất bại', color: 'danger' },
  RETURNING_TO_WAREHOUSE: { label: 'Đang hoàn về kho', color: 'progress' },
  RETURNED_TO_WAREHOUSE: { label: 'Đã nhận hoàn kho', color: 'accent' },
  CANCELLED: { label: 'Đã huỷ', color: 'neutral' },
};

export const fulfillmentStatusOptions = toOptions(fulfillmentStatusPresentation);

/** Nhóm trạng thái mà nhân viên kho cần hành động ngay. */
export const ACTIONABLE_FULFILLMENT_STATUSES: ReadonlySet<FulfillmentStatus> = new Set(['PENDING', 'PICKING', 'PACKED']);

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
export const carrierShipmentStatusPresentation: Record<CarrierShipmentStatus, StatusPresentation> = {
  PENDING: { label: 'Chờ tạo vận đơn', color: 'warning' },
  CREATING: { label: 'Đang tạo vận đơn', color: 'progress' },
  CREATED: { label: 'Đã tạo vận đơn', color: 'success' },
  CREATE_FAILED: { label: 'Tạo vận đơn lỗi', color: 'danger' },
};
