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

export const AuthService = {
  read(): TokenPairDto | undefined {
    if (memoryTokens) return memoryTokens;
    const accessToken = CookieManager.get(CookieKey.ACCESS_TOKEN);
    if (!accessToken) return undefined;
    memoryTokens = {
      accessToken,
      refreshToken: CookieManager.get(CookieKey.REFRESH_TOKEN) || undefined,
      tokenType: 'Bearer',
      expiresIn: 0,
      mustChangePassword: false,
    };
    return memoryTokens;
  },

  save(tokens: TokenPairDto): void {
    memoryTokens = tokens;
    CookieManager.set(CookieKey.ACCESS_TOKEN, tokens.accessToken, {
      ...COOKIE_OPTS,
      seconds: tokens.expiresIn > 0 ? tokens.expiresIn : undefined,
    });
    if (tokens.refreshToken) {
      CookieManager.set(CookieKey.REFRESH_TOKEN, tokens.refreshToken, COOKIE_OPTS);
    }
  },

  clear(): void {
    memoryTokens = undefined;
    CookieManager.remove(CookieKey.ACCESS_TOKEN, COOKIE_OPTS);
    CookieManager.remove(CookieKey.REFRESH_TOKEN, COOKIE_OPTS);
  },

  getAccessToken(): string | undefined {
    return this.read()?.accessToken;
  },
};
