// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TokenPairDto } from '@/generated/api/auth/auth.schemas';

interface FakeMessageEvent {
  data: unknown;
}

class FakeBroadcastChannel {
  static readonly channels = new Map<string, Set<FakeBroadcastChannel>>();

  onmessage: ((event: FakeMessageEvent) => void) | null = null;

  constructor(private readonly name: string) {
    const peers = FakeBroadcastChannel.channels.get(name) ?? new Set();
    peers.add(this);
    FakeBroadcastChannel.channels.set(name, peers);
  }

  postMessage(data: unknown): void {
    for (const peer of FakeBroadcastChannel.channels.get(this.name) ?? []) {
      if (peer !== this) peer.onmessage?.({ data });
    }
  }

  close(): void {
    FakeBroadcastChannel.channels.get(this.name)?.delete(this);
  }
}

function tokenPair(accessToken: string): TokenPairDto {
  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: 900,
    mustChangePassword: false,
  };
}

async function importCookieTab() {
  vi.resetModules();
  return import('./auth-token.store');
}

describe('auth token store — COOKIE transport giữa nhiều tab', () => {
  afterEach(() => {
    FakeBroadcastChannel.channels.clear();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('đồng bộ access token mới mà không đưa refresh token vào BroadcastChannel', async () => {
    vi.stubEnv('VITE_AUTH_TOKEN_TRANSPORT', 'COOKIE');
    vi.stubEnv('MODE', 'development');
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T00:00:00Z'));
    const firstTab = await importCookieTab();
    firstTab.saveAuthTokens(tokenPair('access-old'));
    const secondTab = await importCookieTab();
    secondTab.saveAuthTokens(tokenPair('access-old'));

    // savedAt phải tăng để tab nhận phân biệt được message mới với message đến trễ.
    vi.setSystemTime(new Date('2026-09-30T00:00:01Z'));
    firstTab.saveAuthTokens({ ...tokenPair('access-new'), refreshToken: 'must-not-leak' });
    firstTab.announceTokenRotation();

    expect(secondTab.readAuthTokens()).toMatchObject({ accessToken: 'access-new' });
    expect(secondTab.readAuthTokens()?.refreshToken).toBeUndefined();
  });

  it('hỏi tab đang giữ token mới trước khi tự refresh cookie lần nữa', async () => {
    vi.stubEnv('VITE_AUTH_TOKEN_TRANSPORT', 'COOKIE');
    vi.stubEnv('MODE', 'development');
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T00:00:00Z'));
    const firstTab = await importCookieTab();
    firstTab.saveAuthTokens(tokenPair('access-old'));
    const secondTab = await importCookieTab();
    secondTab.saveAuthTokens(tokenPair('access-old'));
    vi.setSystemTime(new Date('2026-09-30T00:00:01Z'));
    firstTab.saveAuthTokens(tokenPair('access-from-peer'));

    await expect(secondTab.waitForPeerAccessToken('access-old', 50)).resolves.toMatchObject({
      accessToken: 'access-from-peer',
    });
  });
});
