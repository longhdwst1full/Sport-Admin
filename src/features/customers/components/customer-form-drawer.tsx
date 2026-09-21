import { useEffect } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Alert, App, Button, Divider, Drawer, Form, Input, Skeleton, Space, Switch, Typography } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAdminCustomer,
  getGetAdminCustomerQueryKey,
  getListAdminCustomersQueryKey,
  updateAdminCustomer,
  useActivateAdminCustomer,
  useDeactivateAdminCustomer,
  useGetAdminCustomer,
} from '@/generated/api/customers/customers';
import { ImageUploadField } from '@/features/media';
import type { CustomerRowView } from '../model/customer.mapper';
import {
  emptyCustomerAddress,
  toCreateCustomerDto,
  toCustomerFormValues,
  toUpdateCustomerDto,
  type CustomerFormValues,
} from '../model/customer-form.mapper';
import { CustomerAddressFields } from './customer-address-fields';
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api/error';

const FORM_FIELDS = ['name', 'phone', 'email', 'marketingConsent'] as const;

function isCustomerFormField(value: string): value is (typeof FORM_FIELDS)[number] {
  return (FORM_FIELDS as readonly string[]).includes(value);
}

const defaults: CustomerFormValues = {
  name: '',
  phone: '',
  email: '',
  marketingConsent: false,
  addresses: [],
};

