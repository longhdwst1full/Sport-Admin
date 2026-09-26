import {
  AdminShippingConsultationDtoConsultationReason,
  ListAdminShippingConsultationsStatus,
} from '@/generated/api/checkout/checkout.schemas';

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

/** Nhãn lý do chờ tư vấn; tách kho là trường hợp phải chuyển kho trước khi chốt phí. */
export const consultationReasonLabel: Record<
  NonNullable<AdminShippingConsultationDtoConsultationReason>,
  { color: string; label: string }
> = {
  [AdminShippingConsultationDtoConsultationReason.CUSTOMER_REQUESTED]: { color: 'blue', label: 'Khách yêu cầu tư vấn' },
  [AdminShippingConsultationDtoConsultationReason.SHIPPING_RULE]: { color: 'default', label: 'Ngoài vùng giao tự động' },
  [AdminShippingConsultationDtoConsultationReason.STOCK_SPLIT_ACROSS_BRANCHES]: { color: 'volcano', label: 'Cần chuyển kho' },
};
