import type { PaymentMethod, PaymentStatus } from '@/generated/api/payments/payments.schemas';
import { toOptions } from '@/shared/utils/options';

export const PAYMENT_PAGE_SIZE = 20;

export const paymentStatusPresentation: Record<PaymentStatus, { label: string; color: string }> = {
  PENDING: { label: 'Chờ thanh toán', color: 'default' },
  AWAITING_CONFIRMATION: { label: 'Chờ đối soát', color: 'processing' },
  NEED_REVIEW: { label: 'Cần kiểm tra', color: 'warning' },
  SUCCESS: { label: 'Đã thanh toán', color: 'success' },
  FAILED: { label: 'Bị từ chối', color: 'error' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
  REFUNDED: { label: 'Đã hoàn tiền', color: 'purple' },
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

