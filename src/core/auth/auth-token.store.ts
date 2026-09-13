import type { TokenPairDto } from '@/generated/api/auth/models';
import { AuthService } from '@/core/storage';

const cookieTransport = import.meta.env.VITE_AUTH_TOKEN_TRANSPORT === 'COOKIE';
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function readAuthTokens(): TokenPairDto | undefined {
  if (cookieTransport) return undefined;
  return AuthService.read();
}

export function saveAuthTokens(tokens: TokenPairDto): void {
  // COOKIE transport: server đã set HttpOnly cookie, client không giữ bản sao.
  if (!cookieTransport) AuthService.save(tokens);
  notify();
}

export function usesAuthCookieTransport(): boolean {
  return cookieTransport;
}

export function clearAuthTokens(): void {
  AuthService.clear();
  notify();
}

export function getAccessToken(): string | undefined {
  return readAuthTokens()?.accessToken;
}

export function subscribeAuthTokens(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
