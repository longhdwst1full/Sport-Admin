import type { TokenPairDto } from '@/generated/api/auth/models';
import { CookieKey } from '../constants';
import { CookieManager } from '../manager/cookie.manager';

/**
 * Nguồn token duy nhất của Admin — kế thừa `AuthService` của `admin-client`:
 * memory trước, cookie làm lớp bền.
 *
 * Không dùng localStorage/sessionStorage: cookie hết hạn theo `expiresIn` server
 * trả về, `SameSite=Lax` + `Secure` do `CookieManager` đặt sẵn.
 */
let memoryTokens: TokenPairDto | undefined;

const COOKIE_OPTS = { sameSite: 'Lax' as const };

/** Khớp JWT_REFRESH_TTL_SECONDS mặc định của API (30 ngày). */
const REMEMBER_SECONDS = 2_592_000;

export const AuthService = {
  read(): TokenPairDto | undefined {
    if (memoryTokens) return memoryTokens;
    const accessToken = CookieManager.get(CookieKey.ACCESS_TOKEN);
    const refreshToken = CookieManager.get(CookieKey.REFRESH_TOKEN) || undefined;
    // Cookie access token hết hạn trước refresh token là trạng thái BÌNH THƯỜNG:
    // access sống theo `expiresIn`, refresh là session cookie. Trả undefined ở đây
    // sẽ vứt mất refresh token còn dùng được và ép người dùng đăng nhập lại.
    if (!accessToken && !refreshToken) return undefined;
    memoryTokens = {
      accessToken: accessToken ?? '',
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 0,
      mustChangePassword: false,
    };
    return memoryTokens;
  },

  /**
   * `remember` chỉ truyền lúc đăng nhập. Các lần xoay token sau đó bỏ trống để
   * giữ nguyên lựa chọn ban đầu, nếu không mỗi lần refresh sẽ âm thầm biến phiên
   * "ghi nhớ" thành phiên tạm.
   */
  save(tokens: TokenPairDto, remember?: boolean): void {
    memoryTokens = tokens;
    if (remember !== undefined) {
      if (remember) CookieManager.set(CookieKey.REMEMBER, '1', { ...COOKIE_OPTS, seconds: REMEMBER_SECONDS });
      else CookieManager.remove(CookieKey.REMEMBER, COOKIE_OPTS);
    }
    const persist = remember ?? CookieManager.get(CookieKey.REMEMBER) === '1';

    CookieManager.set(CookieKey.ACCESS_TOKEN, tokens.accessToken, {
      ...COOKIE_OPTS,
      seconds: tokens.expiresIn > 0 ? tokens.expiresIn : undefined,
    });
    if (tokens.refreshToken) {
      CookieManager.set(CookieKey.REFRESH_TOKEN, tokens.refreshToken, {
        ...COOKIE_OPTS,
        // Không ghi nhớ thì refresh token là session cookie: đóng trình duyệt là hết phiên.
        ...(persist ? { seconds: REMEMBER_SECONDS } : {}),
      });
    }
  },

  clear(): void {
    memoryTokens = undefined;
    CookieManager.remove(CookieKey.ACCESS_TOKEN, COOKIE_OPTS);
    CookieManager.remove(CookieKey.REFRESH_TOKEN, COOKIE_OPTS);
    CookieManager.remove(CookieKey.REMEMBER, COOKIE_OPTS);
  },

  getAccessToken(): string | undefined {
    // Chuỗi rỗng nghĩa là access token đã hết hạn nhưng refresh vẫn còn.
    return this.read()?.accessToken || undefined;
  },

  getRefreshToken(): string | undefined {
    return this.read()?.refreshToken;
  },
};
