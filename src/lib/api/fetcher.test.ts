// @vitest-environment jsdom
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetcher, isCredentialEndpoint } from './fetcher';
import { clearAuthTokens, getAccessToken, saveAuthTokens } from '@/core/auth/auth-token.store';
import {
  AUTH_SESSION_EXPIRED_EVENT,
  consumeExpiredSessionFlash,
} from '@/core/auth/auth-session-expiry';
import {
  AUTH_REFRESH_LOCK_NAME,
  AuthRefreshErrorCode,
} from '@/core/auth/auth-refresh.constants';
import type { TokenPairDto } from '@/generated/api/auth/auth.schemas';

function unauthorized(config: InternalAxiosRequestConfig): AxiosError {
  const echoed = { ...config, headers: AxiosHeaders.from(config.headers) };
  return new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, echoed, undefined, {
    config: echoed,
    data: { statusCode: 401, code: 'UNAUTHORIZED', message: 'Phiên hết hạn' },
    headers: {},
    status: 401,
    statusText: 'Unauthorized',
  });
}

function httpError(status: number, code?: string): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError(`HTTP ${status}`, AxiosError.ERR_BAD_RESPONSE, config, undefined, {
    config,
    data: code ? { statusCode: status, code, message: code } : undefined,
    headers: {},
    status,
    statusText: String(status),
  });
}

function tokenPair(accessToken: string, refreshToken?: string): TokenPairDto {
  return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 900, mustChangePassword: false };
}

/** Thay `/admin/auth/refresh` bằng `handler`; trả bộ đếm số lần refresh thật sự được gửi. */
function mockRefresh(handler: (attempt: number) => Promise<TokenPairDto>): { calls: number } {
  const counter = { calls: 0 };
  vi.spyOn(axios, 'post').mockImplementation(async (url: string) => {
    if (!String(url).includes('/admin/auth/refresh')) throw new Error(`unexpected POST ${url}`);
    counter.calls += 1;
    return { data: await handler(counter.calls) };
  });
  return counter;
}

/** Adapter: 401 cho mọi bearer khác `validToken`, 200 cho `validToken`. */
function acceptOnly(validToken: string, seen: string[] = []): AxiosAdapter {
  return async (config) => {
    const bearer = String(config.headers.Authorization ?? '');
    seen.push(bearer);
    if (bearer !== `Bearer ${validToken}`) throw unauthorized(config);
    return { config, data: { ok: true }, headers: {}, status: 200, statusText: 'OK' };
  };
}

