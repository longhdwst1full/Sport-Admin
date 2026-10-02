import { describe, expect, it } from 'vitest';
import { AdminLoginStatus } from '@/generated/api/auth/auth.schemas';
import { DEFAULT_MFA_CHALLENGE_TTL_SECONDS, isChallengeExpired, resolveLoginStep } from './login-step';

const NOW = 1_000_000;

describe('resolveLoginStep', () => {
  it('AUTHENTICATED trả token pair như login cũ', () => {
    const step = resolveLoginStep(
      {
        status: AdminLoginStatus.AUTHENTICATED,
        accessToken: 'access',
        refreshToken: 'refresh',
        tokenType: 'Bearer',
        expiresIn: 900,
        mustChangePassword: true,
      },
      NOW,
    );
    expect(step).toEqual({
      kind: 'AUTHENTICATED',
      tokens: { accessToken: 'access', refreshToken: 'refresh', tokenType: 'Bearer', expiresIn: 900, mustChangePassword: true },
    });
  });

  it('AUTHENTICATED ở COOKIE transport không có refreshToken trong body', () => {
    const step = resolveLoginStep({ status: AdminLoginStatus.AUTHENTICATED, accessToken: 'access', tokenType: 'Bearer', expiresIn: 900, mustChangePassword: false }, NOW);
    expect(step.kind === 'AUTHENTICATED' && 'refreshToken' in step.tokens).toBe(false);
  });

  it('AUTHENTICATED thiếu access token thì báo lỗi, không tạo phiên rỗng', () => {
    expect(() => resolveLoginStep({ status: AdminLoginStatus.AUTHENTICATED }, NOW)).toThrow();
  });

  it('MFA_REQUIRED chuyển sang bước nhập OTP với hạn challenge', () => {
    expect(
      resolveLoginStep({ status: AdminLoginStatus.MFA_REQUIRED, challengeToken: 'c1', challengeExpiresIn: 300 }, NOW),
    ).toEqual({ kind: 'MFA_REQUIRED', challengeToken: 'c1', expiresAt: NOW + 300_000 });
  });

  it('MFA_ENROLLMENT_REQUIRED chuyển sang bước quét QR; thiếu TTL dùng mặc định 5 phút', () => {
    expect(resolveLoginStep({ status: AdminLoginStatus.MFA_ENROLLMENT_REQUIRED, challengeToken: 'c2' }, NOW)).toEqual({
      kind: 'MFA_ENROLLMENT_REQUIRED',
      challengeToken: 'c2',
      expiresAt: NOW + DEFAULT_MFA_CHALLENGE_TTL_SECONDS * 1000,
    });
  });

  it('bước 2FA thiếu challengeToken thì báo lỗi', () => {
    expect(() => resolveLoginStep({ status: AdminLoginStatus.MFA_REQUIRED }, NOW)).toThrow();
  });
});

describe('isChallengeExpired', () => {
  it('hết hạn đúng tại mốc expiresAt', () => {
    const step = resolveLoginStep({ status: AdminLoginStatus.MFA_REQUIRED, challengeToken: 'c', challengeExpiresIn: 1 }, NOW);
    expect(isChallengeExpired(step, NOW + 999)).toBe(false);
    expect(isChallengeExpired(step, NOW + 1000)).toBe(true);
  });
});
