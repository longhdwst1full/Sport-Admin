import type { TokenPairDto } from '@/generated/api/auth/auth.schemas';
import { AuthService } from '@/core/storage';
import { jwtExpiresAtMs } from './access-token-expiry';
import { AUTH_BROADCAST_CHANNEL, AuthBroadcastMessage } from './auth-refresh.constants';

const cookieTransport = import.meta.env.VITE_AUTH_TOKEN_TRANSPORT === 'COOKIE';
const listeners = new Set<() => void>();
/** COOKIE mode chỉ giữ access token trong memory; refresh token thuộc HttpOnly cookie của API. */
let cookieTransportTokens: TokenPairDto | undefined;
/**
 * Tăng sau MỖI lần token đổi (lưu, xoá, đồng bộ từ tab khác). Dùng làm snapshot cho
 * `useSyncExternalStore`: một boolean "có token" không đổi sau lần xoay đầu tiên, nên hẹn giờ
 * xoay chủ động phụ thuộc nó sẽ không bao giờ được đặt lại.
 */
let tokenVersion = 0;
/** Mốc hết hạn tính lúc lưu, gắn với đúng access token đó để không áp nhầm cho token khác. */
let savedExpiry: { accessToken: string; expiresAt: number } | undefined;

function notify(): void {
  tokenVersion += 1;
  listeners.forEach((listener) => listener());
}

export function readAuthTokens(): TokenPairDto | undefined {
  if (cookieTransport) return cookieTransportTokens;
  return AuthService.read();
}

export function saveAuthTokens(tokens: TokenPairDto, remember?: boolean): void {
  savedExpiry =
    tokens.expiresIn > 0
      ? { accessToken: tokens.accessToken, expiresAt: Date.now() + tokens.expiresIn * 1000 }
      : undefined;
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
  savedExpiry = undefined;
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

export function getAuthTokenVersion(): number {
  return tokenVersion;
}

/**
 * Mốc hết hạn (epoch ms) của access token hiện tại. Ưu tiên `expiresIn` server trả lúc lưu; token
 * dựng lại từ cookie sau reload có `expiresIn = 0` nên lùi về claim `exp` của JWT.
 */
export function getAccessTokenExpiresAt(): number | undefined {
  const accessToken = readAuthTokens()?.accessToken;
  if (!accessToken) return undefined;
  if (savedExpiry?.accessToken === accessToken) return savedExpiry.expiresAt;
  return jwtExpiresAtMs(accessToken);
}

/**
 * BODY mode: đọc lại token từ cookie dùng chung vì tab khác có thể đã xoay. COOKIE mode không
 * có gì để đồng bộ — access token là của riêng tab, refresh cookie do trình duyệt tự gửi.
 */
export function syncAuthTokensFromStorage(): boolean {
  if (cookieTransport) return false;
  const changed = AuthService.resync();
  if (changed) notify();
  return changed;
}

let channel: BroadcastChannel | undefined;

function authChannel(): BroadcastChannel | undefined {
  if (channel || typeof BroadcastChannel === 'undefined') return channel;
  // WORKAROUND: BroadcastChannel của Node truyền qua mọi worker thread của Vitest và nổ khi nhận
  // `MessageEvent` của jsdom. Tắt kênh trong môi trường test; gỡ khi Vitest/jsdom tương thích.
  if (import.meta.env.MODE === 'test') return undefined;
  try {
    channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
    channel.onmessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === AuthBroadcastMessage.TOKENS_ROTATED) syncAuthTokensFromStorage();
    };
  } catch {
    channel = undefined;
  }
  return channel;
}

/** Báo tab khác đồng bộ lại token (và đặt lại hẹn giờ xoay) sau khi tab này xoay xong. */
export function announceTokenRotation(): void {
  try {
    authChannel()?.postMessage({ type: AuthBroadcastMessage.TOKENS_ROTATED, at: Date.now() });
  } catch {
    // Kênh đã đóng hoặc trình duyệt chặn: tab khác vẫn tự đồng bộ khi gặp 401.
  }
}

// Mở kênh ngay khi module nạp để tab này NHẬN được thông báo từ tab khác.
if (typeof window !== 'undefined') authChannel();
