/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getAdminCurrentUser,
  getGetAdminCurrentUserQueryKey,
  logoutAdmin,
  refreshAdminToken,
  useGetAdminCurrentUser,
} from '@/generated/api/auth/auth';
import type { CurrentUserDto, TokenPairDto } from '@/generated/api/auth/models';
import {
  clearAuthTokens,
  readAuthTokens,
  subscribeAuthTokens,
  saveAuthTokens,
  usesAuthCookieTransport,
} from './auth-token.store';

interface AuthContextValue {
  currentUser?: CurrentUserDto;
  authenticated: boolean;
  loading: boolean;
  developmentBypass: boolean;
  establishSession: (tokens: TokenPairDto, remember?: boolean) => Promise<CurrentUserDto>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function hasStoredTokens(): boolean {
  return Boolean(readAuthTokens());
}

/**
 * Các thao tác làm thay đổi quyền hiệu lực của người đang đăng nhập. Tên lấy đúng theo
 * `mutationKey` mà SDK sinh ra từ operationId.
 */
export const PERMISSION_CHANGING_OPERATIONS = new Set([
  'createAdminRole',
  'updateAdminRole',
  'deleteAdminRole',
  'assignAdminUserRole',
  'revokeAdminUserRoleAssignment',
  'lockAdminStaffUser',
  'unlockAdminStaffUser',
  'deleteAdminStaffUser',
]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [restoringCookieSession, setRestoringCookieSession] = useState(usesAuthCookieTransport());
  const hasTokens = useSyncExternalStore(subscribeAuthTokens, hasStoredTokens, () => false);
  const developmentBypass =
    import.meta.env.DEV && (import.meta.env.VITE_DEV_BYPASS_PERMISSIONS ?? 'true') === 'true';
  const currentUserQuery = useGetAdminCurrentUser({
    query: {
      enabled: hasTokens,
      retry: false,
      // Quyền có thể bị người khác thay đổi giữa phiên làm việc. Kiểm lại khi người dùng
      // quay lại tab thay vì giữ nguyên quyền cũ tới lúc tải lại trang.
      refetchOnWindowFocus: true,
    },
  });

  // Thao tác đổi vai trò hoặc phân quyền làm `permissionVersion` ở Backend tăng lên; nếu
  // không đọc lại, menu và các nút vẫn dựng theo quyền cũ. Bắt ở một chỗ thay vì rải lời
  // gọi làm mới vào từng màn — thêm màn mới sẽ không phải nhớ làm lại.
  useEffect(() => {
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.mutation?.state.status !== 'success') return;
      const operation = event.mutation.options.mutationKey?.[0];
      if (typeof operation === 'string' && PERMISSION_CHANGING_OPERATIONS.has(operation)) {
        void queryClient.invalidateQueries({ queryKey: getGetAdminCurrentUserQueryKey() });
      }
    });
    return unsubscribe;
  }, [queryClient]);

  useEffect(() => {
    if (!usesAuthCookieTransport() || hasTokens) {
      setRestoringCookieSession(false);
      return;
    }
    let active = true;
    void refreshAdminToken({})
      .then((tokens) => {
        if (active) saveAuthTokens(tokens);
      })
      .catch(() => {
        if (active) clearAuthTokens();
      })
      .finally(() => {
        if (active) setRestoringCookieSession(false);
      });
    return () => {
      active = false;
    };
  }, [hasTokens]);

  const establishSession = async (
    tokens: TokenPairDto,
    remember?: boolean,
  ): Promise<CurrentUserDto> => {
    saveAuthTokens(tokens, remember);
    const queryKey = getGetAdminCurrentUserQueryKey();
    try {
      return await queryClient.fetchQuery({
        queryKey,
        queryFn: ({ signal }) => getAdminCurrentUser(signal),
        staleTime: 0,
      });
    } catch (error) {
      clearAuthTokens();
      queryClient.removeQueries({ queryKey });
      throw error;
    }
  };

  const signOut = async () => {
    const refreshToken = readAuthTokens()?.refreshToken;
    try {
      if (refreshToken || usesAuthCookieTransport()) {
        await logoutAdmin(refreshToken ? { refreshToken } : {});
      }
    } finally {
      clearAuthTokens();
      queryClient.clear();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser: currentUserQuery.data,
        authenticated: Boolean(currentUserQuery.data),
        loading:
          restoringCookieSession || (hasTokens && currentUserQuery.isPending),
        developmentBypass,
        establishSession,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
