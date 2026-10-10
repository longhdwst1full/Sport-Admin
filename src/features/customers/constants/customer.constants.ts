import {
  CustomerKind,
  CustomerStatus,
} from '@/generated/api/customers/customers.schemas';
import type { StatusPresentation } from '@/foundation/management/status-tag';
import type { ColumnItem } from '@/foundation/table';
import { toOptions } from '@/shared/utils/options';

/** Cột bật/tắt được trong "Tuỳ chỉnh cột"; `id` khớp `key` của cột trong bảng. */
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
export const customerKindPresentation: Record<CustomerKind, StatusPresentation> = {
  [CustomerKind.MEMBER]: { label: 'Thành viên', color: 'info' },
  [CustomerKind.GUEST]: { label: 'Khách lẻ', color: 'neutral' },
};

export const customerStatusPresentation: Record<CustomerStatus, StatusPresentation> = {
  [CustomerStatus.ACTIVE]: { label: 'Đang hoạt động', color: 'success' },
  [CustomerStatus.INACTIVE]: { label: 'Ngừng hoạt động', color: 'neutral' },
};

/** Công tắc "Chặn hồ sơ" trong form: chặn = INACTIVE, hiển thị như trạng thái chặn để rõ hệ quả. */
export const customerBlockPresentation: Record<'BLOCKED' | 'ACTIVE', StatusPresentation> = {
  BLOCKED: { label: 'Đang chặn', color: 'danger' },
  ACTIVE: { label: 'Đang hoạt động', color: 'success' },
};

export const customerKindOptions = toOptions(customerKindPresentation);

export const customerStatusOptions = toOptions(customerStatusPresentation);
