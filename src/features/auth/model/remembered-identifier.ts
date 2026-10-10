import { createBrowserStore, LocalStorageKey } from '@/core/storage';

const identifierStore = createBrowserStore<string>(LocalStorageKey.REMEMBERED_IDENTIFIER, {
  parse: (raw) => (typeof raw === 'string' && raw.trim() ? raw : undefined),
});

/**
 * Tên đăng nhập đã ghi nhớ, để lần sau điền sẵn.
 *
 * SECURITY: chỉ lưu định danh (email/SĐT), **không bao giờ** lưu mật khẩu. Đây là tiện ích gõ ít
 * phím, không phải cơ chế xác thực: token phiên vẫn do `AuthService` quản lý riêng.
 * `core/storage` tự nuốt lỗi storage bị chặn nên hỏng chỗ này không chặn đăng nhập.
 */
export function readRememberedIdentifier(): string {
  return identifierStore.read() ?? '';
}

export function rememberIdentifier(identifier: string): void {
  const value = identifier.trim();
  if (value) identifierStore.write(value);
  else forgetIdentifier();
}

export function forgetIdentifier(): void {
  identifierStore.clear();
}
