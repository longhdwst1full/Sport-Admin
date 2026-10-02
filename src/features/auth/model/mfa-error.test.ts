import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/fetcher';
import { MFA_ERROR_MESSAGES, MFA_TARGET_NOT_ENROLLED_MESSAGE } from '../constants/mfa.constants';
import {
  MfaCodeCancelledError,
  getMfaErrorMessage,
  isMfaChallengeInvalid,
  isCallerNotEnrolled,
  isMfaCodeCancelled,
  isRetryableMfaCodeError,
} from './mfa-error';

const apiError = (statusCode: number, code: string, message = 'server message') =>
  new ApiError(statusCode, { statusCode, code, message });

describe('mfa-error', () => {
  it('map mã lỗi 2FA sang thông báo tiếng Việt ổn định', () => {
    expect(getMfaErrorMessage(apiError(403, 'MFA_CODE_INVALID'))).toBe(MFA_ERROR_MESSAGES.MFA_CODE_INVALID);
    expect(getMfaErrorMessage(apiError(401, 'ACCOUNT_LOCKED'))).toBe(MFA_ERROR_MESSAGES.ACCOUNT_LOCKED);
  });

  it('MFA_NOT_ENROLLED: 403 là người thao tác, 404/409 là nhân viên được thao tác', () => {
    expect(getMfaErrorMessage(apiError(403, 'MFA_NOT_ENROLLED'))).toBe(MFA_ERROR_MESSAGES.MFA_NOT_ENROLLED);
    expect(getMfaErrorMessage(apiError(404, 'MFA_NOT_ENROLLED'))).toBe(MFA_TARGET_NOT_ENROLLED_MESSAGE);
    expect(getMfaErrorMessage(apiError(409, 'MFA_NOT_ENROLLED'))).toBe(MFA_TARGET_NOT_ENROLLED_MESSAGE);
  });

  it('lỗi không thuộc 2FA giữ message của API', () => {
    expect(getMfaErrorMessage(apiError(409, 'SYSTEM_PARAMETER_VERSION_STALE', 'Đã có người sửa'))).toBe('Đã có người sửa');
  });

  it('chỉ mã sai/thiếu được nhập lại trong cùng hộp thoại', () => {
    expect(isRetryableMfaCodeError(apiError(403, 'MFA_CODE_INVALID'))).toBe(true);
    expect(isRetryableMfaCodeError(apiError(403, 'MFA_CODE_REQUIRED'))).toBe(true);
    expect(isRetryableMfaCodeError(apiError(403, 'MFA_NOT_ENROLLED'))).toBe(false);
    expect(isRetryableMfaCodeError(apiError(401, 'ACCOUNT_LOCKED'))).toBe(false);
  });

  it('nhận diện challenge hết hạn và lần hủy nhập mã', () => {
    expect(isMfaChallengeInvalid(apiError(401, 'MFA_CHALLENGE_INVALID'))).toBe(true);
    expect(isMfaCodeCancelled(new MfaCodeCancelledError())).toBe(true);
    expect(isMfaCodeCancelled(new Error('x'))).toBe(false);
  });

  it('MFA_CODE_ALREADY_USED: báo chờ mã mới và cho nhập lại (không phải lần sai)', () => {
    const error = apiError(403, 'MFA_CODE_ALREADY_USED');
    expect(getMfaErrorMessage(error)).toBe('Mã này vừa được dùng, chờ mã mới (30 giây).');
    expect(isRetryableMfaCodeError(error)).toBe(true);
  });

  it('map các mã mới MFA_EXEMPT_ACCOUNT / MFA_ALREADY_ENROLLED', () => {
    expect(getMfaErrorMessage(apiError(409, 'MFA_EXEMPT_ACCOUNT'))).toBe(MFA_ERROR_MESSAGES.MFA_EXEMPT_ACCOUNT);
    expect(getMfaErrorMessage(apiError(409, 'MFA_ALREADY_ENROLLED'))).toBe(MFA_ERROR_MESSAGES.MFA_ALREADY_ENROLLED);
  });

  it('chỉ 403 MFA_NOT_ENROLLED mới là người thao tác chưa bật 2FA', () => {
    expect(isCallerNotEnrolled(apiError(403, 'MFA_NOT_ENROLLED'))).toBe(true);
    expect(isCallerNotEnrolled(apiError(404, 'MFA_NOT_ENROLLED'))).toBe(false);
  });
});
