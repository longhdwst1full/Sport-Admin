import { useState } from 'react';
import {
  App,
  Avatar,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Progress,
  Tag,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CopyOutlined,
  KeyOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/auth/auth-context';
import {
  getGetAdminCurrentUserQueryKey,
  useChangeAdminPassword,
} from '@/generated/api/auth/auth';
import type { ChangePasswordDto } from '@/generated/api/auth/models';
import { getApiErrorMessage } from '@/lib/api/error';
import { getPasswordStrength } from '@/shared/utils';
import { getInitials } from '@/shared/utils';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const passwordSchema: yup.ObjectSchema<ChangePasswordDto & { confirmPassword: string }> =
  yup.object({
    currentPassword: yup.string().required('Vui lòng nhập mật khẩu hiện tại').min(8).max(128),
    newPassword: yup
      .string()
      .required('Vui lòng nhập mật khẩu mới')
      .min(8, 'Mật khẩu mới tối thiểu 8 ký tự')
      .max(128)
      .notOneOf([yup.ref('currentPassword')], 'Mật khẩu mới phải khác mật khẩu hiện tại'),
    confirmPassword: yup
      .string()
      .required('Vui lòng xác nhận mật khẩu mới')
      .oneOf([yup.ref('newPassword')], 'Mật khẩu xác nhận chưa trùng khớp'),
  });

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { message } = App.useApp();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const user = auth.currentUser;
  const displayName = user?.displayName ?? 'Admin';
  const initials = getInitials(displayName);

  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');

  const form = useForm<ChangePasswordDto & { confirmPassword: string }>({
    resolver: yupResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPassword = useWatch({ control: form.control, name: 'newPassword' });
  const strength = getPasswordStrength(newPassword ?? '');

  const changePassword = useChangeAdminPassword({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetAdminCurrentUserQueryKey() });
        void message.success('Đổi mật khẩu tài khoản thành công!');
        form.reset();
        setActiveTab('info');
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể đổi mật khẩu.')),
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    void message.success(`Đã sao chép ${label} vào bộ nhớ tạm`);
  };

  const scopeLabels = Array.isArray(user?.scopes)
    ? user.scopes.map((s) => s.type).join(', ')
    : 'Toàn hệ thống (Global)';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
      destroyOnClose
      centered
      className="!p-0"
      styles={{
        content: { padding: 0, overflow: 'hidden', borderRadius: 20 },
      }}
    >
      {/* ── Top Cover Banner ─────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 px-6 pt-8 pb-14 text-white">
        <div className="absolute -right-10 -top-10 size-48 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute left-1/3 -bottom-10 size-36 rounded-full bg-teal-400/20 blur-2xl" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <SafetyCertificateOutlined />
            <span>Hồ sơ tài khoản Admin</span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>Đang hoạt động</span>
          </span>
        </div>
      </div>

      {/* ── Avatar Overlap Header ────────────────────────────── */}
      <div className="relative px-6 pb-2">
        <div className="flex flex-wrap items-end justify-between gap-4 -mt-10 mb-4">
          <div className="relative group">
            <Avatar
              size={76}
              alt={displayName}
              className="!flex !items-center !justify-center !text-2xl !font-bold ring-4 ring-white shadow-lg shrink-0"
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              }}
            >
              {initials}
            </Avatar>
          </div>

          <div className="flex gap-2">
            <Button
              type={activeTab === 'info' ? 'primary' : 'default'}
              size="small"
              onClick={() => setActiveTab('info')}
              className="!rounded-lg !text-xs !font-medium"
            >
              Thông tin chung
            </Button>
            <Button
              type={activeTab === 'password' ? 'primary' : 'default'}
              size="small"
              icon={<KeyOutlined />}
              onClick={() => setActiveTab('password')}
              className="!rounded-lg !text-xs !font-medium"
            >
              Đổi mật khẩu
            </Button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight m-0">
            {displayName}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
              ID: {user?.userId ?? '1'}
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">{scopeLabels}</span>
          </div>
        </div>
      </div>

      {/* ── Modal Body Content ───────────────────────────────── */}
      <div className="p-6 pt-4 border-t border-slate-100 bg-slate-50/50">
        {activeTab === 'info' ? (
          <div className="space-y-4">
            {/* Account Information Card */}
            <Card size="small" className="!rounded-xl !border-slate-200 !shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Thông tin cơ bản
              </div>
              <Descriptions column={1} size="small" className="dctd-profile-descriptions">
                <Descriptions.Item label={<span className="text-slate-500 text-xs">Họ và tên</span>}>
                  <span className="font-semibold text-slate-900 text-sm">{displayName}</span>
                </Descriptions.Item>
                <Descriptions.Item label={<span className="text-slate-500 text-xs">Email quản trị</span>}>
                  <div className="flex items-center gap-2 text-slate-700">
                    <MailOutlined className="text-slate-400" />
                    <span>admin@baoansport.vn</span>
                    <Tooltip title="Sao chép email">
                      <button
                        type="button"
                        onClick={() => copyToClipboard('admin@baoansport.vn', 'email')}
                        className="text-slate-400 hover:text-emerald-600 cursor-pointer text-xs"
                      >
                        <CopyOutlined />
                      </button>
                    </Tooltip>
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label={<span className="text-slate-500 text-xs">Số điện thoại</span>}>
                  <div className="flex items-center gap-2 text-slate-700">
                    <PhoneOutlined className="text-slate-400" />
                    <span>0988 ••• •••</span>
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label={<span className="text-slate-500 text-xs">Phạm vi hoạt động</span>}>
                  <span className="text-slate-800 font-medium">{scopeLabels}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Permissions Granted Card */}
            <Card size="small" className="!rounded-xl !border-slate-200 !shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Quyền hạn được cấp ({user?.permissions?.length ?? 0})
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">Toàn quyền quản trị</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {(user?.permissions ?? [
                  'catalog.product.view',
                  'catalog.product.manage',
                  'inventory.stock.view',
                  'inventory.stock.adjust',
                  'order.view',
                  'customer.view',
                  'content.post.view',
                  'content.post.manage',
                  'review.moderate',
                  'system.module.view',
                ]).map((perm) => (
                  <Tag
                    key={perm}
                    className="!m-0 !rounded-md !border-slate-200 !bg-white !px-2 !py-0.5 !text-[11px] !font-mono !text-slate-700 shadow-2xs"
                  >
                    {perm}
                  </Tag>
                ))}
              </div>
            </Card>

            {/* Security Note */}
            <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
              <SafetyCertificateOutlined className="text-emerald-600" />
              <span>Phiên đăng nhập JWT được bảo vệ và xác thực an toàn qua TLS 1.3</span>
            </div>
          </div>
        ) : (
          /* ── Change Password Form ───────────────────────────── */
          <div className="space-y-4">
            <Card size="small" className="!rounded-xl !border-slate-200 !shadow-xs">
              <div className="mb-4">
                <div className="text-sm font-bold text-slate-900">Thiết lập mật khẩu mới</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Mật khẩu cần tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và chữ số
                </div>
              </div>

              <Form
                layout="vertical"
                onFinish={() =>
                  void form.handleSubmit((data) =>
                    changePassword.mutate({
                      data: {
                        currentPassword: data.currentPassword,
                        newPassword: data.newPassword,
                      },
                    }),
                  )()
                }
              >
                <Form.Item
                  label={<span className="text-xs font-semibold text-slate-700">Mật khẩu hiện tại</span>}
                  validateStatus={form.formState.errors.currentPassword ? 'error' : undefined}
                  help={form.formState.errors.currentPassword?.message}
                >
                  <Controller
                    name="currentPassword"
                    control={form.control}
                    render={({ field }) => (
                      <Input.Password
                        {...field}
                        prefix={<LockOutlined className="text-slate-400" />}
                        placeholder="Nhập mật khẩu đang sử dụng"
                        className="!rounded-lg"
                      />
                    )}
                  />
                </Form.Item>

                <Form.Item
                  label={<span className="text-xs font-semibold text-slate-700">Mật khẩu mới</span>}
                  validateStatus={form.formState.errors.newPassword ? 'error' : undefined}
                  help={form.formState.errors.newPassword?.message}
                >
                  <Controller
                    name="newPassword"
                    control={form.control}
                    render={({ field }) => (
                      <Input.Password
                        {...field}
                        prefix={<KeyOutlined className="text-slate-400" />}
                        placeholder="Nhập mật khẩu mới"
                        className="!rounded-lg"
                      />
                    )}
                  />
                </Form.Item>

                {/* Password Strength Meter */}
                {Boolean(newPassword) && (
                  <div className="mb-4 -mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Độ mạnh mật khẩu:</span>
                      <span className="font-semibold" style={{ color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                    <Progress
                      percent={strength.percent}
                      strokeColor={strength.color}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                )}

                <Form.Item
                  label={<span className="text-xs font-semibold text-slate-700">Xác nhận mật khẩu mới</span>}
                  validateStatus={form.formState.errors.confirmPassword ? 'error' : undefined}
                  help={form.formState.errors.confirmPassword?.message}
                >
                  <Controller
                    name="confirmPassword"
                    control={form.control}
                    render={({ field }) => (
                      <Input.Password
                        {...field}
                        prefix={<CheckCircleOutlined className="text-slate-400" />}
                        placeholder="Nhập lại mật khẩu mới"
                        className="!rounded-lg"
                      />
                    )}
                  />
                </Form.Item>

                <div className="mt-6 flex justify-end gap-2">
                  <Button onClick={() => setActiveTab('info')} className="!rounded-lg">
                    Hủy bỏ
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={changePassword.isPending}
                    className="!rounded-lg !bg-emerald-600 hover:!bg-emerald-500 !font-semibold"
                  >
                    {changePassword.isPending ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                  </Button>
                </div>
              </Form>
            </Card>
          </div>
        )}
      </div>

      {/* ── Modal Footer Close Action ────────────────────────── */}
      <div className="flex justify-end border-t border-slate-100 bg-white px-6 py-3.5">
        <Button onClick={onClose} className="!rounded-xl !px-5">
          Đóng
        </Button>
      </div>
    </Modal>
  );
}
