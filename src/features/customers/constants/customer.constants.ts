import {
  AdminCustomerSummaryDtoKind,
  AdminCustomerSummaryDtoStatus,
} from '@/generated/api/customers/models';

export const CUSTOMER_PAGE_SIZE = 20;

export const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

/** Nhãn tiếng Việt tách khỏi mã nghiệp vụ: đổi chữ không được làm đổi bộ lọc. */
export const customerKindPresentation: Record<string, { label: string; color: string }> = {
  [AdminCustomerSummaryDtoKind.MEMBER]: { label: 'Thành viên', color: 'blue' },
  [AdminCustomerSummaryDtoKind.GUEST]: { label: 'Khách lẻ', color: 'default' },
};

export const customerStatusPresentation: Record<string, { label: string; color: string }> = {
  [AdminCustomerSummaryDtoStatus.ACTIVE]: { label: 'Đang hoạt động', color: 'green' },
  [AdminCustomerSummaryDtoStatus.INACTIVE]: { label: 'Ngừng hoạt động', color: 'default' },
};

export const customerKindOptions = Object.entries(customerKindPresentation).map(
  ([value, { label }]) => ({ value, label }),
);

export const customerStatusOptions = Object.entries(customerStatusPresentation).map(
  ([value, { label }]) => ({ value, label }),
);
