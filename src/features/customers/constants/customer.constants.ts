import {
  CustomerKind,
  CustomerStatus,
} from '@/generated/api/customers/customers.schemas';

export const CUSTOMER_PAGE_SIZE = 20;

export const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

/** Nhãn tiếng Việt tách khỏi mã nghiệp vụ: đổi chữ không được làm đổi bộ lọc. */
export const customerKindPresentation: Record<string, { label: string; color: string }> = {
  [CustomerKind.MEMBER]: { label: 'Thành viên', color: 'blue' },
  [CustomerKind.GUEST]: { label: 'Khách lẻ', color: 'default' },
};

export const customerStatusPresentation: Record<string, { label: string; color: string }> = {
  [CustomerStatus.ACTIVE]: { label: 'Đang hoạt động', color: 'green' },
  [CustomerStatus.INACTIVE]: { label: 'Ngừng hoạt động', color: 'default' },
};

export const customerKindOptions = Object.entries(customerKindPresentation).map(
  ([value, { label }]) => ({ value, label }),
);

export const customerStatusOptions = Object.entries(customerStatusPresentation).map(
  ([value, { label }]) => ({ value, label }),
);