describe('apiFetcher', () => {
  beforeEach(() => {
    // `expireAdminSession` điều hướng về /login nếu đang ở trang khác; jsdom không hỗ trợ điều hướng.
    window.history.replaceState({}, '', '/login');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    clearAuthTokens();
    consumeExpiredSessionFlash();
  });
  it('serializes request bodies for generated mutations', async () => {
    saveAuthTokens({
      accessToken: 'verified-access-token',
      refreshToken: 'refresh-token-long-enough-for-test',
      tokenType: 'Bearer',
      expiresIn: 900,
      mustChangePassword: false,
    });
    let request: InternalAxiosRequestConfig | undefined;
    const adapter: AxiosAdapter = async (config) => {
      request = config;
      return {
        config,
        data: { id: 'product-1' },
        headers: {},
        status: 201,
        statusText: 'Created',
      };
    };

    const result = await apiFetcher<{ id: string }>(
      {
        url: '/api/v1/admin/products',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: { name: 'Tạ tay' },
      },
      { adapter },
    );

    expect(result).toEqual({ id: 'product-1' });
    expect(request?.baseURL).toBe('http://localhost:4000');
    expect(request?.method).toBe('post');
    expect(request?.data).toBe(JSON.stringify({ name: 'Tạ tay' }));
    expect(request?.headers.Authorization).toBe('Bearer verified-access-token');
    expect(request?.headers['x-permissions']).toBeUndefined();
    clearAuthTokens();
  });

  /**
   * Hồi quy: `/admin/auth/me` là lời gọi khôi phục phiên khi tải lại trang. Bộ lọc cũ bắt
   * cả chuỗi `/admin/auth/` nên `/me` bị coi là endpoint cấp token và không được xoay token
   * khi gặp 401 — access token hết hạn là mất phiên thay vì tự gia hạn.
   */
  it('không coi /admin/auth/me là endpoint cấp token', () => {
    expect(isCredentialEndpoint('/api/v1/admin/auth/me')).toBe(false);
  });

  it('miễn xoay token cho đúng các endpoint cấp hoặc huỷ token', () => {
    expect(isCredentialEndpoint('/api/v1/admin/auth/login')).toBe(true);
    expect(isCredentialEndpoint('/api/v1/admin/auth/refresh')).toBe(true);
    expect(isCredentialEndpoint('/api/v1/admin/auth/logout')).toBe(true);
  });

  it('tài nguyên thường vẫn được xoay token', () => {
    expect(isCredentialEndpoint('/api/v1/admin/products')).toBe(false);
    expect(isCredentialEndpoint('/api/v1/admin/reports/revenue')).toBe(false);
  });

  /**
   * Hồi quy: Backend cấp refresh token qua HttpOnly cookie (AUTH_TOKEN_TRANSPORT=COOKIE) thì
   * JavaScript không đọc được token nào. Bản cũ coi đó là "không cứu được phiên" và đăng xuất
   * ngay mà không gọi /refresh lần nào, dù phiên vẫn còn hợp lệ.
   */
  it('vẫn gọi refresh khi JavaScript không cầm refresh token', async () => {
    clearAuthTokens();
    saveAuthTokens({
      accessToken: 'het-han',
      refreshToken: undefined,
      tokenType: 'Bearer',
      expiresIn: 900,
      mustChangePassword: false,
    });
    let refreshCalls = 0;
    const originalPost = axios.post.bind(axios);
    vi.spyOn(axios, 'post').mockImplementation(async (url: string, ...rest: unknown[]) => {
      if (String(url).includes('/admin/auth/refresh')) {
        refreshCalls += 1;
        return {
          data: {
            accessToken: 'token-moi',
            tokenType: 'Bearer',
            expiresIn: 900,
            mustChangePassword: false,
          },
        };
      }
      return originalPost(url, ...(rest as []));
    });

    let attempt = 0;
    const adapter: AxiosAdapter = async (config) => {
      attempt += 1;
      if (attempt === 1) throw unauthorized(config);
      return { config, data: { ok: true }, headers: {}, status: 200, statusText: 'OK' };
    };

    const result = await apiFetcher<{ ok: boolean }>(
      { url: '/api/v1/admin/reports/top-products', method: 'GET' },
      { adapter },
    );

    expect(refreshCalls).toBe(1);
    expect(result).toEqual({ ok: true });
    vi.restoreAllMocks();
  });

  it('phát tín hiệu hết phiên khi API trả 401 và refresh bị từ chối', async () => {
    clearAuthTokens();
    let expiredEvents = 0;
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, () => {
      expiredEvents += 1;
    }, { once: true });
    mockRefresh(async () => {
      throw httpError(401, AuthRefreshErrorCode.MISSING);
    });
    const adapter: AxiosAdapter = async (config) => {
      throw unauthorized(config);
    };

    await expect(
      apiFetcher({ url: '/api/v1/admin/reports/top-products', method: 'GET' }, { adapter }),
    ).rejects.toMatchObject({ status: 401 });
    expect(expiredEvents).toBe(1);
    expect(consumeExpiredSessionFlash()).toBe(true);
  });

  /**
   * Endpoint tải báo cáo chạy `responseType: 'blob'`, nên axios trả cả thân LỖI dưới dạng Blob.
   * Giữ nguyên Blob thì màn hình hiện "[object Blob]" thay vì lý do thật.
   */
  it('đọc được nội dung lỗi của endpoint tải file', async () => {
    clearAuthTokens();
    const payload = { statusCode: 403, code: 'FORBIDDEN', message: 'Không đủ quyền' };
    const adapter: AxiosAdapter = async (config) => {
      throw new AxiosError(
        'Forbidden',
        AxiosError.ERR_BAD_REQUEST,
        { ...config, headers: AxiosHeaders.from(config.headers) },
        undefined,
        {
          config: { ...config, headers: AxiosHeaders.from(config.headers) },
          data: new Blob([JSON.stringify(payload)], { type: 'application/json' }),
          headers: {},
          status: 403,
          statusText: 'Forbidden',
        },
      );
    };

    await expect(
      apiFetcher(
        { url: '/api/v1/admin/reports/revenue/export', method: 'GET', responseType: 'blob' },
        { adapter },
      ),
    ).rejects.toMatchObject({ status: 403, payload });
  });

  describe('refresh stability', () => {
    it('N request cùng 401 chỉ gây đúng một lần refresh', async () => {
      saveAuthTokens(tokenPair('old', 'refresh-1'));
      const refresh = mockRefresh(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return tokenPair('new', 'refresh-2');
      });
      const adapter = acceptOnly('new');

      const results = await Promise.all(
        Array.from({ length: 5 }, (_, index) =>
          apiFetcher<{ ok: boolean }>({ url: `/api/v1/admin/products/${index}`, method: 'GET' }, { adapter }),
        ),
      );

      expect(refresh.calls).toBe(1);
      expect(results).toEqual(Array.from({ length: 5 }, () => ({ ok: true })));
      expect(getAccessToken()).toBe('new');
    });

    it('thử lại với token mới hơn mà không refresh khi token đã đổi trong lúc request bay', async () => {
      saveAuthTokens(tokenPair('old', 'refresh-1'));
      const refresh = mockRefresh(async () => tokenPair('never', 'never'));
      const seen: string[] = [];
      const inner = acceptOnly('rotated-elsewhere', seen);
      const adapter: AxiosAdapter = async (config) => {
        // Một lần xoay khác hoàn tất trong lúc request đầu còn đang bay.
        if (seen.length === 0) saveAuthTokens(tokenPair('rotated-elsewhere', 'refresh-2'));
        return inner(config);
      };

      await expect(
        apiFetcher({ url: '/api/v1/admin/products', method: 'GET' }, { adapter }),
      ).resolves.toEqual({ ok: true });
      expect(refresh.calls).toBe(0);
      expect(seen).toEqual(['Bearer old', 'Bearer rotated-elsewhere']);
    });

    it.each([
      AuthRefreshErrorCode.INVALID,
      AuthRefreshErrorCode.REUSED,
      AuthRefreshErrorCode.MISSING,
      AuthRefreshErrorCode.LEGACY_UNAUTHORIZED,
    ])('chỉ đăng xuất khi refresh trả 401 (%s)', async (code) => {
      saveAuthTokens(tokenPair('old', 'refresh-1'));
      const expired = vi.fn();
      window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, expired, { once: true });
      mockRefresh(async () => {
        throw httpError(401, code);
      });

      await expect(
        apiFetcher({ url: '/api/v1/admin/products', method: 'GET' }, { adapter: acceptOnly('new') }),
      ).rejects.toMatchObject({ status: 401 });
      expect(expired).toHaveBeenCalledOnce();
      expect(getAccessToken()).toBeUndefined();
    });

    it.each([
      ['5xx', () => httpError(503)],
      ['429', () => httpError(429)],
      ['mất mạng', () => new AxiosError('Network Error', AxiosError.ERR_NETWORK)],
    ])('giữ phiên khi refresh lỗi tạm thời (%s)', async (_label, makeError) => {
      saveAuthTokens(tokenPair('old', 'refresh-1'));
      const expired = vi.fn();
      window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, expired);
      const failure = makeError();
      mockRefresh(async () => {
        throw failure;
      });

      await expect(
        apiFetcher({ url: '/api/v1/admin/products', method: 'GET' }, { adapter: acceptOnly('new') }),
      ).rejects.toMatchObject({ status: failure.response?.status ?? 0 });
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, expired);
      expect(expired).not.toHaveBeenCalled();
      expect(getAccessToken()).toBe('old');
      expect(consumeExpiredSessionFlash()).toBe(false);
    });

    it('thử lại refresh đúng một lần khi gặp 409 AUTH_REFRESH_CONFLICT', async () => {
      saveAuthTokens(tokenPair('old', 'refresh-1'));
      const refresh = mockRefresh(async (attempt) => {
        if (attempt === 1) throw httpError(409, AuthRefreshErrorCode.CONFLICT);
        return tokenPair('new', 'refresh-2');
      });

      await expect(
        apiFetcher({ url: '/api/v1/admin/products', method: 'GET' }, { adapter: acceptOnly('new') }),
      ).resolves.toEqual({ ok: true });
      expect(refresh.calls).toBe(2);
    });

    it('409 lặp lại không đăng xuất và không thử quá một lần', async () => {
      saveAuthTokens(tokenPair('old', 'refresh-1'));
      const expired = vi.fn();
      window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, expired);
      const refresh = mockRefresh(async () => {
        throw httpError(409, AuthRefreshErrorCode.CONFLICT);
      });

      await expect(
        apiFetcher({ url: '/api/v1/admin/products', method: 'GET' }, { adapter: acceptOnly('new') }),
      ).rejects.toMatchObject({ status: 409 });
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, expired);
      expect(refresh.calls).toBe(2);
      expect(expired).not.toHaveBeenCalled();
      expect(getAccessToken()).toBe('old');
    });

    it('trả đúng lỗi khác 401 của request thử lại thay vì 401 gốc', async () => {
      saveAuthTokens(tokenPair('old', 'refresh-1'));
      mockRefresh(async () => tokenPair('new', 'refresh-2'));
      const adapter: AxiosAdapter = async (config) => {
        if (String(config.headers.Authorization) === 'Bearer old') throw unauthorized(config);
        const echoed = { ...config, headers: AxiosHeaders.from(config.headers) };
        throw new AxiosError('Forbidden', AxiosError.ERR_BAD_REQUEST, echoed, undefined, {
          config: echoed,
          data: { statusCode: 403, code: 'FORBIDDEN', message: 'Không đủ quyền' },
          headers: {},
          status: 403,
          statusText: 'Forbidden',
        });
      };

      await expect(
        apiFetcher({ url: '/api/v1/admin/products', method: 'GET' }, { adapter }),
      ).rejects.toMatchObject({ status: 403, payload: { code: 'FORBIDDEN' } });
      expect(getAccessToken()).toBe('new');
    });

    it('xoay token bên trong Web Lock dùng chung giữa các tab khi trình duyệt hỗ trợ', async () => {
      saveAuthTokens(tokenPair('old', 'refresh-1'));
      const lockRequest = vi.fn(
        (_name: string, _options: LockOptions, callback: () => Promise<unknown>) => callback(),
      );
      vi.stubGlobal('navigator', { ...navigator, locks: { request: lockRequest } });
      const refresh = mockRefresh(async () => tokenPair('new', 'refresh-2'));

      await expect(
        apiFetcher({ url: '/api/v1/admin/products', method: 'GET' }, { adapter: acceptOnly('new') }),
      ).resolves.toEqual({ ok: true });
      expect(lockRequest).toHaveBeenCalledOnce();
      expect(lockRequest.mock.calls[0]?.[0]).toBe(AUTH_REFRESH_LOCK_NAME);
      expect(refresh.calls).toBe(1);
    });

    it('không refresh lại khi tab khác đã xoay xong trong lúc chờ lock', async () => {
      saveAuthTokens(tokenPair('old', 'refresh-1'));
      const lockRequest = vi.fn(
        async (_name: string, _options: LockOptions, callback: () => Promise<unknown>) => {
          // Tab khác giữ lock, xoay token và ghi cookie dùng chung trước khi nhả lock.
          saveAuthTokens(tokenPair('from-other-tab', 'refresh-2'));
          return callback();
        },
      );
      vi.stubGlobal('navigator', { ...navigator, locks: { request: lockRequest } });
      const refresh = mockRefresh(async () => tokenPair('never', 'never'));
      const seen: string[] = [];
      const inner = acceptOnly('from-other-tab', seen);
      let first = true;
      const adapter: AxiosAdapter = async (config) => {
        if (first) {
          first = false;
          throw unauthorized(config);
        }
        return inner(config);
      };

      await expect(
        apiFetcher({ url: '/api/v1/admin/products', method: 'GET' }, { adapter }),
      ).resolves.toEqual({ ok: true });
      expect(refresh.calls).toBe(0);
      expect(seen).toEqual(['Bearer from-other-tab']);
    });
  });
});
