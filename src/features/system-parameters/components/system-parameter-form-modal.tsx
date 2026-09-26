import { useEffect } from 'react';
import { Alert, Form, Input, InputNumber, Modal, Select, Switch, Typography } from 'antd';
import type { SystemParameterDto } from '@/generated/api/system/system.schemas';
import {
  parameterGroupLabels,
  parameterValueTypeLabels,
} from '../constants/system-parameter.constants';

export interface ParameterFormValues {
  code?: string;
  groupCode?: string;
  label?: string;
  description?: string;
  valueType?: string;
  value?: string;
  minValue?: number;
  maxValue?: number;
  unit?: string;
  isPublic?: boolean;
  reason?: string;
}

/**
 * Một modal cho cả tạo mới và sửa.
 *
 * Khi sửa tham số hệ thống: chỉ mở ô giá trị và lý do tuỳ chọn. Mã, kiểu và khoảng hợp lệ
 * do catalog trong code định nghĩa — cho sửa ở đây thì service sẽ không còn tìm
 * thấy tham số nó đang đọc.
 */
export function SystemParameterFormModal({
  open,
  editing,
  submitting,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  editing?: SystemParameterDto;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: ParameterFormValues) => void;
}) {
  const [form] = Form.useForm<ParameterFormValues>();
  const isEdit = Boolean(editing);
  const isSystem = editing?.isSystem ?? false;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (editing) {
      form.setFieldsValue({
        code: editing.code,
        groupCode: editing.groupCode,
        label: editing.label,
        description: editing.description ?? undefined,
        valueType: editing.valueType,
        value: editing.value,
        minValue: editing.minValue ?? undefined,
        maxValue: editing.maxValue ?? undefined,
        unit: editing.unit ?? undefined,
        isPublic: editing.isPublic,
      });
    }
  }, [open, editing, form]);

  return (
    <Modal
      open={open}
      title={isEdit ? `Sửa tham số — ${editing?.code}` : 'Tạo tham số tuỳ biến'}
      okText={isEdit ? 'Lưu' : 'Tạo'}
      cancelText="Hủy"
      confirmLoading={submitting}
      onCancel={onCancel}
      onOk={() => void form.submit()}
      destroyOnClose
      width={620}
    >
      {isSystem && (
        <Alert
          className="mb-4"
          type="info"
          showIcon
          message="Tham số hệ thống"
          description="Code đang đọc tham số này theo mã. Chỉ sửa được giá trị; mã, kiểu và khoảng hợp lệ do catalog trong mã nguồn quyết định."
        />
      )}
      {!isEdit && (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          message="Tham số tuỳ biến không được code sử dụng"
          description="Đây chỉ là chỗ lưu giá trị vận hành. Muốn một tham số ảnh hưởng tới nghiệp vụ thì phải khai báo trong catalog ở mã nguồn."
        />
      )}

      <Form form={form} layout="vertical" onFinish={onSubmit}>
        {!isEdit && (
          <>
            <Form.Item
              name="code"
              label="Mã tham số"
              rules={[
                { required: true, message: 'Nhập mã tham số' },
                { pattern: /^[A-Z][A-Z0-9_]*$/, message: 'Viết hoa, dùng gạch dưới, ví dụ SUPPORT_SLA_HOURS' },
              ]}
            >
              <Input placeholder="SUPPORT_SLA_HOURS" maxLength={64} />
            </Form.Item>
            <Form.Item name="groupCode" label="Nhóm" rules={[{ required: true, message: 'Chọn nhóm' }]}>
              <Select
                options={Object.entries(parameterGroupLabels).map(([value, label]) => ({ value, label }))}
              />
            </Form.Item>
            <Form.Item name="label" label="Tên hiển thị" rules={[{ required: true, message: 'Nhập tên' }]}>
              <Input maxLength={255} />
            </Form.Item>
            <Form.Item name="description" label="Mô tả">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="valueType" label="Kiểu giá trị" rules={[{ required: true, message: 'Chọn kiểu' }]}>
              <Select
                options={Object.entries(parameterValueTypeLabels).map(([value, label]) => ({ value, label }))}
              />
            </Form.Item>
            <div className="flex gap-3">
              <Form.Item name="minValue" label="Nhỏ nhất" className="flex-1">
                <InputNumber className="w-full" />
              </Form.Item>
              <Form.Item name="maxValue" label="Lớn nhất" className="flex-1">
                <InputNumber className="w-full" />
              </Form.Item>
              <Form.Item name="unit" label="Đơn vị" className="flex-1">
                <Input maxLength={32} placeholder="giờ, VND, km" />
              </Form.Item>
            </div>
            <Form.Item name="isPublic" label="Cho Storefront đọc" valuePropName="checked">
              <Switch />
            </Form.Item>
          </>
        )}

        <Form.Item
          name="value"
          label="Giá trị"
          extra={
            editing && (editing.minValue !== null || editing.maxValue !== null) ? (
              <Typography.Text type="secondary" className="text-xs">
                Khoảng hợp lệ: {editing.minValue ?? '−∞'} … {editing.maxValue ?? '∞'}
                {editing.unit ? ` ${editing.unit}` : ''} · Mặc định: {editing.defaultValue}
              </Typography.Text>
            ) : undefined
          }
          rules={[{ required: true, message: 'Nhập giá trị' }]}
        >
          <Input maxLength={500} />
        </Form.Item>

        {isEdit && (
          <Form.Item
            name="reason"
            label="Lý do thay đổi"
            rules={[{ min: 5, message: 'Nếu nhập lý do' }]}
          >
            <Input.TextArea rows={2} placeholder="Ví dụ: điều chỉnh biểu phí theo giá xăng quý 4" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
