import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import {
  announceTokenRotation,
  clearAuthTokens,
  getAccessToken,
  readAuthTokens,
  saveAuthTokens,
  syncAuthTokensFromStorage,
  usesAuthCookieTransport,
  waitForPeerAccessToken,
} from '@/core/auth/auth-token.store';
import type { TokenPairDto } from '@/generated/api/auth/auth.schemas';
import { SessionEndReason, expireAdminSession } from '@/core/auth/auth-session-expiry';
import {
  AUTH_REFRESH_LOCK_NAME,
  AUTH_PEER_TOKEN_WAIT_MS,
  AuthRefreshErrorCode,
  REFRESH_CONFLICT_RETRY_DELAY_MS,
  TERMINAL_REFRESH_ERROR_CODES,
} from '@/core/auth/auth-refresh.constants';

const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const useProductionCookieProxy =
  import.meta.env.PROD && import.meta.env.VITE_AUTH_TOKEN_TRANSPORT === 'COOKIE';

// SECURITY: COOKIE production phải gọi cùng origin để refresh cookie là first-party. Policy này
// cố ý ưu tiên hơn VITE_API_URL trên Vercel Dashboard; một biến deploy cũ không được phép âm thầm
// đưa Admin trở lại cross-site cookie và làm người dùng logout khi access token hết hạn.
export const API_URL = useProductionCookieProxy ? globalThis.location.origin : configuredApiUrl;

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
 *
 * Chỉ lỗi refresh mang tính kết luận (401 / mã trong `TERMINAL_REFRESH_ERROR_CODES`) mới xoá
 * token và đưa về đăng nhập. Mất mạng, 429, 5xx giữ nguyên phiên và chỉ ném lỗi cho caller.
 */
export function rotateTokens(): Promise<TokenPairDto> {
  // IDEMPOTENCY: `refreshPromise` gộp mọi lời gọi trong tab (N request cùng 401 ⇒ một refresh);
  // Web Lock bên trong gộp tiếp giữa các tab.
  refreshPromise ??= refreshAcrossTabs(readAuthTokens()?.accessToken)
    .catch((error: unknown) => {
      if (isTerminalRefreshFailure(error)) {
        clearAuthTokens();
        expireAdminSession(
          errorCode(error) === AuthRefreshErrorCode.MFA_REQUIRED
            ? SessionEndReason.MFA_REQUIRED
            : SessionEndReason.EXPIRED,
        );
      }
      throw error;
    })
    .finally(() => {
      refreshPromise = undefined;
    });
  return refreshPromise;
}

/**
 * IDEMPOTENCY: Refresh token chung giữa các tab (cookie BODY mode hoặc HttpOnly cookie COOKIE
 * mode). Hai tab cùng xoay thì tab sau cầm token đã bị tiêu ⇒ reuse ⇒ Backend thu hồi phiên.
 * Web Lock tuần tự hoá lời gọi giữa các tab; trình duyệt không có `navigator.locks` thì chỉ còn
 * single-flight trong tab.
 */
async function refreshAcrossTabs(accessTokenBefore: string | undefined): Promise<TokenPairDto> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  const run = () => refreshInsideLock(accessTokenBefore);
  if (!locks?.request) return run();
  return locks.request(AUTH_REFRESH_LOCK_NAME, { mode: 'exclusive' }, run);
}

async function refreshInsideLock(accessTokenBefore: string | undefined): Promise<TokenPairDto> {
  // BODY mode: trong lúc chờ lock, tab khác có thể đã xoay xong và ghi token mới vào cookie
  // dùng chung. Dùng luôn token đó thay vì gửi refresh token cũ (sẽ bị coi là reuse).
  // COOKIE mode: access token là memory riêng từng tab, nên hỏi tab khác trong lock trước khi
  // quyết định xoay HttpOnly refresh cookie dùng chung.
  if (!usesAuthCookieTransport()) {
    syncAuthTokensFromStorage();
    const current = readAuthTokens();
    if (current?.accessToken && current.accessToken !== accessTokenBefore) return current;
  } else {
    // CONCURRENCY: Access token COOKIE mode chỉ nằm trong memory từng tab. Khi tab này vừa chờ
    // Web Lock, hỏi tab đã refresh để nhận access token mới; tự gọi /refresh tiếp sẽ rotate cookie
    // lần nữa và làm access token của tab kia mất hiệu lực sau vài vòng.
    const peerTokens = await waitForPeerAccessToken(accessTokenBefore, AUTH_PEER_TOKEN_WAIT_MS);
    if (peerTokens?.accessToken && peerTokens.accessToken !== accessTokenBefore) return peerTokens;
  }
  let tokens: TokenPairDto;
  try {
    tokens = await postRefresh();
  } catch (error) {
    // Backend báo đang có lần xoay khác của cùng phiên: tạm thời, thử lại ĐÚNG một lần.
    if (!isRefreshConflict(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, REFRESH_CONFLICT_RETRY_DELAY_MS));
    syncAuthTokensFromStorage();
    tokens = await postRefresh();
  }
  saveAuthTokens(tokens);
  announceTokenRotation();
  return tokens;
}

