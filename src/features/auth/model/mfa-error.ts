import { getApiErrorMessage, getApiErrorPayload } from '@/lib/api/error';
import {
  MFA_ERROR_CODE,
  MFA_ERROR_MESSAGES,
  MFA_TARGET_NOT_ENROLLED_MESSAGE,
  type MfaErrorCode,
} from '../constants/mfa.constants';

/** Người dùng đóng hộp nhập mã: không phải lỗi nghiệp vụ, caller bỏ qua không báo. */
export class MfaCodeCancelledError extends Error {
  constructor() {
    super('Đã huỷ nhập mã xác thực');
    this.name = 'MfaCodeCancelledError';
  }
}

export function isMfaCodeCancelled(error: unknown): error is MfaCodeCancelledError {
  return error instanceof MfaCodeCancelledError;
}

function isMfaErrorCode(code: string | undefined): code is MfaErrorCode {
  return code !== undefined && code in MFA_ERROR_MESSAGES;
}

export function getMfaErrorCode(error: unknown): MfaErrorCode | undefined {
  const code = getApiErrorPayload(error)?.code;
  return isMfaErrorCode(code) ? code : undefined;
}

/** Thông báo tiếng Việt cho lỗi 2FA; lỗi khác giữ cơ chế `getApiErrorMessage`. */
export function getMfaErrorMessage(error: unknown, fallback?: string): string {
  const code = getMfaErrorCode(error);
  if (!code) return getApiErrorMessage(error, fallback);
  // API dùng chung mã: 403 = người thao tác chưa bật 2FA; 404/409 = nhân viên được thao tác chưa có.
  if (code === MFA_ERROR_CODE.NOT_ENROLLED && getApiErrorPayload(error)?.statusCode !== 403) {
    return MFA_TARGET_NOT_ENROLLED_MESSAGE;
  }
  return MFA_ERROR_MESSAGES[code];
}

/** Mã sai/thiếu: cho nhập lại ngay trong cùng hộp thoại thay vì đóng và báo lỗi. */
export function isRetryableMfaCodeError(error: unknown): boolean {
  const code = getMfaErrorCode(error);
  return (
    code === MFA_ERROR_CODE.CODE_INVALID ||
    code === MFA_ERROR_CODE.CODE_REQUIRED ||
    code === MFA_ERROR_CODE.CODE_ALREADY_USED
  );
}

/** 403 MFA_NOT_ENROLLED: chính người thao tác chưa bật 2FA → mời tự thiết lập. */
export function isCallerNotEnrolled(error: unknown): boolean {
  return (
    getMfaErrorCode(error) === MFA_ERROR_CODE.NOT_ENROLLED &&
    getApiErrorPayload(error)?.statusCode === 403
  );
}

/** Challenge đăng nhập hết hạn/đã dùng: phải quay lại bước mật khẩu. */
export function isMfaChallengeInvalid(error: unknown): boolean {
  return getMfaErrorCode(error) === MFA_ERROR_CODE.CHALLENGE_INVALID;
}
