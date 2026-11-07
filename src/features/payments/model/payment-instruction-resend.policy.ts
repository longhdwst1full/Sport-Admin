import type { PaymentDetailDto } from '@/generated/api/payments/payments.schemas';

/**
 * UX: chỉ hiện nút "Gửi lại thông tin thanh toán" khi API có khả năng nhận (`resendAdminPaymentInstruction`).
 * API vẫn kiểm lại toàn bộ (trạng thái, hạn, email, chống spam 5 phút); đây không phải ranh giới nghiệp vụ.
 */
export function canResendPaymentInstruction(
  payment: Pick<PaymentDetailDto, 'method' | 'status' | 'orderStatus' | 'expiresAt'>,
  now: Date = new Date(),
): boolean {
  if (payment.method !== 'BANK_TRANSFER' && payment.method !== 'VNPAY') return false;
  if (payment.status !== 'PENDING' && payment.status !== 'FAILED') return false;
  if (payment.orderStatus !== 'PENDING_CONFIRMATION') return false;
  return Boolean(payment.expiresAt) && new Date(payment.expiresAt as string).getTime() > now.getTime();
}

/** Câu báo theo mã lỗi ổn định của API; mã lạ thì dùng câu API trả về. */
const RESEND_ERROR_MESSAGES: Record<string, string> = {
  PAYMENT_INSTRUCTION_RESEND_TOO_SOON: 'Vừa gửi thông tin thanh toán cho đơn này. Vui lòng chờ 5 phút rồi gửi lại.',
  PAYMENT_INSTRUCTION_RESEND_EMAIL_MISSING: 'Đơn không có email người nhận nên không gửi được.',
  PAYMENT_INSTRUCTION_RESEND_EXPIRED: 'Đơn đã hết hạn thanh toán, không gửi lại được.',
  PAYMENT_INSTRUCTION_RESEND_NOT_ALLOWED: 'Thanh toán không còn ở trạng thái chờ thanh toán. Đã tải lại thông tin.',
  PAYMENT_INSTRUCTION_RESEND_METHOD_UNSUPPORTED: 'Chỉ gửi lại cho đơn chuyển khoản hoặc VNPay.',
  PAYMENT_INSTRUCTION_RESEND_VNPAY_UNAVAILABLE: 'Cổng VNPay chưa được cấu hình nên không tạo được link thanh toán.',
};

export function resendInstructionErrorMessage(code: string | undefined, fallback: string): string {
  return (code && RESEND_ERROR_MESSAGES[code]) || fallback;
}

/** Mã lỗi cho thấy dữ liệu đang hiển thị đã cũ: tải lại chi tiết để nút tự ẩn. */
export function shouldReloadAfterResendError(code: string | undefined): boolean {
  return code === 'PAYMENT_INSTRUCTION_RESEND_NOT_ALLOWED' || code === 'PAYMENT_INSTRUCTION_RESEND_EXPIRED';
}