async function postRefresh(): Promise<TokenPairDto> {
  // Đọc refresh token NGAY trước khi gửi (sau lock/đồng bộ), không phải lúc bắt đầu chờ.
  const refreshToken = readAuthTokens()?.refreshToken;
  const { data } = await axios.post<TokenPairDto>(
    '/api/v1/admin/auth/refresh',
    refreshToken ? { refreshToken } : {},
    { baseURL: API_URL, withCredentials: true, headers: { Accept: 'application/json' } },
  );
  return data;
}

function errorCode(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  const code = (error.response?.data as { code?: unknown } | undefined)?.code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * SECURITY: Chỉ refresh bị từ chối (401, hoặc mã refresh-invalid/reused/missing ở status khác
 * như 400 cũ của thiếu cookie) mới kết luận phiên chết. Mất mạng/429/5xx mà đăng xuất thì một
 * lần API chập chờn sẽ đá mọi người dùng ra ngoài dù refresh token vẫn còn hiệu lực.
 */
export function isTerminalRefreshFailure(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !error.response) return false;
  if (error.response.status === 401) return true;
  // `UNAUTHORIZED` chỉ có nghĩa là kết luận khi đi kèm status 401 (nhánh trên).
  const code = errorCode(error);
  return (
    code !== undefined &&
    code !== AuthRefreshErrorCode.LEGACY_UNAUTHORIZED &&
    TERMINAL_REFRESH_ERROR_CODES.has(code)
  );
}

function isRefreshConflict(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    (error.response?.status === 409 || errorCode(error) === AuthRefreshErrorCode.CONFLICT)
  );
}

function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
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
  // Bước 2FA khi đăng nhập: cấp token từ challenge, chưa có phiên để xoay. 401 ở đây (mã sai,
  // ACCOUNT_LOCKED, challenge hết hạn) là kết quả nghiệp vụ, không được kích hoạt refresh/đăng xuất.
  '/admin/auth/mfa/enroll',
  '/admin/auth/mfa/verify',
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
    // Endpoint cấp/huỷ token không bao giờ tự xoay token (đệ quy vô hạn).
    if (!isUnauthorized(error) || isCredentialEndpoint(config.url)) throw await toApiError(error);
    return recoverUnauthorized<T>(requestConfig, accessToken, error);
  }
}

/**
 * Cứu một request bị 401 bằng tối đa một lần dùng token mới hơn và một lần xoay token.
 *
 * Luôn thử xoay token trước khi kết luận phiên đã chết, kể cả khi JavaScript không đọc được
 * refresh token (transport COOKIE giữ nó trong HttpOnly cookie).
 */
async function recoverUnauthorized<T>(
  requestConfig: AxiosRequestConfig,
  usedToken: string | undefined,
  originalError: unknown,
): Promise<AxiosResponse<T>> {
  let lastError = originalError;
  let tokenForAttempt = usedToken;
  let rotated = false;
  // Tối đa: 1 lần thử lại với token mới hơn + 1 lần sau khi xoay. Giới hạn cứng để không lặp.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    syncAuthTokensFromStorage();
    const current = getAccessToken();
    let nextToken: string;
    if (current && current !== tokenForAttempt) {
      // Request bay với token cũ trong lúc tab này/tab khác đã xoay xong: chỉ cần gửi lại với
      // token hiện tại. Xoay thêm lần nữa là tiêu refresh token vô ích.
      nextToken = current;
    } else if (!rotated) {
      rotated = true;
      try {
        nextToken = (await rotateTokens()).accessToken;
      } catch (refreshError) {
        // Refresh bị từ chối: `rotateTokens` đã dọn phiên; trả 401 gốc cho caller.
        // Lỗi tạm thời (mạng/429/5xx/409 lặp): giữ phiên, trả đúng lỗi refresh để UI báo thử lại.
        throw await toApiError(isTerminalRefreshFailure(refreshError) ? lastError : refreshError);
      }
    } else {
      break;
    }
    tokenForAttempt = nextToken;
    try {
      return await apiClient.request<T>({
        ...requestConfig,
        headers: { ...requestConfig.headers, Authorization: `Bearer ${nextToken}` },
      });
    } catch (retryError) {
      // Lỗi khác 401 sau khi đã có token mới (403, 409, 5xx…) là kết quả THẬT của request;
      // nuốt nó rồi trả 401 gốc sẽ khiến caller báo sai nguyên nhân.
      if (!isUnauthorized(retryError)) throw await toApiError(retryError);
      lastError = retryError;
    }
  }
  if (rotated) {
    // SECURITY: Token vừa xoay thành công mà vẫn bị 401 ⇒ Backend đã từ chối phiên (khoá tài
    // khoản, thu hồi). Không thể cứu thêm, dọn phiên thay vì để người dùng kẹt với 401.
    clearAuthTokens();
    expireAdminSession();
  }
  throw await toApiError(lastError);
}

async function toApiError(error: unknown): Promise<unknown> {
  if (!axios.isAxiosError(error)) return error;
  return new ApiError(error.response?.status ?? 0, await readErrorPayload(error.response?.data));
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
