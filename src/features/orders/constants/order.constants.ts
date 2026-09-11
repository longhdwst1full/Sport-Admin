import type { ListAdminOrdersStatusGroup } from '@/generated/api/orders/models';

export const ORDER_PAGE_SIZE = 20;

export const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

export const orderTabs: Array<{
  key: 'ALL' | ListAdminOrdersStatusGroup;
  label: string;
}> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING_CONFIRMATION', label: 'Chờ xác nhận' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'IN_TRANSIT', label: 'Vận chuyển' },
  { key: 'DELIVERED', label: 'Đã giao' },
];

export const orderStatusPresentation: Record<string, { label: string; color: string }> = {
  PENDING_CONFIRMATION: { label: 'Chờ xác nhận', color: 'gold' },
  CONFIRMED: { label: 'Đã xác nhận', color: 'blue' },
  PICKING: { label: 'Đang lấy hàng', color: 'cyan' },
  PACKED: { label: 'Đã đóng gói', color: 'geekblue' },
  SHIPPED: { label: 'Đang vận chuyển', color: 'purple' },
  DELIVERED: { label: 'Đã giao', color: 'green' },
  COMPLETED: { label: 'Hoàn thành', color: 'success' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
};

export const paymentStatusPresentation: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ thanh toán', color: 'gold' },
  AWAITING_CONFIRMATION: { label: 'Chờ đối soát', color: 'blue' },
  SUCCESS: { label: 'Đã thanh toán', color: 'green' },
  FAILED: { label: 'Thất bại', color: 'red' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
  REFUNDED: { label: 'Đã hoàn tiền', color: 'purple' },
};

