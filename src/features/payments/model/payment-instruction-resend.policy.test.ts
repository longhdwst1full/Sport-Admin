import { describe, expect, it } from 'vitest';
import {
  canResendPaymentInstruction,
  resendInstructionErrorMessage,
  shouldReloadAfterResendError,
} from './payment-instruction-resend.policy';

const now = new Date('2026-11-07T03:00:00.000Z');
const pending = {
  method: 'VNPAY',
  status: 'PENDING',
  orderStatus: 'PENDING_CONFIRMATION',
  expiresAt: '2026-11-07T03:10:00.000Z',
} as const;

describe('canResendPaymentInstruction', () => {
  it('cho VNPay/chuyển khoản đang chờ thanh toán còn hạn', () => {
    expect(canResendPaymentInstruction(pending, now)).toBe(true);
    expect(canResendPaymentInstruction({ ...pending, method: 'BANK_TRANSFER', status: 'FAILED' }, now)).toBe(true);
  });

  it('không áp dụng cho COD', () => {
    expect(canResendPaymentInstruction({ ...pending, method: 'COD' }, now)).toBe(false);
  });

  it('ẩn khi đã thanh toán, đang chờ đối soát hoặc đơn không còn chờ xác nhận', () => {
    expect(canResendPaymentInstruction({ ...pending, status: 'SUCCESS' }, now)).toBe(false);
    expect(canResendPaymentInstruction({ ...pending, status: 'AWAITING_CONFIRMATION' }, now)).toBe(false);
    expect(canResendPaymentInstruction({ ...pending, orderStatus: 'CANCELLED' }, now)).toBe(false);
  });

  it('ẩn khi hết hạn hoặc không có hạn', () => {
    expect(canResendPaymentInstruction({ ...pending, expiresAt: '2026-11-07T02:59:59.000Z' }, now)).toBe(false);
    expect(canResendPaymentInstruction({ ...pending, expiresAt: undefined }, now)).toBe(false);
  });
});

describe('resendInstructionErrorMessage', () => {
  it('báo theo mã lỗi ổn định, mã lạ dùng câu dự phòng', () => {
    expect(resendInstructionErrorMessage('PAYMENT_INSTRUCTION_RESEND_TOO_SOON', 'x')).toContain('5 phút');
    expect(resendInstructionErrorMessage('PAYMENT_INSTRUCTION_RESEND_EMAIL_MISSING', 'x')).toContain('email');
    expect(resendInstructionErrorMessage('SOMETHING_ELSE', 'dự phòng')).toBe('dự phòng');
    expect(resendInstructionErrorMessage(undefined, 'dự phòng')).toBe('dự phòng');
  });

  it('tải lại chi tiết khi trạng thái đã đổi hoặc hết hạn', () => {
    expect(shouldReloadAfterResendError('PAYMENT_INSTRUCTION_RESEND_NOT_ALLOWED')).toBe(true);
    expect(shouldReloadAfterResendError('PAYMENT_INSTRUCTION_RESEND_EXPIRED')).toBe(true);
    expect(shouldReloadAfterResendError('PAYMENT_INSTRUCTION_RESEND_TOO_SOON')).toBe(false);
  });
});
