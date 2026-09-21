/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getAdminCurrentUser,
  getGetAdminCurrentUserQueryKey,
  logoutAdmin,
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
import { AUTH_SESSION_EXPIRED_EVENT, expireAdminSession } from './auth-session-expiry';
import { rotateTokens } from '@/lib/api/fetcher';

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
  const [restoringCookieSession, setRestoringCookieSession] = useState(
    () => usesAuthCookieTransport() && window.location.pathname !== '/login',
  );
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

  /**
   * Khi refresh token hỏng (phiên bị thu hồi, hết hạn), fetcher xoá token nhưng react-query VẪN
   * giữ `data` của lần `/me` thành công gần nhất. Không dọn thì `authenticated` còn true, người
   * dùng kẹt lại ở màn hình mà mọi lời gọi API đều 401 và không bị đưa về trang đăng nhập.
   */
  useEffect(() => {
    if (hasTokens) return;
    queryClient.removeQueries({ queryKey: getGetAdminCurrentUserQueryKey() });
  }, [hasTokens, queryClient]);

  useEffect(() => {
    const clearPrivateCache = () => queryClient.clear();
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, clearPrivateCache);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, clearPrivateCache);
  }, [queryClient]);

  useEffect(() => {
    if (!usesAuthCookieTransport() || window.location.pathname === '/login') {
      setRestoringCookieSession(false);
      return;
    }
    let active = true;
    // Đi qua `rotateTokens` của fetcher thay vì gọi thẳng SDK: hàm đó gộp mọi lời gọi refresh
    // đang bay vào một promise. StrictMode chạy effect hai lần trong dev, và một request 401 có
    // thể xoay token cùng lúc — hai lời gọi song song làm lần thứ hai cầm refresh token đã bị
    // tiêu và nhận 401, tức là đăng xuất một phiên vẫn còn hợp lệ.
    void rotateTokens()
      .then(() => undefined)
      .catch(() => {
        if (active) {
          clearAuthTokens();
          expireAdminSession();
        }
      })
      .finally(() => {
        if (active) setRestoringCookieSession(false);
      });
    return () => {
      active = false;
    };
  }, [queryClient]);

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
        // Phải còn chứng chỉ phiên: chỉ dựa vào `data` là tin vào bản ghi cũ mà react-query
        // giữ lại sau khi phiên đã mất.
        authenticated:
          (hasTokens || usesAuthCookieTransport()) && Boolean(currentUserQuery.data),
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
