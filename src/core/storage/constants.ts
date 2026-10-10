/**
 * Key storage của Admin. Không dùng string literal rải rác trong feature
 * (kế thừa `core/storage/constants.ts` của `admin-client`/`dragon-web-v2`).
 */
export const CookieKey = {
  ACCESS_TOKEN: 'dctd_admin_access_token',
  REFRESH_TOKEN: 'dctd_admin_refresh_token',
  /** Cờ ghi nhớ đăng nhập. Không chứa dữ liệu nhạy cảm, chỉ '1' hoặc không có. */
  REMEMBER: 'dctd_admin_remember',
} as const;

export const LocalStorageKey = {
  LAYOUT: 'dctd-admin-layout-v2',
  PREFERENCES: 'baoan_admin_preferences',
  /** Tên đăng nhập đã ghi nhớ (chỉ định danh, không bao giờ mật khẩu). */
  REMEMBERED_IDENTIFIER: 'dctd.admin.remembered-identifier',
} as const;

export const SessionStorageKey = {
  /** Trang quay về sau khi kết nối TikTok (OAuth) xong. */
  TIKTOK_CONNECT_RETURN: 'dctd.admin.tiktok-connect-return',
} as const;
