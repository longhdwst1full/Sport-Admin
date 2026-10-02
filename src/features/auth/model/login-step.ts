import {
  AdminLoginStatus,
  type AdminLoginResponseDto,
  type TokenPairDto,
} from '@/generated/api/auth/auth.schemas';

/** Thời hạn challenge khi API không trả `challengeExpiresIn` (API mặc định 5 phút). */
export const DEFAULT_MFA_CHALLENGE_TTL_SECONDS = 300;

export type LoginStep =
  | { kind: 'AUTHENTICATED'; tokens: TokenPairDto }
  | { kind: 'MFA_REQUIRED' | 'MFA_ENROLLMENT_REQUIRED'; challengeToken: string; expiresAt: number };

/**
 * Chuyển kết quả `loginAdmin` thành bước kế tiếp của màn đăng nhập.
 * Ném lỗi khi phản hồi thiếu dữ liệu bắt buộc thay vì lưu một phiên rỗng.
 */
export function resolveLoginStep(response: AdminLoginResponseDto, now = Date.now()): LoginStep {
  if (response.status === AdminLoginStatus.AUTHENTICATED) {
    if (!response.accessToken) throw new Error('Phản hồi đăng nhập thiếu access token.');
    return {
      kind: 'AUTHENTICATED',
      tokens: {
        accessToken: response.accessToken,
        ...(response.refreshToken ? { refreshToken: response.refreshToken } : {}),
        tokenType: response.tokenType ?? 'Bearer',
        expiresIn: response.expiresIn ?? 0,
        mustChangePassword: response.mustChangePassword ?? false,
      },
    };
  }
  if (
    response.status === AdminLoginStatus.MFA_REQUIRED ||
    response.status === AdminLoginStatus.MFA_ENROLLMENT_REQUIRED
  ) {
    if (!response.challengeToken) throw new Error('Phản hồi đăng nhập thiếu mã phiên xác thực 2 lớp.');
    const ttl = response.challengeExpiresIn ?? DEFAULT_MFA_CHALLENGE_TTL_SECONDS;
    return { kind: response.status, challengeToken: response.challengeToken, expiresAt: now + ttl * 1000 };
  }
  throw new Error('Trạng thái đăng nhập không được hỗ trợ.');
}

export function isChallengeExpired(step: LoginStep, now = Date.now()): boolean {
  return step.kind !== 'AUTHENTICATED' && now >= step.expiresAt;
}

/** Thông báo khi challenge hết hạn và màn hình quay về bước mật khẩu. */
export const MFA_CHALLENGE_EXPIRED_MESSAGE =
  'Phiên xác thực 2 lớp đã hết hạn (5 phút). Vui lòng nhập lại mật khẩu.';
