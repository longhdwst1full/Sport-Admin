import { Spin } from 'antd';
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './auth-context';
import { toReturnPath } from './return-path';

export function AuthenticatedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading) {
    return <Spin fullscreen tip="Đang xác thực phiên làm việc..." />;
  }
  if (!auth.authenticated) {
    // Giữ cả query (callback OAuth TikTok `?code=…&state=…`); login chỉ nhận lại đường dẫn nội bộ (`safeReturnPath`).
    return <Navigate to="/login" replace state={{ from: toReturnPath(location) }} />;
  }
  if (auth.currentUser?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  if (!auth.currentUser?.mustChangePassword && location.pathname === '/change-password') {
    return <Navigate to="/" replace />;
  }
  return children;
}
