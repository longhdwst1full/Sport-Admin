/**
 * Trang quay về sau đăng nhập. Giữ cả query/hash (ví dụ callback OAuth TikTok `?code=…&state=…`) nhưng chỉ nhận
 * đường dẫn nội bộ cùng origin.
 *
 * SECURITY: chống open redirect — giá trị phải bắt đầu bằng một `/` duy nhất (không `//host`, không `/\host`), không có
 * ký tự điều khiển, và sau khi parse vẫn cùng origin giả định. Trang đăng nhập/đổi mật khẩu không làm đích quay về.
 */
const INTERNAL_BASE = 'http://admin.internal';
const EXCLUDED_PATHS: ReadonlySet<string> = new Set(['/login', '/change-password']);
const RETURN_PATH_STORAGE_KEY = 'dctd.admin.return-path';
const MAX_RETURN_PATH_LENGTH = 2048;

export function toReturnPath(location: { pathname: string; search?: string; hash?: string }): string {
  return `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`;
}

export function safeReturnPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_RETURN_PATH_LENGTH) return fallback;
  // eslint-disable-next-line no-control-regex -- chặn ký tự điều khiển (tab/newline bị trình duyệt bỏ khi parse URL)
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) {
    return fallback;
  }
  let url: URL;
  try {
    url = new URL(value, INTERNAL_BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== INTERNAL_BASE || EXCLUDED_PATHS.has(url.pathname)) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Hết phiên giữa chừng (fetcher 401 → `expireAdminSession` tải lại `/login`, mất router state): ghi trang hiện tại vào
 * sessionStorage (theo tab) để đăng nhập xong quay lại đúng trang kèm query.
 */
export function rememberReturnPath(path: string): void {
  const safe = safeReturnPath(path, '');
  if (!safe) return;
  try {
    window.sessionStorage.setItem(RETURN_PATH_STORAGE_KEY, safe);
  } catch {
    // Storage bị chặn: chỉ mất trang quay về, không chặn luồng đăng nhập.
  }
}

/** Đọc và xoá trang quay về đã ghi (một lần). */
export function consumeReturnPath(): string | undefined {
  try {
    const value = window.sessionStorage.getItem(RETURN_PATH_STORAGE_KEY);
    window.sessionStorage.removeItem(RETURN_PATH_STORAGE_KEY);
    return value ? safeReturnPath(value, '') || undefined : undefined;
  } catch {
    return undefined;
  }
}
