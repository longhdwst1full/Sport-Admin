// @vitest-environment jsdom
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { apiFetcher, isCredentialEndpoint } from './fetcher';
import { clearAuthTokens, saveAuthTokens } from '@/core/auth/auth-token.store';
import {
  AUTH_SESSION_EXPIRED_EVENT,
  consumeExpiredSessionFlash,
} from '@/core/auth/auth-session-expiry';

describe('apiFetcher', () => {
  afterEach(() => {
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

  it('phát tín hiệu hết phiên khi API trả 401 mà không còn refresh credential', async () => {
    clearAuthTokens();
    window.history.replaceState({}, '', '/login');
    let expiredEvents = 0;
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, () => {
      expiredEvents += 1;
    }, { once: true });
    const adapter: AxiosAdapter = async (config) => {
      throw new AxiosError(
        'Unauthorized',
        AxiosError.ERR_BAD_REQUEST,
        { ...config, headers: AxiosHeaders.from(config.headers) },
        undefined,
        {
          config: { ...config, headers: AxiosHeaders.from(config.headers) },
          data: { statusCode: 401, code: 'UNAUTHORIZED', message: 'Phiên hết hạn' },
          headers: {},
          status: 401,
          statusText: 'Unauthorized',
        },
      );
    };

    await expect(
      apiFetcher({ url: '/api/v1/admin/reports/top-products', method: 'GET' }, { adapter }),
    ).rejects.toMatchObject({ status: 401 });
    expect(axios.isAxiosError(new AxiosError())).toBe(true);
    expect(expiredEvents).toBe(1);
    expect(consumeExpiredSessionFlash()).toBe(true);
  });

});
