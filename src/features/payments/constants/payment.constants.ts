export const PAYMENT_PAGE_SIZE = 20;

export const paymentStatusPresentation: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ thanh toán', color: 'default' },
  AWAITING_CONFIRMATION: { label: 'Chờ đối soát', color: 'processing' },
  NEED_REVIEW: { label: 'Cần kiểm tra', color: 'warning' },
  SUCCESS: { label: 'Đã thanh toán', color: 'success' },
  FAILED: { label: 'Bị từ chối', color: 'error' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
};

export const paymentMethodLabels: Record<string, string> = {
  BANK_TRANSFER: 'Chuyển khoản',
  COD: 'COD',
};

export const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

