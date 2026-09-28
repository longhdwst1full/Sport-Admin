import type {
  AdminNotificationDtoStatus,
  ListAdminNotificationsStatus,
} from '@/generated/api/notifications/notifications.schemas';

export const NOTIFICATION_DEFAULT_PAGE_SIZE = 30;

export const notificationStatusPresentation: Record<
  AdminNotificationDtoStatus,
  { label: string; color: string }
> = {
  PENDING: { label: 'Chờ gửi', color: 'gold' },
  PROCESSING: { label: 'Đang gửi', color: 'processing' },
  DONE: { label: 'Đã xử lý', color: 'success' },
  DEAD: { label: 'Dừng xử lý', color: 'error' },
};

export const notificationStatusOptions: Array<{
  value: ListAdminNotificationsStatus;
  label: string;
}> = Object.entries(notificationStatusPresentation).map(([value, presentation]) => ({
  value: value as ListAdminNotificationsStatus,
  label: presentation.label,
}));

export const notificationEventLabels: Record<string, string> = {
  'auth.password_reset_requested': 'Đặt lại mật khẩu',
  'order.placed': 'Xác nhận đơn hàng',
  'order.status_changed': 'Thay đổi trạng thái đơn',
  'payment.succeeded': 'Thanh toán thành công',
  'payment.failed': 'Thanh toán thất bại',
  'refund.succeeded': 'Hoàn tiền thành công',
  'fulfillment.status_changed': 'Cập nhật giao hàng',
};

