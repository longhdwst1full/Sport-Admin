import axios, { type AxiosRequestConfig } from 'axios';
import {
  clearAuthTokens,
  getAccessToken,
  hasRefreshCredential,
  readAuthTokens,
  saveAuthTokens,
  usesAuthCookieTransport,
} from '@/core/auth/auth-token.store';
import type { TokenPairDto } from '@/generated/api/auth/models';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export class ApiError<T = unknown> extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: T,
  ) {
    super(status ? `API request failed with status ${status}` : 'API request failed');
    this.name = 'ApiError';
  }
}

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

let refreshPromise: Promise<TokenPairDto> | undefined;

async function rotateTokens(): Promise<TokenPairDto> {
  const refreshToken = readAuthTokens()?.refreshToken;
  if (!refreshToken && !usesAuthCookieTransport()) throw new Error('No refresh token is available');
  refreshPromise ??= axios
    .post<TokenPairDto>(
      '/api/v1/admin/auth/refresh',
      refreshToken ? { refreshToken } : {},
      { baseURL: API_URL, withCredentials: true, headers: { Accept: 'application/json' } },
    )
    .then(({ data }) => {
      saveAuthTokens(data);
      return data;
    })
    .catch((error: unknown) => {
      clearAuthTokens();
      throw error;
    })
    .finally(() => {
      refreshPromise = undefined;
    });
  return refreshPromise;
}

/**
 * Chỉ những endpoint tự nó CẤP hoặc HUỶ token mới được miễn xoay token khi gặp 401 —
 * xoay ở đó sẽ đệ quy vô hạn.
 *
 * `/admin/auth/me` KHÔNG thuộc nhóm này: nó là tài nguyên được bảo vệ và là đúng lời gọi
 * khôi phục phiên khi tải lại trang. Trước đây bộ lọc bắt cả chuỗi `/admin/auth/` nên `/me`
 * bị loại nhầm, khiến access token hết hạn là mất phiên thay vì tự gia hạn.
 */
const CREDENTIAL_ENDPOINTS = [
  '/admin/auth/login',
  '/admin/auth/refresh',
  '/admin/auth/logout',
];

export function isCredentialEndpoint(url: string | undefined): boolean {
  const value = String(url ?? '');
  return CREDENTIAL_ENDPOINTS.some((path) => value.includes(path));
}

export async function apiFetcher<T>(
  config: AxiosRequestConfig,
  options: AxiosRequestConfig = {},
): Promise<T> {
  const accessToken = getAccessToken();
  const requestConfig: AxiosRequestConfig = {
    ...config,
    ...options,
    headers: {
      ...config.headers,
      ...options.headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  };
  try {
    const response = await apiClient.request<T>(requestConfig);
    return response.data;
  } catch (error) {
    const isAuthEndpoint = isCredentialEndpoint(config.url);
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      // Điều kiện là CÒN refresh token, không phải còn access token: access hết hạn
      // trước là đúng luồng, chặn ở đây thì không bao giờ xoay được token.
      hasRefreshCredential() &&
      !isAuthEndpoint
    ) {
      const tokens = await rotateTokens();
      const response = await apiClient.request<T>({
        ...requestConfig,
        headers: { ...requestConfig.headers, Authorization: `Bearer ${tokens.accessToken}` },
      });
      return response.data;
    }
    if (axios.isAxiosError(error)) {
      throw new ApiError(error.response?.status ?? 0, error.response?.data);
    }
    throw error;
  }
}

export type ErrorType<Error> = ApiError<Error>;
export type BodyType<BodyData> = BodyData;
