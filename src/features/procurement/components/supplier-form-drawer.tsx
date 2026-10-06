import { App, Form, Input } from 'antd';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListSuppliersQueryKey,
  useCreateSupplier,
  useUpdateSupplier,
} from '@/generated/api/procurement/procurement';
import type { CreateSupplierDto, SupplierDto } from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { FormDrawer } from '@/foundation/overlay';

type SupplierForm = Omit<CreateSupplierDto, 'address'> & {
  provinceName?: string;
  districtName?: string;
  wardName?: string;
  addressLine?: string;
};

export function SupplierFormDrawer({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing?: SupplierDto;
  onClose: () => void;
}) {
  const [form] = Form.useForm<SupplierForm>();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const done = async (text: string) => {
    await queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
    void message.success(text);
    form.resetFields();
    onClose();
  };
  const failed = (error: unknown) => void message.error(getApiErrorMessage(error, 'Không lưu được nhà cung cấp.'));
  const create = useCreateSupplier({ mutation: { onSuccess: () => void done('Đã tạo nhà cung cấp.'), onError: failed } });
  const update = useUpdateSupplier({ mutation: { onSuccess: () => void done('Đã cập nhật nhà cung cấp.'), onError: failed } });

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(editing ? {
      code: editing.code,
      name: editing.name,
      taxCode: editing.taxCode ?? undefined,
      phone: editing.phone ?? undefined,
      email: editing.email ?? undefined,
      contactName: editing.contactName ?? undefined,
      note: editing.note ?? undefined,
      provinceName: editing.address?.province ?? undefined,
      districtName: editing.address?.district ?? undefined,
      wardName: editing.address?.ward ?? undefined,
      addressLine: editing.address?.addressLine ?? undefined,
    } : { code: '', name: '' });
  }, [editing, form, open]);

  const submit = (values: SupplierForm) => {
    const address = values.addressLine || values.provinceName || values.districtName || values.wardName
      ? {
          addressLine: values.addressLine || null,
          ward: values.wardName || null,
          district: values.districtName || null,
          province: values.provinceName || null,
        }
      : undefined;
    if (editing) {
      update.mutate({ id: editing.id, data: {
        expectedVersion: editing.version,
        name: values.name.trim(),
        taxCode: values.taxCode?.trim() || null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        contactName: values.contactName?.trim() || null,
        note: values.note?.trim() || null,
        address: address ?? null,
      } });
      return;
    }
    create.mutate({ data: {
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      taxCode: values.taxCode?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      email: values.email?.trim() || undefined,
      contactName: values.contactName?.trim() || undefined,
      note: values.note?.trim() || undefined,
      address,
    } });
  };

  const pending = create.isPending || update.isPending;
  return (
    <FormDrawer
      title={editing ? `Sửa nhà cung cấp ${editing.code}` : 'Thêm nhà cung cấp'}
      open={open}
      onClose={onClose}
      onSubmit={() => form.submit()}
      submitting={pending}
      isDirty={() => form.isFieldsTouched()}
    >
      <Form form={form} layout="vertical" onFinish={submit} disabled={pending}>
        <div className="grid gap-x-4 md:grid-cols-2">
          <Form.Item name="code" label="Mã nhà cung cấp" rules={[{ required: true }, { pattern: /^[A-Za-z0-9][A-Za-z0-9_-]*$/, message: 'Chỉ dùng chữ, số, _ và -' }]}>
            <Input disabled={Boolean(editing)} maxLength={40} />
          </Form.Item>
          <Form.Item name="name" label="Tên nhà cung cấp" rules={[{ required: true, whitespace: true }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="taxCode" label="Mã số thuế"><Input maxLength={32} /></Form.Item>
          <Form.Item name="contactName" label="Người liên hệ"><Input maxLength={255} /></Form.Item>
          <Form.Item name="phone" label="Số điện thoại"><Input maxLength={32} /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input maxLength={255} /></Form.Item>
          <Form.Item name="provinceName" label="Tỉnh/thành"><Input /></Form.Item>
          <Form.Item name="districtName" label="Quận/huyện"><Input /></Form.Item>
          <Form.Item name="wardName" label="Phường/xã"><Input /></Form.Item>
          <Form.Item name="addressLine" label="Địa chỉ chi tiết"><Input /></Form.Item>
        </div>
        <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={3} maxLength={2000} showCount /></Form.Item>
      </Form>
    </FormDrawer>
  );
}
