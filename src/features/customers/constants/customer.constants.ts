import {
  CustomerKind,
  CustomerStatus,
} from '@/generated/api/customers/customers.schemas';
import type { StatusPresentation } from '@/foundation/management/status-tag';
import { toOptions } from '@/shared/utils/options';

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
