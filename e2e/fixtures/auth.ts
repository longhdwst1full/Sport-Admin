import type { Page } from '@playwright/test';
import { mockJson } from '../mocks/api-mock';
import { PERMISSION_SETS, type PermissionSetName } from './permissions';

/** Khớp `src/core/storage/constants.ts`. Đổi ở đó thì đổi ở đây. */
const COOKIE = {
  accessToken: 'dctd_admin_access_token',
  refreshToken: 'dctd_admin_refresh_token',
} as const;

export interface SessionOptions {
  permissions?: readonly string[];
  displayName?: string;
  mustChangePassword?: boolean;
}

export function currentUserBody(options: SessionOptions = {}) {
  const {
    permissions = PERMISSION_SETS.superAdmin,
    displayName = 'E2E Admin',
    mustChangePassword = false,
  } = options;
  return {
    userId: '1',
    displayName,
    permissions: [...permissions],
    scopes: [{ type: 'GLOBAL' }],
    permissionVersion: `e2e-${permissions.length}`,
    mustChangePassword,
  };
}

export function tokenPairBody(mustChangePassword = false) {
  return {
    accessToken: 'e2e-access-token',
    refreshToken: 'e2e-refresh-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    mustChangePassword,
  };
}

/** Phản hồi `loginAdmin` (AdminLoginResponseDto) khi không cần bước 2FA. */
export function loginAuthenticatedBody(mustChangePassword = false) {
  return { status: 'AUTHENTICATED', ...tokenPairBody(mustChangePassword) };
}

/** Phản hồi `loginAdmin` khi tài khoản đã bật 2FA và cần nhập OTP. */
export function loginMfaRequiredBody() {
  return { status: 'MFA_REQUIRED', challengeToken: 'e2e-challenge', challengeExpiresIn: 300 };
}

/**
 * Nạp thẳng cookie token + stub `/auth/me` để test vào app đã đăng nhập mà
 * không phải đi qua form login ở mọi spec (login có spec riêng).
 */
export async function seedSession(page: Page, options: SessionOptions = {}): Promise<void> {
  const origin = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5199';
  await page.context().addCookies([
    { name: COOKIE.accessToken, value: 'e2e-access-token', url: origin },
    { name: COOKIE.refreshToken, value: 'e2e-refresh-token', url: origin },
  ]);
  await mockJson(page, '**/api/v1/admin/auth/me', currentUserBody(options));
  // Đã bật 2FA: thanh tiêu đề không hiện lối vào "Bật xác thực 2 lớp", shell giữ nguyên.
  await mockJson(page, '**/api/v1/admin/auth/mfa', mfaStatusBody());
}

/** `getAdminMfaStatus` (MfaStatusDto). */
export function mfaStatusBody(overrides: Partial<{ status: string; enforced: boolean; exempt: boolean }> = {}) {
  return { status: 'ACTIVE', enforced: true, exempt: false, confirmedAt: '2026-10-01T00:00:00.000Z', ...overrides };
}

export function permissionsOf(name: PermissionSetName): readonly string[] {
  return PERMISSION_SETS[name];
}
