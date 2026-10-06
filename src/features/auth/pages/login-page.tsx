import { yupResolver } from '@hookform/resolvers/yup';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { App, Button, Checkbox, Form, Input, Tooltip } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import { startAdminMfaEnrollment, useLoginAdmin } from '@/generated/api/auth/auth';
import type { AdminLoginResponseDto, LoginDto, TokenPairDto } from '@/generated/api/auth/auth.schemas';
import { useAuth } from '@/core/auth/auth-context';
import { BrandLogo } from '@/foundation/brand/brand-logo';
import { getApiErrorMessage } from '@/lib/api/error';
import { SessionEndReason, consumeExpiredSessionReason } from '@/core/auth/auth-session-expiry';
import { consumeReturnPath, safeReturnPath } from '@/core/auth/return-path';
import {
  forgetIdentifier,
  readRememberedIdentifier,
  rememberIdentifier,
} from '../model/remembered-identifier';
import { resolveLoginStep } from '../model/login-step';
import { MFA_REQUIRED_SESSION_MESSAGE } from '../constants/mfa.constants';
import { getMfaErrorMessage } from '../model/mfa-error';
import { LoginMfaStep, type LoginMfaChallenge } from '../components/login-mfa-step';

const schema: yup.ObjectSchema<LoginDto> = yup.object({
  identifier: yup.string().trim().required('Vui lòng nhập email hoặc số điện thoại').max(255),
  password: yup.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').required('Vui lòng nhập mật khẩu'),
  rememberMe: yup.boolean().optional(),
});

