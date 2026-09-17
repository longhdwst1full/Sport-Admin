// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAuthTokens, saveAuthTokens } from './auth-token.store';
import { AuthProvider, useAuth } from './auth-context';

const { getAdminCurrentUserMock, useGetAdminCurrentUserMock } = vi.hoisted(() => ({
  getAdminCurrentUserMock: vi.fn(),
  useGetAdminCurrentUserMock: vi.fn(() => ({
    data: undefined,
    isPending: false,
  })),
}));

vi.mock('@/generated/api/auth/auth', () => ({
  getAdminCurrentUser: getAdminCurrentUserMock,
  getGetAdminCurrentUserQueryKey: () => ['/api/v1/admin/auth/me'],
  logoutAdmin: vi.fn(),
  refreshAdminToken: vi.fn(),
  useGetAdminCurrentUser: useGetAdminCurrentUserMock,
}));

function AuthStateProbe() {
  const auth = useAuth();
  return (
    <div>
      <span>{auth.authenticated ? 'authenticated' : 'anonymous'}</span>
      <span>{auth.developmentBypass ? 'permissions-open' : 'permissions-checked'}</span>
    </div>
  );
}

function EstablishSessionProbe() {
  const auth = useAuth();
  const [displayName, setDisplayName] = useState('not-loaded');
  return (
    <button
      type="button"
      onClick={() =>
        void auth
          .establishSession({
            accessToken: 'verified-access-token',
            tokenType: 'Bearer',
            expiresIn: 900,
            mustChangePassword: false,
          })
          .then((user) => setDisplayName(user.displayName))
      }
    >
      {displayName}
    </button>
  );
}

describe('AuthProvider', () => {
  afterEach(() => {
    // Không có auto-cleanup ở cấu hình vitest này: không gỡ thì DOM của test trước còn lại và
    // truy vấn theo text sẽ khớp nhầm sang cây cũ.
    cleanup();
    clearAuthTokens();
    vi.clearAllMocks();
  });

  it('keeps authentication required when development permission bypass is enabled', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthStateProbe />
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('anonymous')).toBeTruthy();
    expect(screen.getByText('permissions-open')).toBeTruthy();
  });

  it('verifies the current user before completing a login session', async () => {
    getAdminCurrentUserMock.mockResolvedValueOnce({
      userId: '2',
      displayName: 'Development Owner',
      permissions: ['system.module.view'],
      scopes: [{ type: 'GLOBAL' }],
      mustChangePassword: false,
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <EstablishSessionProbe />
        </AuthProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'not-loaded' }));

    expect(await screen.findByRole('button', { name: 'Development Owner' })).toBeTruthy();
    expect(getAdminCurrentUserMock).toHaveBeenCalledOnce();
  });

  it('drops authentication when the session is revoked, so the app can send the user to login', () => {
    // react-query giữ `data` của lần /me thành công gần nhất kể cả sau khi token bị xoá.
    // Nếu `authenticated` chỉ nhìn `data`, người dùng kẹt ở màn hình mọi API đều 401.
    useGetAdminCurrentUserMock.mockReturnValue({
      data: {
        userId: '2',
        displayName: 'Development Owner',
        permissions: ['system.module.view'],
        scopes: [{ type: 'GLOBAL' }],
        permissionVersion: '1',
        mustChangePassword: false,
      },
      isPending: false,
    } as never);
    saveAuthTokens({
      accessToken: 'access',
      refreshToken: 'refresh',
      tokenType: 'Bearer',
      expiresIn: 900,
      mustChangePassword: false,
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const view = render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthStateProbe />
        </AuthProvider>
      </QueryClientProvider>,
    );
    expect(view.getByText('authenticated')).toBeTruthy();

    // Đúng thứ fetcher làm khi xoay token thất bại.
    act(() => clearAuthTokens());

    expect(view.getByText('anonymous')).toBeTruthy();
    view.unmount();
  });
});
