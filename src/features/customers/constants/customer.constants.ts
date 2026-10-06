import {
  CustomerKind,
  CustomerStatus,
} from '@/generated/api/customers/customers.schemas';
import type { ColumnItem } from '@/foundation/table';
import { toOptions } from '@/shared/utils/options';

export const CUSTOMER_PAGE_SIZE = 20;

/** Cột bật/tắt được trong "Tùy chỉnh cột"; `id` khớp `key` của cột trong bảng. */
export const CUSTOMER_COLUMN_ITEMS: ColumnItem[] = [
  { id: 'customer', label: 'Khách hàng', fixed: true },
  { id: 'contact', label: 'Liên hệ' },
  { id: 'kind', label: 'Loại khách' },
  { id: 'orderCount', label: 'Số đơn' },
  { id: 'lifetimeValue', label: 'Đã chi tiêu' },
  { id: 'lastOrder', label: 'Mua gần nhất' },
  { id: 'status', label: 'Trạng thái' },
  { id: 'actions', label: 'Thao tác', fixed: true },
];

export { moneyFormatter } from '@/lib/format/money';

/** Nhãn tiếng Việt tách khỏi mã nghiệp vụ: đổi chữ không được làm đổi bộ lọc. */
export const customerKindPresentation: Record<string, { label: string; color: string }> = {
  [CustomerKind.MEMBER]: { label: 'Thành viên', color: 'blue' },
  [CustomerKind.GUEST]: { label: 'Khách lẻ', color: 'default' },
};

export const customerStatusPresentation: Record<string, { label: string; color: string }> = {
  [CustomerStatus.ACTIVE]: { label: 'Đang hoạt động', color: 'green' },
  [CustomerStatus.INACTIVE]: { label: 'Ngừng hoạt động', color: 'default' },
};

export const customerKindOptions = toOptions(customerKindPresentation);

export const customerStatusOptions = toOptions(customerStatusPresentation);
