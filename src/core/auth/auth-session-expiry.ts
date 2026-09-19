/**
 * Một điểm phát tín hiệu hết phiên cho toàn Admin.
 *
 * Fetcher không hiển thị UI. Nó chỉ đánh dấu flash message, phát event để dọn cache
 * và đưa trình duyệt về login. LoginPage là nơi duy nhất render toast, nên nhiều API
 * cùng 401 không tạo một chuỗi thông báo trùng nhau.
 */
export const AUTH_SESSION_EXPIRED_EVENT = 'dctd:auth-session-expired';
const AUTH_SESSION_EXPIRED_FLASH_KEY = 'dctd.admin.session-expired';
let redirectStarted = false;

export function expireAdminSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(AUTH_SESSION_EXPIRED_FLASH_KEY, '1');
  } catch {
    // Private mode/storage policy không được làm hỏng luồng logout.
  }
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
  if (window.location.pathname !== '/login' && !redirectStarted) {
    redirectStarted = true;
    window.location.assign('/login');
  }
}

export function consumeExpiredSessionFlash(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const pending = window.sessionStorage.getItem(AUTH_SESSION_EXPIRED_FLASH_KEY) === '1';
    window.sessionStorage.removeItem(AUTH_SESSION_EXPIRED_FLASH_KEY);
    redirectStarted = false;
    return pending;
  } catch {
    return false;
  }
}
