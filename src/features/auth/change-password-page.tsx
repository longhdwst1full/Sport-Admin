import { yupResolver } from '@hookform/resolvers/yup';
import { KeyOutlined, LockOutlined } from '@ant-design/icons';
import { App, Button, Card, Form, Input, Progress, Typography } from 'antd';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import { useQueryClient } from '@tanstack/react-query';
import { getGetAdminCurrentUserQueryKey, useChangeAdminPassword } from '@/generated/api/auth/auth';
import type { ChangePasswordDto } from '@/generated/api/auth/models';
import { getApiErrorMessage } from '@/lib/api/error';
import { getPasswordStrength } from '@/lib/utils/password-strength';

const schema: yup.ObjectSchema<ChangePasswordDto & { confirmPassword: string }> = yup.object({
  currentPassword: yup.string().required('Nhập mật khẩu hiện tại').min(8).max(128),
  newPassword: yup
    .string()
    .required('Nhập mật khẩu mới')
    .min(8, 'Mật khẩu tối thiểu 8 ký tự')
    .max(128)
    .notOneOf([yup.ref('currentPassword')], 'Mật khẩu mới phải khác mật khẩu hiện tại'),
  confirmPassword: yup
    .string()
    .required('Nhập lại mật khẩu mới')
    .oneOf([yup.ref('newPassword')], 'Mật khẩu nhập lại chưa khớp'),
});

const fieldConfig = [
  { name: 'currentPassword' as const, label: 'Mật khẩu hiện tại', autoComplete: 'current-password' },
  { name: 'newPassword' as const, label: 'Mật khẩu mới', autoComplete: 'new-password' },
  { name: 'confirmPassword' as const, label: 'Nhập lại mật khẩu mới', autoComplete: 'new-password' },
];

export function ChangePasswordPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<ChangePasswordDto & { confirmPassword: string }>({
    resolver: yupResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const newPassword = useWatch({ control: form.control, name: 'newPassword' });
  const strength = getPasswordStrength(newPassword ?? '');

  const changePassword = useChangeAdminPassword({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetAdminCurrentUserQueryKey() });
        void message.success('Đã đổi mật khẩu. Bạn có thể tiếp tục làm việc.');
        navigate('/', { replace: true });
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể đổi mật khẩu.')),
    },
  });

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      {/* Background decoration */}
      <div aria-hidden className="dctd-blob dctd-blob-1 -left-20 -top-20 size-72" />
      <div aria-hidden className="dctd-blob dctd-blob-2 -bottom-20 -right-20 size-64" />

      <Card
        className="relative w-full max-w-lg !overflow-hidden !border-0 !shadow-elevated"
        styles={{ body: { padding: 40 } }}
      >
        {/* Top accent */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-xl text-white shadow-lg shadow-amber-500/25">
            <KeyOutlined />
          </div>
          <Typography.Title level={3} className="!mb-2 !text-slate-900">
            Đổi mật khẩu
          </Typography.Title>
          <Typography.Text className="!text-sm !text-slate-500">
            Tài khoản mới hoặc vừa được mở khóa phải đổi mật khẩu mặc định trước khi sử dụng.
          </Typography.Text>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          {[1, 2, 3].map((step, index) => (
            <div
              key={step}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index === 0
                  ? 'bg-admin-500'
                  : index === 1 && (newPassword?.length ?? 0) > 0
                    ? 'bg-admin-400'
                    : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <Form
          layout="vertical"
          onFinish={() =>
            void form.handleSubmit(({ confirmPassword: _, ...data }) => {
              void _;
              changePassword.mutate({ data });
            })()
          }
        >
          {fieldConfig.map(({ name, label, autoComplete }) => (
            <Form.Item
              key={name}
              label={<span className="font-medium text-slate-700">{label}</span>}
              required
              validateStatus={form.formState.errors[name] ? 'error' : undefined}
              help={form.formState.errors[name]?.message}
            >
              <Controller
                name={name}
                control={form.control}
                render={({ field }) => (
                  <Input.Password
                    {...field}
                    size="large"
                    prefix={<LockOutlined className="text-slate-400" />}
                    placeholder="••••••••"
                    autoComplete={autoComplete}
                  />
                )}
              />
              {/* Password strength indicator for newPassword */}
              {name === 'newPassword' && strength.percent > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <Progress
                    percent={strength.percent}
                    showInfo={false}
                    size="small"
                    strokeColor={strength.color}
                    trailColor="#f1f5f9"
                    className="flex-1"
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: strength.color }}
                  >
                    {strength.label}
                  </span>
                </div>
              )}
            </Form.Item>
          ))}

          <Button
            block
            type="primary"
            htmlType="submit"
            loading={changePassword.isPending}
            className="!mt-2 !h-12 !rounded-xl !text-base !font-semibold"
          >
            Đổi mật khẩu và tiếp tục
          </Button>
        </Form>
      </Card>
    </main>
  );
}
