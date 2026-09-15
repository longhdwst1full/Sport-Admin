import { CreatePosOrderDtoPaymentMethod } from '@/generated/api/orders/models';

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
export const posPaymentMethodLabels: Record<CreatePosOrderDtoPaymentMethod, string> = {
  [CreatePosOrderDtoPaymentMethod.CASH]: 'Tiền mặt',
  [CreatePosOrderDtoPaymentMethod.BANK_TRANSFER]: 'Chuyển khoản',
};

export const posPaymentMethodHints: Record<CreatePosOrderDtoPaymentMethod, string> = {
  [CreatePosOrderDtoPaymentMethod.CASH]: 'Thu tiền mặt tại quầy, ghi nhận đã thanh toán ngay.',
  [CreatePosOrderDtoPaymentMethod.BANK_TRANSFER]:
    'Khách chuyển khoản tại quầy; chỉ bấm thu tiền sau khi đã thấy báo có.',
};
