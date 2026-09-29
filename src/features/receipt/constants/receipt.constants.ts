/** Tên hiển thị trên biên lai; khớp tên thương hiệu dùng ở BrandLogo. */
export const RECEIPT_STORE_NAME = 'Bảo An Sport';

/**
 * D16: biên lai nội bộ chỉ là chứng từ xác nhận mua hàng. Hoá đơn điện tử để phase sau, nên câu này
 * bắt buộc có để khách không hiểu nhầm đây là hoá đơn GTGT.
 */
export const RECEIPT_TAX_NOTICE = 'Giá đã gồm VAT. Biên lai này không phải hoá đơn GTGT.';

export const RECEIPT_PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Tiền mặt',
  COD: 'Thu hộ khi giao (COD)',
  BANK_TRANSFER: 'Chuyển khoản',
  VNPAY: 'VNPay',
};

export const RECEIPT_PAYMENT_STATUS_LABELS: Record<string, string> = {
  SUCCESS: 'Đã thanh toán',
  PENDING: 'Chưa thanh toán',
  AWAITING_CONFIRMATION: 'Chờ xác nhận',
  NEED_REVIEW: 'Đang kiểm tra',
  FAILED: 'Thanh toán thất bại',
  CANCELLED: 'Đã huỷ',
  REFUNDED: 'Đã hoàn tiền',
};

/** Class gắn lên body chỉ trong lúc in biên lai, để các lệnh in khác của trang không bị ảnh hưởng. */
export const RECEIPT_PRINTING_BODY_CLASS = 'printing-order-receipt';
