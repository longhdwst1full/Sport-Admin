import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import {
  clearAuthTokens,
  getAccessToken,
  readAuthTokens,
  saveAuthTokens,
} from '@/core/auth/auth-token.store';
import type { TokenPairDto } from '@/generated/api/auth/models';
import { expireAdminSession } from '@/core/auth/auth-session-expiry';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

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

/**
 * Một lần xoay token tại một thời điểm cho toàn ứng dụng.
 *
 * Refresh token dùng một lần: Backend thu hồi session cũ ngay khi rotate. Hai lời gọi song song
 * nghĩa là lời gọi thứ hai cầm token đã bị tiêu, nhận 401 "đã dùng rồi" và đá người dùng ra
 * đăng nhập lại dù phiên vẫn còn sống. Vì vậy mọi nơi cần xoay token đều phải đi qua hàm này,
 * kể cả bước khôi phục phiên lúc tải trang.
 *
 * Không gửi được refresh token trong body cũng vẫn gọi: transport COOKIE giữ token trong
 * HttpOnly cookie mà JavaScript không đọc được. Đoán rằng "không có token thì không cứu được"
 * là cách chắc chắn nhất để đăng xuất một phiên đang hợp lệ.
 */
export async function rotateTokens(): Promise<TokenPairDto> {
  const refreshToken = readAuthTokens()?.refreshToken;
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
      expireAdminSession();
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

/**
 * Như `apiFetcher` nhưng trả cả response.
 *
 * Cần cho luồng tải file: tên file do server đặt nằm ở header `Content-Disposition`, mà
 * `apiFetcher` chỉ trả `response.data` nên header bị mất.
 */
export async function apiFetcherWithResponse<T>(
  config: AxiosRequestConfig,
  options: AxiosRequestConfig = {},
): Promise<AxiosResponse<T>> {
  return request<T>(config, options);
}

export async function apiFetcher<T>(
  config: AxiosRequestConfig,
  options: AxiosRequestConfig = {},
): Promise<T> {
  return (await request<T>(config, options)).data;
}

async function request<T>(
  config: AxiosRequestConfig,
  options: AxiosRequestConfig = {},
): Promise<AxiosResponse<T>> {
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
    return await apiClient.request<T>(requestConfig);
  } catch (error) {
    const isAuthEndpoint = isCredentialEndpoint(config.url);
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      // Điều kiện là CÒN refresh token, không phải còn access token: access hết hạn
      // trước là đúng luồng, chặn ở đây thì không bao giờ xoay được token.
      !isAuthEndpoint
    ) {
      // Luôn thử xoay token trước khi kết luận phiên đã chết. Nhánh cũ tự quyết định dựa trên
      // việc JavaScript có đọc được refresh token hay không, nên ở transport COOKIE — và ở mọi
      // trường hợp Backend cấp token qua cookie trong khi Admin build ở chế độ BODY — nó đăng
      // xuất ngay mà không hề gọi /refresh lần nào.
      try {
        const tokens = await rotateTokens();
        return await apiClient.request<T>({
          ...requestConfig,
          headers: { ...requestConfig.headers, Authorization: `Bearer ${tokens.accessToken}` },
        });
      } catch (retryError) {
        // `rotateTokens` đã dọn token và phát tín hiệu hết phiên khi refresh hỏng. Ở đây chỉ
        // cần trả về lỗi 401 gốc để caller thấy đúng nguyên nhân ban đầu.
        if (axios.isAxiosError(retryError) && retryError.response?.status === 401) {
          clearAuthTokens();
          expireAdminSession();
        }
      }
    }
    if (axios.isAxiosError(error)) {
      throw new ApiError(error.response?.status ?? 0, await readErrorPayload(error.response?.data));
    }
    throw error;
  }
}

/**
 * Endpoint tải file chạy với `responseType: 'blob'`, nên axios trả cả thân LỖI dưới dạng Blob.
 * Giữ nguyên Blob thì màn hình hiện "[object Blob]" thay vì lý do thật (hết quyền, sai khoảng
 * thời gian), và người dùng không biết phải sửa gì.
 */
async function readErrorPayload(data: unknown): Promise<unknown> {
  if (!(data instanceof Blob)) return data;
  const text = await readBlobText(data);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // Lỗi không phải JSON (proxy, gateway) vẫn giữ nguyên văn bản để còn đọc được.
    return text;
  }
}

/**
 * `Blob.text()` không có ở Safari cũ và ở môi trường test jsdom, nên có đường lùi qua `FileReader`.
 * Không có đường lùi thì chính đoạn xử lý lỗi lại ném lỗi và nuốt mất nguyên nhân gốc.
 */
function readBlobText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Không đọc được nội dung lỗi'));
    reader.readAsText(blob);
  });
}

export type ErrorType<Error> = ApiError<Error>;
export type BodyType<BodyData> = BodyData;
