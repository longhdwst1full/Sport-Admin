import { PosPaymentMethod } from '@/generated/api/orders/orders.schemas';

export const POS_PERMISSION = 'order.manage';

/** Số kết quả mỗi lần tìm sản phẩm; nhân viên quầy gõ SKU nên không cần danh sách dài. */
export const POS_SEARCH_LIMIT = 20;

export const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

/**
 * Nhãn tiếng Việt tách khỏi mã nghiệp vụ: đổi chữ hiển thị không được làm đổi giá trị
 * gửi lên Backend.
 */
export const posPaymentMethodLabels: Record<PosPaymentMethod, string> = {
  [PosPaymentMethod.CASH]: 'Tiền mặt',
  [PosPaymentMethod.BANK_TRANSFER]: 'Chuyển khoản',
  [PosPaymentMethod.COD]: 'Thu hộ khi giao (COD)',
};

export const posPaymentMethodHints: Record<PosPaymentMethod, string> = {
  [PosPaymentMethod.CASH]: 'Thu tiền mặt tại quầy, ghi nhận đã thanh toán ngay.',
  [PosPaymentMethod.BANK_TRANSFER]:
    'Khách chuyển khoản tại quầy; chỉ bấm thu tiền sau khi đã thấy báo có.',
  [PosPaymentMethod.COD]:
    'Thu tiền khi giao. Đơn tạo ở trạng thái chờ thanh toán và chỉ dùng cho đơn có giao hàng.',
};
