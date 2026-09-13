/**
 * Cookie manager — kế thừa `dragon-web-v2`/`admin-client` (`core/storage/manager/cook.manager.ts`).
 *
 * Token của cả hai reference đều nằm ở cookie chứ không ở localStorage: cookie có
 * `Max-Age` do server quyết định nên hết hạn tự động, `SameSite=Lax` chặn gửi kèm
 * ở request cross-site, và `Secure` khoá truyền trên HTTP. localStorage không có
 * cơ chế nào trong ba cơ chế đó.
 */
export interface CookieOptions {
  /** Max-Age tính bằng giây. Bỏ trống ⇒ session cookie, mất khi đóng trình duyệt. */
  seconds?: number;
  path?: string;
  domain?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
}

function isBrowser(): boolean {
  return typeof document !== 'undefined';
}

export const CookieManager = {
  set(name: string, value: string, options: CookieOptions = {}): void {
    if (!isBrowser()) return;
    const {
      seconds,
      path = '/',
      domain,
      sameSite = 'Lax',
      secure = window.location.protocol === 'https:',
    } = options;

    document.cookie = [
      `${name}=${encodeURIComponent(value || '')}`,
      `Path=${path}`,
      ...(seconds === undefined ? [] : [`Max-Age=${seconds}`]),
      ...(domain ? [`Domain=${domain}`] : []),
      `SameSite=${sameSite}`,
      ...(secure ? ['Secure'] : []),
    ].join('; ');
  },

  get(name: string): string {
    if (!isBrowser()) return '';
    const prefix = `${name}=`;
    const raw = document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length);
    if (!raw) return '';
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  },

  remove(name: string, options: Omit<CookieOptions, 'seconds'> = {}): void {
    this.set(name, '', { ...options, seconds: 0 });
  },
};
