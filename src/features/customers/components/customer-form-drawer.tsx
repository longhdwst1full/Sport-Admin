import { useEffect } from 'react';
import { App, Button, Drawer, Form, Input, Space, Switch } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import {
  createAdminCustomer,
  getGetAdminCustomerQueryKey,
  getListAdminCustomersQueryKey,
  updateAdminCustomer,
} from '@/generated/api/customers/customers';
import type { CustomerRowView } from '../model/customer.mapper';
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api/error';

interface CustomerFormValues {
  name: string;
  phone?: string;
  email?: string;
  marketingConsent: boolean;
}

function isCustomerFormField(value: string): value is keyof CustomerFormValues {
  return ['name', 'phone', 'email', 'marketingConsent'].includes(value);
}

/**
 * Tạo mới hoặc sửa hồ sơ khách.
 *
 * Sửa gửi kèm `expectedVersion` của bản ghi đang xem: hai nhân viên sửa cùng lúc thì đúng một
 * người thắng, người còn lại nhận lỗi và phải tải lại thay vì ghi đè im lặng.
 */
export function CustomerFormDrawer({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing?: CustomerRowView;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CustomerFormValues>();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: editing?.name ?? '',
      // Mapper thay giá trị rỗng bằng '—' để bảng dễ đọc; form phải nhận lại ô trống.
      phone: editing?.phone === '—' ? '' : (editing?.phone ?? ''),
      email: editing?.email === '—' ? '' : (editing?.email ?? ''),
      marketingConsent: editing?.marketingConsent ?? false,
    });
  }, [open, editing, form]);

  const mutation = useMutation({
    mutationFn: (values: CustomerFormValues) => {
      const payload = {
        name: values.name.trim(),
        phone: values.phone?.trim() ?? '',
        email: values.email?.trim() ?? '',
        marketingConsent: values.marketingConsent,
      };
      return editing
        ? updateAdminCustomer(editing.id, { ...payload, expectedVersion: editing.version })
        : createAdminCustomer({
            name: payload.name,
            ...(payload.phone ? { phone: payload.phone } : {}),
            ...(payload.email ? { email: payload.email } : {}),
            marketingConsent: payload.marketingConsent,
          });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getListAdminCustomersQueryKey() });
      if (editing) {
        // CACHE: detail có địa chỉ/đơn riêng nhưng phần header dùng cùng profile vừa sửa.
        await queryClient.invalidateQueries({
          queryKey: getGetAdminCustomerQueryKey(editing.id),
        });
      }
      void message.success(editing ? 'Đã cập nhật khách hàng.' : 'Đã thêm khách hàng.');
      onClose();
    },
    onError: (error) => {
      const fields = getApiFieldErrors(error);
      Object.entries(fields).forEach(([name, fieldMessage]) => {
        if (isCustomerFormField(name)) form.setFields([{ name, errors: [fieldMessage] }]);
      });
      void message.error(getApiErrorMessage(error, 'Không lưu được hồ sơ khách hàng.'));
    },
  });

  return (
    <Drawer
      open={open}
      aria-label={editing ? `Sửa khách ${editing.customerNo}` : 'Thêm khách hàng'}
      onClose={() => (mutation.isPending ? undefined : onClose())}
      width={480}
      destroyOnHidden
      title={editing ? `Sửa khách ${editing.customerNo}` : 'Thêm khách hàng'}
      footer={
        <Space className="flex justify-end">
          <Button onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button type="primary" loading={mutation.isPending} onClick={() => form.submit()}>
            Lưu
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => mutation.mutate(values)}
        initialValues={{ marketingConsent: false }}
      >
        <Form.Item
          name="name"
          label="Tên khách hàng"
          rules={[{ required: true, whitespace: true, message: 'Nhập tên khách hàng' }]}
        >
          <Input maxLength={255} placeholder="Nguyễn Minh Anh" />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Số điện thoại"
          dependencies={['email']}
          rules={[
            ({ getFieldValue }) => ({
              validator: (_rule, value: string | undefined) =>
                value?.trim() || String(getFieldValue('email') ?? '').trim()
                  ? Promise.resolve()
                  : Promise.reject(new Error('Nhập số điện thoại hoặc email')),
            }),
          ]}
          // Backend yêu cầu ít nhất một cách liên hệ để nhận lại khách ở lần mua sau.
          extra="Cần số điện thoại hoặc email; để trống cả hai sẽ không lưu được."
        >
          <Input maxLength={32} placeholder="0912345678" />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email"
          dependencies={['phone']}
          rules={[
            { type: 'email', message: 'Email không hợp lệ' },
            ({ getFieldValue }) => ({
              validator: (_rule, value: string | undefined) =>
                value?.trim() || String(getFieldValue('phone') ?? '').trim()
                  ? Promise.resolve()
                  : Promise.reject(new Error('Nhập email hoặc số điện thoại')),
            }),
          ]}
        >
          <Input maxLength={255} placeholder="minh.anh@example.com" />
        </Form.Item>
        <Form.Item name="marketingConsent" label="Đồng ý nhận tin khuyến mãi" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
