import { Button, Result, Spin } from 'antd';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearAuthTokens } from '@/core/auth/auth-token.store';

export function AppBootSplash() {
  return (
    <div
      className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-50 to-slate-100"
      aria-label="Đang tải ứng dụng"
    >
      <div className="flex flex-col items-center gap-5 animate-fade-in">
        {/* Logo pulse */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-admin-400 opacity-20 animate-pulse-soft blur-xl" />
          <div className="relative grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-admin-600 to-admin-400 shadow-lg shadow-admin-500/25">
            <span className="text-2xl font-bold text-white">BA</span>
          </div>
        </div>

        <Spin size="default" />

        <div className="text-center">
          <div className="text-sm font-semibold text-slate-600">Bảo An Sport</div>
          <div className="mt-1 text-xs text-slate-400">Đang tải hệ thống quản trị...</div>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-48 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-admin-500 to-admin-400"
            style={{
              animation: 'bootProgress 2s ease-in-out infinite',
            }}
          />
        </div>
        <style>{`
          @keyframes bootProgress {
            0% { width: 0%; margin-left: 0; }
            50% { width: 60%; margin-left: 20%; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
      </div>
    </div>
  );
}

interface AppErrorBoundaryState {
  error?: Error;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AdminErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
          <div className="max-w-lg text-center animate-fade-in-up">
            {/* Error icon */}
            <div className="mx-auto mb-6 grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50 shadow-inner-border">
              <span className="text-4xl">⚠️</span>
            </div>

            <Result
              status="500"
              title={
                <span className="text-xl font-bold text-slate-800">
                  Không thể tải trang quản trị
                </span>
              }
              subTitle={
                <span className="text-sm text-slate-500">
                  {import.meta.env.DEV
                    ? this.state.error.message
                    : 'Ứng dụng gặp lỗi khi tải dữ liệu hoặc giao diện. Hãy thử tải lại trang.'}
                </span>
              }
              extra={[
                <Button
                  key="reload"
                  type="primary"
                  size="large"
                  className="!rounded-xl !font-semibold"
                  onClick={() => window.location.reload()}
                >
                  Tải lại trang
                </Button>,
                <Button
                  key="login"
                  size="large"
                  className="!rounded-xl"
                  onClick={() => {
                    clearAuthTokens();
                    window.location.assign('/login');
                  }}
                >
                  Đăng nhập lại
                </Button>,
              ]}
            />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
