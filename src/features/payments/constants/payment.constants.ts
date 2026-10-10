import type { StatusPresentation } from '@/foundation/management';
import type {
  PaymentEvidenceStatus,
  PaymentMethod,
  PaymentStatus,
} from '@/generated/api/payments/payments.schemas';
import { toOptions } from '@/shared/utils/options';

export const paymentStatusPresentation: Record<PaymentStatus, StatusPresentation> = {
  PENDING: { label: 'Chờ thanh toán', color: 'warning' },
  AWAITING_CONFIRMATION: { label: 'Chờ đối soát', color: 'warning' },
  NEED_REVIEW: { label: 'Cần kiểm tra', color: 'warning' },
  SUCCESS: { label: 'Đã thanh toán', color: 'success' },
  FAILED: { label: 'Bị từ chối', color: 'danger' },
  CANCELLED: { label: 'Đã huỷ', color: 'neutral' },
  REFUNDED: { label: 'Đã hoàn tiền', color: 'accent' },
};

export const paymentEvidenceStatusPresentation: Record<PaymentEvidenceStatus, StatusPresentation> = {
  PENDING_REVIEW: { label: 'Chờ duyệt', color: 'warning' },
  ACCEPTED: { label: 'Đã chấp nhận', color: 'success' },
  REJECTED: { label: 'Bị từ chối', color: 'danger' },
  CANCELLED: { label: 'Đã huỷ', color: 'neutral' },
};


export const paymentStatusOptions = toOptions(paymentStatusPresentation);

/** Phương thức có nhãn; cũng là tập phương thức lọc được trên danh sách. */
const labelledPaymentMethods = {
  BANK_TRANSFER: 'Chuyển khoản',
  COD: 'COD',
} satisfies Partial<Record<PaymentMethod, string>>;

export const paymentMethodLabels: Record<string, string> = labelledPaymentMethods;

export const paymentMethodOptions = toOptions(labelledPaymentMethods);

export { moneyFormatter } from '@/lib/format/money';

