import { ListAdminShippingConsultationsStatus } from '@/generated/api/checkout/models';

export const SHIPPING_CONSULTATION_PAGE_SIZE = 10;

export const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

export const shippingConsultationStatus = {
  [ListAdminShippingConsultationsStatus.AWAITING_SHIPPING_CONSULTATION]: {
    color: 'gold',
    label: 'Chờ tư vấn',
  },
  [ListAdminShippingConsultationsStatus.QUOTED]: {
    color: 'green',
    label: 'Đã chốt phí',
  },
} as const;

export const shippingProviderOptions = [
  { value: 'MANUAL', label: 'Giao thỏa thuận' },
  { value: 'COACH_BUS', label: 'Gửi xe khách' },
  { value: 'IN_HOUSE', label: 'Cửa hàng tự giao' },
] as const;
