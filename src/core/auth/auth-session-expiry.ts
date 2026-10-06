/**
 * Một điểm phát tín hiệu hết phiên cho toàn Admin.
 *
 * Fetcher không hiển thị UI. Nó chỉ đánh dấu flash message, phát event để dọn cache
 * và đưa trình duyệt về login. LoginPage là nơi duy nhất render toast, nên nhiều API
 * cùng 401 không tạo một chuỗi thông báo trùng nhau.
 */
import { rememberReturnPath, toReturnPath } from './return-path';

export const AUTH_SESSION_EXPIRED_EVENT = 'dctd:auth-session-expired';
const AUTH_SESSION_EXPIRED_FLASH_KEY = 'dctd.admin.session-expired';
let redirectStarted = false;

/** Lý do phiên kết thúc, để LoginPage báo đúng việc người dùng cần làm. */
export const SessionEndReason = {
  EXPIRED: 'EXPIRED',
  /** API thu hồi phiên vì 2FA vừa thành bắt buộc (`AUTH_MFA_REQUIRED`): đăng nhập lại để thiết lập. */
  MFA_REQUIRED: 'MFA_REQUIRED',
} as const;
export type SessionEndReason = (typeof SessionEndReason)[keyof typeof SessionEndReason];

export function expireAdminSession(reason: SessionEndReason = SessionEndReason.EXPIRED): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(AUTH_SESSION_EXPIRED_FLASH_KEY, reason);
  } catch {
    // Private mode/storage policy không được làm hỏng luồng logout.
  }
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
  if (window.location.pathname !== '/login' && !redirectStarted) {
    redirectStarted = true;
    // Tải lại /login làm mất router state: ghi trang hiện tại (kèm query) để đăng nhập xong quay lại.
    rememberReturnPath(toReturnPath(window.location));
    window.location.assign('/login');
  }
}

export function consumeExpiredSessionFlash(): boolean {
  return consumeExpiredSessionReason() !== undefined;
}

/** Đọc và xoá lý do kết thúc phiên (một lần). Giá trị cũ `'1'` được coi là hết hạn. */
export function consumeExpiredSessionReason(): SessionEndReason | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const value = window.sessionStorage.getItem(AUTH_SESSION_EXPIRED_FLASH_KEY);
    window.sessionStorage.removeItem(AUTH_SESSION_EXPIRED_FLASH_KEY);
    redirectStarted = false;
    if (value === null) return undefined;
    return value === SessionEndReason.MFA_REQUIRED ? SessionEndReason.MFA_REQUIRED : SessionEndReason.EXPIRED;
  } catch {
    return undefined;
  }
}
