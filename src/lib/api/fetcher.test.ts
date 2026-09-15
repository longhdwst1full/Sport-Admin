import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { apiFetcher, isCredentialEndpoint } from './fetcher';
import { clearAuthTokens, saveAuthTokens } from '@/core/auth/auth-token.store';

describe('apiFetcher', () => {
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

});