export function LoginPage() {
  const { message } = App.useApp();
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Có tên đã ghi nhớ nghĩa là lần trước người dùng đã bật ô này; giữ nguyên lựa chọn đó.
  const [rememberedIdentifier] = useState(readRememberedIdentifier);
  const [remember, setRemember] = useState(() => Boolean(rememberedIdentifier));
  const form = useForm<LoginDto>({
    resolver: yupResolver(schema),
    // SECURITY: chỉ điền sẵn tên đăng nhập. Mật khẩu không bao giờ được lưu hay điền hộ.
    defaultValues: { identifier: rememberedIdentifier, password: '' },
  });

  useEffect(() => {
    const reason = consumeExpiredSessionReason();
    if (reason === SessionEndReason.MFA_REQUIRED) {
      void message.warning(MFA_REQUIRED_SESSION_MESSAGE, 8);
    } else if (reason) {
      void message.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
  }, [message]);

  // Bước 2FA sau mật khẩu; undefined = đang ở bước mật khẩu.
  const [challenge, setChallenge] = useState<LoginMfaChallenge>();
  const [preparingChallenge, setPreparingChallenge] = useState(false);

  const completeLogin = async (tokens: TokenPairDto) => {
    try {
      const currentUser = await auth.establishSession(tokens, remember);
      if (currentUser.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }
      // SECURITY: chỉ quay về đường dẫn nội bộ; giữ query (vd. callback OAuth TikTok cần `code`/`state`).
      const stored = consumeReturnPath();
      const from = safeReturnPath((location.state as { from?: unknown } | null)?.from ?? stored);
      navigate(from, { replace: true });
    } catch (error) {
      void message.error(
        getApiErrorMessage(error, 'Đăng nhập thành công nhưng không thể tải phiên quản trị.'),
      );
    }
  };

  const restartLogin = useCallback(
    (reason?: { type: 'warning' | 'error'; message: string }) => {
      setChallenge(undefined);
      // SECURITY: quay về bước mật khẩu thì xoá mật khẩu đã nhập, tên đăng nhập giữ nguyên.
      form.setValue('password', '');
      if (reason) void message[reason.type](reason.message);
    },
    [form, message],
  );

  const handleLoginResponse = async (response: AdminLoginResponseDto) => {
    const step = resolveLoginStep(response);
    if (step.kind === 'AUTHENTICATED') {
      await completeLogin(step.tokens);
      return;
    }
    if (step.kind === 'MFA_ENROLLMENT_REQUIRED') {
      // Gọi ngay theo sự kiện đăng nhập (không qua effect) để mỗi challenge chỉ sinh một secret.
      setPreparingChallenge(true);
      try {
        const provisioning = await startAdminMfaEnrollment({ challengeToken: step.challengeToken });
        setChallenge({ ...step, provisioning });
      } finally {
        setPreparingChallenge(false);
      }
      return;
    }
    setChallenge(step);
  };

  const login = useLoginAdmin({
    mutation: {
      onSuccess: (response) => {
        void handleLoginResponse(response).catch((error: unknown) => {
          setChallenge(undefined);
          void message.error(getMfaErrorMessage(error, 'Đăng nhập thất bại.'));
        });
      },
      onError: (error) => void message.error(getMfaErrorMessage(error, 'Đăng nhập thất bại.')),
    },
  });

  if (auth.authenticated) {
    return <Navigate to={auth.currentUser?.mustChangePassword ? '/change-password' : '/'} replace />;
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 px-4 py-12">
      {/* ── Background ambient decorative gradients ───────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Soft radial glow from the top */}
        <div className="absolute left-1/2 -top-[300px] -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-b from-emerald-200/50 via-teal-100/30 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-slate-200/40 blur-2xl" />
        <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-emerald-100/30 blur-2xl" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: `radial-gradient(circle, #cbd5e1 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* ── Main card container ──────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[420px] animate-fade-in-up">
        {/* Brand header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-soft backdrop-blur-sm">
            <BrandLogo className="!max-w-[170px]" />
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-800 backdrop-blur-xs">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Cổng Quản Trị Hệ Thống</span>
          </div>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-7 shadow-elevated backdrop-blur-xl sm:p-9">
          {/* Subtle top primary line */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

          {/* Form Header */}
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {challenge ? 'Xác thực 2 lớp' : 'Đăng nhập'}
            </h1>
            <p className="mt-1.5 text-xs text-slate-500 sm:text-sm">
              {challenge?.kind === 'MFA_ENROLLMENT_REQUIRED'
                ? 'Thiết lập Google Authenticator cho tài khoản của bạn'
                : challenge
                  ? 'Nhập mã từ ứng dụng Google Authenticator'
                  : 'Nhập thông tin xác thực để truy cập bảng điều khiển'}
            </p>
          </div>

          {challenge ? (
            <LoginMfaStep
              key={challenge.challengeToken}
              challenge={challenge}
              onAuthenticated={completeLogin}
              onRestart={restartLogin}
            />
          ) : (
          <Form
            layout="vertical"
            requiredMark={false}
            onFinish={() => void form.handleSubmit((data) => {
              if (remember) rememberIdentifier(data.identifier);
              else forgetIdentifier();
              login.mutate({ data: { ...data, rememberMe: remember } });
            })()}
            className="space-y-4"
          >
            <Form.Item
              label={<span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Tài khoản</span>}
              validateStatus={form.formState.errors.identifier ? 'error' : undefined}
              help={form.formState.errors.identifier?.message}
              className="!mb-4"
            >
              <Controller
                name="identifier"
                control={form.control}
                render={({ field }) => (
                  <Input
                    {...field}
                    size="large"
                    prefix={<UserOutlined className="mr-1 text-slate-400" />}
                    placeholder="email@baoansport.vn hoặc SĐT"
                    autoComplete="username"
                    className="!rounded-xl !border-slate-200 hover:!border-emerald-500 focus:!border-emerald-600 !py-2.5 !text-sm"
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label={
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Mật khẩu</span>
                </div>
              }
              validateStatus={form.formState.errors.password ? 'error' : undefined}
              help={form.formState.errors.password?.message}
              className="!mb-6"
            >
              <Controller
                name="password"
                control={form.control}
                render={({ field }) => (
                  <Input.Password
                    {...field}
                    size="large"
                    prefix={<LockOutlined className="mr-1 text-slate-400" />}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="!rounded-xl !border-slate-200 hover:!border-emerald-500 focus:!border-emerald-600 !py-2.5 !text-sm"
                  />
                )}
              />
            </Form.Item>

            <div className="!mb-5 flex items-center justify-between">
              <Checkbox
                checked={remember}
                onChange={(event) => {
                  setRemember(event.target.checked);
                  // Bỏ chọn là quên ngay, không đợi lần đăng nhập sau: người dùng vừa nói rằng
                  // họ không muốn máy này nhớ mình nữa.
                  if (!event.target.checked) forgetIdentifier();
                }}
                className="!text-sm !text-slate-600"
              >
                Ghi nhớ đăng nhập
              </Checkbox>
              {/*
                Chưa có endpoint đặt lại mật khẩu ở backend, nên không dựng link dẫn
                tới trang trống. Quản trị viên cấp lại mật khẩu bằng chức năng mở khoá
                tài khoản ở màn Người dùng & quyền.
              */}
              <Tooltip title="Liên hệ quản trị viên để được cấp lại mật khẩu tại màn Người dùng & quyền.">
                <span className="cursor-help text-sm font-medium text-slate-400 underline decoration-dotted">
                  Quên mật khẩu?
                </span>
              </Tooltip>
            </div>

            <Button
              block
              size="large"
              type="primary"
              htmlType="submit"
              loading={login.isPending || preparingChallenge}
              className="!h-11 !rounded-xl !bg-gradient-to-r !from-emerald-600 !to-teal-600 !text-sm !font-semibold !shadow-md !shadow-emerald-600/20 hover:!from-emerald-500 hover:!to-teal-500 active:scale-[0.99] transition-all"
            >
              {login.isPending || preparingChallenge ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}
            </Button>
          </Form>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Bảo An Sport · Quản trị phân quyền nội bộ
        </div>
      </div>
    </main>
  );
}