/**
 * Tạo mới hoặc sửa hồ sơ khách, kèm ảnh đại diện và sổ địa chỉ.
 *
 * Sửa gửi kèm `expectedVersion` của bản ghi đang xem: hai nhân viên sửa cùng lúc thì đúng một
 * người thắng, người còn lại nhận lỗi và phải tải lại thay vì ghi đè im lặng. Địa chỉ đi cùng
 * payload hồ sơ nên cũng nằm dưới cùng một version — không có cửa sổ nào hồ sơ đã lưu mà địa chỉ
 * thì chưa.
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
  const avatarUrl = Form.useWatch('avatarUrl', form);

  // Bảng danh sách không chở địa chỉ và ảnh; phải đọc chi tiết mới prefill đủ form.
  const detail = useGetAdminCustomer(editing?.id ?? '', {
    query: { enabled: open && Boolean(editing?.id) },
  });
  const current = detail.data;
  const blocked = (current?.status ?? editing?.status) === 'INACTIVE';

  useEffect(() => {
    if (!open) return;
    if (!editing) {
      form.setFieldsValue(defaults);
      return;
    }
    if (current) form.setFieldsValue(toCustomerFormValues(current));
  }, [open, editing, current, form]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: getListAdminCustomersQueryKey() });
    if (editing) {
      await queryClient.invalidateQueries({ queryKey: getGetAdminCustomerQueryKey(editing.id) });
    }
  };

  const mutation = useMutation({
    mutationFn: (values: CustomerFormValues) =>
      editing && current
        ? updateAdminCustomer(
            editing.id,
            toUpdateCustomerDto(values, current.version, current.avatarAssetId),
          )
        : createAdminCustomer(toCreateCustomerDto(values)),
    onSuccess: async () => {
      await invalidate();
      void message.success(editing ? 'Đã cập nhật khách hàng.' : 'Đã thêm khách hàng.');
      onClose();
    },
    onError: (error) => {
      Object.entries(getApiFieldErrors(error)).forEach(([name, fieldMessage]) => {
        if (isCustomerFormField(name)) form.setFields([{ name, errors: [fieldMessage] }]);
      });
      void message.error(getApiErrorMessage(error, 'Không lưu được hồ sơ khách hàng.'));
    },
  });

  const statusOptions = {
    mutation: {
      onSuccess: async () => {
        await invalidate();
        void message.success(blocked ? 'Đã mở lại hồ sơ khách.' : 'Đã chặn hồ sơ khách.');
      },
      onError: (error: unknown) =>
        void message.error(getApiErrorMessage(error, 'Không đổi được trạng thái khách.')),
    },
  };
  const activate = useActivateAdminCustomer(statusOptions);
  const deactivate = useDeactivateAdminCustomer(statusOptions);
  const statusPending = activate.isPending || deactivate.isPending;

  /**
   * Chặn/mở là lệnh riêng của Backend (`activate`/`deactivate`), không phải một cột trong form.
   * Bấm là gửi ngay kèm version đang xem, nên người dùng không phải bấm Lưu mà vẫn không rõ hồ sơ
   * đã bị chặn hay chưa.
   */
  const toggleBlocked = (nextBlocked: boolean) => {
    if (!current) return;
    const payload = { id: current.id, data: { expectedVersion: current.version } };
    if (nextBlocked) deactivate.mutate(payload);
    else activate.mutate(payload);
  };

  const loadingDetail = Boolean(editing) && detail.isPending;

  return (
    <Drawer
      open={open}
      aria-label={editing ? `Sửa khách ${editing.customerNo}` : 'Thêm khách hàng'}
      onClose={() => (mutation.isPending ? undefined : onClose())}
      width="100%"
      styles={{ wrapper: { maxWidth: 720 } }}
      destroyOnHidden
      title={editing ? `Sửa khách ${editing.customerNo}` : 'Thêm khách hàng'}
      footer={
        <Space className="flex justify-end">
          <Button onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button
            type="primary"
            loading={mutation.isPending}
            disabled={loadingDetail}
            onClick={() => form.submit()}
          >
            Lưu
          </Button>
        </Space>
      }
    >
      {loadingDetail ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <Form
          form={form}
          layout="vertical"
          initialValues={defaults}
          disabled={mutation.isPending}
          onFinish={(values) => mutation.mutate(values)}
        >
          <div className="grid gap-x-5 sm:grid-cols-[1fr_180px]">
            <div>
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
                rules={[{ required: true, whitespace: true, message: 'Nhập số điện thoại' }]}
              >
                <Input maxLength={32} placeholder="0912345678" />
              </Form.Item>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, whitespace: true, message: 'Nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
              >
                <Input maxLength={255} placeholder="minh.anh@example.com" />
              </Form.Item>
            </div>

            <div>
              <Form.Item label="Ảnh đại diện" extra="Tải ảnh lên hoặc dán URL đã có.">
                <Form.Item name="avatarUrl" noStyle>
                  <input type="hidden" />
                </Form.Item>
                <Form.Item name="avatarAssetId" noStyle>
                  <input type="hidden" />
                </Form.Item>
                <ImageUploadField
                  value={avatarUrl ?? ''}
                  onChange={(url, assetId) =>
                    // Gắn ảnh vào hồ sơ cần media asset id; dán URL tay thì không gắn được.
                    form.setFieldsValue({ avatarUrl: url, avatarAssetId: assetId })
                  }
                />
              </Form.Item>
              <Form.Item
                name="marketingConsent"
                label="Nhận tin khuyến mãi"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              {editing && (
                <Form.Item label="Chặn hồ sơ" extra="Chặn là ngừng dùng hồ sơ, không xoá lịch sử mua.">
                  <Switch
                    checked={blocked}
                    loading={statusPending}
                    disabled={!current || statusPending}
                    onChange={toggleBlocked}
                  />
                </Form.Item>
              )}
            </div>
          </div>

          <Divider />
          <Typography.Title level={5} className="!mb-1">
            Sổ địa chỉ
          </Typography.Title>
          <Typography.Text type="secondary">
            Địa chỉ lưu cùng lúc với hồ sơ. Địa chỉ bị xoá khỏi danh sách chỉ ngừng sử dụng, đơn cũ
            vẫn tra lại được nơi đã giao.
          </Typography.Text>

          <Form.List name="addresses">
            {(fields, { add, remove }) => (
              <div className="mt-3">
                {fields.length === 0 && (
                  <Alert
                    className="mb-3"
                    type="info"
                    showIcon
                    message="Chưa có địa chỉ giao hàng"
                    description="Khách chưa có địa chỉ vẫn lưu được; thêm sau khi có đơn giao cũng không sao."
                  />
                )}
                {fields.map((field, index) => (
                  <CustomerAddressFields
                    key={field.key}
                    form={form}
                    name={field.name}
                    index={index}
                    onRemove={() => remove(field.name)}
                    onMakeDefault={() => {
                      // INVARIANT: đúng một địa chỉ mặc định — bật dòng này thì tắt mọi dòng khác.
                      const addresses = form.getFieldValue('addresses') as CustomerFormValues['addresses'];
                      form.setFieldsValue({
                        addresses: addresses.map((address, position) => ({
                          ...address,
                          isDefault: position === field.name,
                        })),
                      });
                    }}
                  />
                ))}
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  disabled={fields.length >= 10}
                  onClick={() => add(emptyCustomerAddress())}
                >
                  Thêm địa chỉ
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      )}
    </Drawer>
  );
}
