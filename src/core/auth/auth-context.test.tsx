// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAuthTokens } from './auth-token.store';
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
    clearAuthTokens();
    window.sessionStorage.clear();
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
});
