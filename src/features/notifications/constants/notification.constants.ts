import type { StatusPresentation } from '@/foundation/management/status-tag';
import { toOptions } from '@/shared/utils/options';
import type { AdminNotificationDtoStatus } from '@/generated/api/notifications/notifications.schemas';

export const notificationStatusPresentation: Record<AdminNotificationDtoStatus, StatusPresentation> = {
  PENDING: { label: 'Chờ gửi', color: 'warning' },
  PROCESSING: { label: 'Đang gửi', color: 'progress' },
  DONE: { label: 'Đã xử lý', color: 'success' },
  DEAD: { label: 'Dừng xử lý', color: 'danger' },
};

export const notificationStatusOptions = toOptions(notificationStatusPresentation);

/**
 * CONTRACT: `deliveryStatus` là chuỗi tự do trong OpenAPI (API dùng PENDING/SENT/FAILED của bảng
 * notification). Mã lạ không có nhãn thì ô để trống thay vì hiện mã tiếng Anh.
 */
export const deliveryStatusPresentation: Record<'PENDING' | 'SENT' | 'FAILED', StatusPresentation> = {
  PENDING: { label: 'Chờ gửi', color: 'warning' },
  SENT: { label: 'Đã gửi', color: 'success' },
  FAILED: { label: 'Gửi lỗi', color: 'danger' },
};

export const notificationEventLabels: Record<string, string> = {
  'auth.password_reset_requested': 'Đặt lại mật khẩu',
  'order.placed': 'Xác nhận đơn hàng',
  'order.status_changed': 'Thay đổi trạng thái đơn',
  'payment.succeeded': 'Thanh toán thành công',
  'payment.failed': 'Thanh toán thất bại',
  'refund.succeeded': 'Hoàn tiền thành công',
  'fulfillment.status_changed': 'Cập nhật giao hàng',
};
