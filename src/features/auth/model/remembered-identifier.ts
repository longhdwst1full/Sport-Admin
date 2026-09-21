const STORAGE_KEY = 'dctd.admin.remembered-identifier';

/**
 * Tên đăng nhập đã ghi nhớ, để lần sau điền sẵn.
 *
 * SECURITY: chỉ lưu định danh (email/SĐT), **không bao giờ** lưu mật khẩu. Đây là tiện ích gõ ít
 * phím, không phải cơ chế xác thực: token phiên vẫn do `AuthService` quản lý riêng.
 *
 * Mọi truy cập bọc try/catch vì chế độ riêng tư và chính sách chặn storage của trình duyệt làm
 * `localStorage` ném lỗi ngay khi đọc — hỏng chỗ này không được phép chặn đăng nhập.
 */
export function readRememberedIdentifier(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function rememberIdentifier(identifier: string): void {
  try {
    const value = identifier.trim();
    if (value) window.localStorage.setItem(STORAGE_KEY, value);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Không ghi nhớ được thì lần sau gõ lại; không phải lỗi chặn luồng đăng nhập.
  }
}

export function forgetIdentifier(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Xem chú thích ở trên.
  }
}
