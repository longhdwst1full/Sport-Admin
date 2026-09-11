import { yupResolver } from '@hookform/resolvers/yup';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { App, Button, Card, Form, Input, Typography } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import { useLoginAdmin } from '@/generated/api/auth/auth';
import type { LoginDto } from '@/generated/api/auth/models';
import { useAuth } from '@/core/auth/auth-context';
import { BrandLogo } from '@/foundation/brand/brand-logo';
import { getApiErrorMessage } from '@/lib/api/error';

const schema: yup.ObjectSchema<LoginDto> = yup.object({
  identifier: yup.string().trim().required('Vui lòng nhập email hoặc số điện thoại').max(255),
  password: yup.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').required('Vui lòng nhập mật khẩu'),
});

export function LoginPage() {
  const { message } = App.useApp();
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm<LoginDto>({
    resolver: yupResolver(schema),
    defaultValues: { identifier: '', password: '' },
  });
  const login = useLoginAdmin({
    mutation: {
      onSuccess: (tokens) => {
        void auth
          .establishSession(tokens)
          .then((currentUser) => {
            if (currentUser.mustChangePassword) {
              navigate('/change-password', { replace: true });
              return;
            }
            const from = (location.state as { from?: string } | null)?.from ?? '/';
            navigate(from, { replace: true });
          })
          .catch((error: unknown) => {
            void message.error(
              getApiErrorMessage(error, 'Đăng nhập thành công nhưng không thể tải phiên quản trị.'),
            );
          });
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Đăng nhập thất bại.')),
    },
  });

  if (auth.authenticated) {
    return <Navigate to={auth.currentUser?.mustChangePassword ? '/change-password' : '/'} replace />;
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-100 p-4">
      <div aria-hidden className="absolute -left-28 -top-28 size-80 rounded-full bg-emerald-300/25 blur-3xl" />
      <div aria-hidden className="absolute -bottom-36 -right-24 size-96 rounded-full bg-red-300/20 blur-3xl" />
      <Card className="relative w-full max-w-md overflow-hidden !border-0 shadow-[0_24px_70px_rgb(15_23_42/0.16)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-slate-800 to-red-500" />
        <div className="mb-7 pt-3 text-center">
          <div className="mx-auto mb-5 flex min-h-16 max-w-[280px] items-center justify-center rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <BrandLogo className="max-w-[250px]" />
          </div>
          <Typography.Title level={3} className="!mb-1 !text-slate-900">Hệ thống quản trị</Typography.Title>
          <Typography.Text type="secondary">Đăng nhập để vận hành bán hàng và kho</Typography.Text>
        </div>
        <Form layout="vertical" onFinish={() => void form.handleSubmit((data) => login.mutate({ data }))()}>
          <Form.Item
            label="Email hoặc số điện thoại"
            required
            validateStatus={form.formState.errors.identifier ? 'error' : undefined}
            help={form.formState.errors.identifier?.message}
          >
            <Controller
              name="identifier"
              control={form.control}
              render={({ field }) => <Input {...field} prefix={<UserOutlined />} autoComplete="username" />}
            />
          </Form.Item>
          <Form.Item
            label="Mật khẩu"
            required
            validateStatus={form.formState.errors.password ? 'error' : undefined}
            help={form.formState.errors.password?.message}
          >
            <Controller
              name="password"
              control={form.control}
              render={({ field }) => (
                <Input.Password {...field} prefix={<LockOutlined />} autoComplete="current-password" />
              )}
            />
          </Form.Item>
          <Button block size="large" type="primary" htmlType="submit" loading={login.isPending}>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </main>
  );
}
