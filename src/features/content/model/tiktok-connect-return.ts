import { createBrowserStore, SessionStorageKey } from '@/core/storage';
import { safeReturnPath } from '@/core/auth/return-path';
import { TIKTOK_CONNECT_DEFAULT_RETURN } from '../constants/social.constants';

/**
 * Nơi quay về sau OAuth TikTok, giữ trong sessionStorage qua adapter `core/storage` (chịu được storage bị chặn
 * hoặc dữ liệu hỏng — khi đó trang callback dùng đường mặc định).
 */
const returnPathStore = createBrowserStore<string>(SessionStorageKey.TIKTOK_CONNECT_RETURN, {
  area: 'session',
  parse: (raw) => (typeof raw === 'string' ? raw : undefined),
});

export function rememberTikTokReturnPath(path: string) {
  returnPathStore.write(path);
}

/** Đọc rồi xoá; chỉ nhận đường dẫn nội bộ (`safeReturnPath`) để không thành open redirect. */
export function takeTikTokReturnPath(): string {
  const stored = returnPathStore.read();
  returnPathStore.clear();
  return stored ? safeReturnPath(stored, TIKTOK_CONNECT_DEFAULT_RETURN) : TIKTOK_CONNECT_DEFAULT_RETURN;
}
