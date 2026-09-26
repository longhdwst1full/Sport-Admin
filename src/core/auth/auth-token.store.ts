import type { TokenPairDto } from '@/generated/api/auth/auth.schemas';
import { AuthService } from '@/core/storage';

const cookieTransport = import.meta.env.VITE_AUTH_TOKEN_TRANSPORT === 'COOKIE';
const listeners = new Set<() => void>();
/** COOKIE mode chỉ giữ access token trong memory; refresh token thuộc HttpOnly cookie của API. */
let cookieTransportTokens: TokenPairDto | undefined;

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function readAuthTokens(): TokenPairDto | undefined {
  if (cookieTransport) return cookieTransportTokens;
  return AuthService.read();
}

export function saveAuthTokens(tokens: TokenPairDto, remember?: boolean): void {
  if (cookieTransport) {
    // Access token phải có trong memory để gắn Bearer header. Không persist nó và
    // tuyệt đối không sao chép refresh token HttpOnly sang JavaScript.
    cookieTransportTokens = { ...tokens, refreshToken: undefined };
  } else {
    AuthService.save(tokens, remember);
  }
  notify();
}

export function usesAuthCookieTransport(): boolean {
  return cookieTransport;
}

export function clearAuthTokens(): void {
  cookieTransportTokens = undefined;
  AuthService.clear();
  notify();
}

export function getAccessToken(): string | undefined {
  return readAuthTokens()?.accessToken || undefined;
}

/** Còn refresh token nghĩa là phiên vẫn cứu được, kể cả khi access token đã hết hạn. */
export function hasRefreshCredential(): boolean {
  return cookieTransport || Boolean(readAuthTokens()?.refreshToken);
}

export function subscribeAuthTokens(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
