/**
 * Key storage của Admin. Không dùng string literal rải rác trong feature
 * (kế thừa `core/storage/constants.ts` của `admin-client`/`dragon-web-v2`).
 */
export const CookieKey = {
  ACCESS_TOKEN: 'dctd_admin_access_token',
  REFRESH_TOKEN: 'dctd_admin_refresh_token',
} as const;

export const LocalStorageKey = {
  LAYOUT: 'dctd-admin-layout-v2',
  PREFERENCES: 'baoan_admin_preferences',
} as const;
