import { useEffect } from 'react';
import { canEditRolePermissions } from '../model/role-lifecycle.policy';
import { Alert, Drawer, Form, Input, Select, Space, Button } from 'antd';
import type { PermissionDto, RoleDto } from '@/generated/api/iam/models';
import { ROOT_ROLE_CODE } from '../constants/role.constants';
import { PermissionPicker } from './permission-picker';

export interface RoleFormValues {
  code?: string;
  name: string;
  description?: string;
  status?: RoleDto['status'];
  permissionCodes: string[];
}

export function RoleFormDrawer({
  open,
  editing,
  permissions,
  grantableCodes,
  submitting,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  editing?: RoleDto;
  permissions: PermissionDto[];
  grantableCodes: ReadonlySet<string>;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: RoleFormValues) => void;
}) {
  const [form] = Form.useForm<RoleFormValues>();
  const isEdit = Boolean(editing);
  const isSystem = editing?.system ?? false;
  const isRootRole = editing?.code === ROOT_ROLE_CODE;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (editing) {
      form.setFieldsValue({
        code: editing.code,
        name: editing.name,
        description: editing.description,
        status: editing.status,
        permissionCodes: [...editing.permissionCodes],
      });
    } else {
      form.setFieldsValue({ permissionCodes: [] });
    }
  }, [open, editing, form]);

  return (
    <Drawer
      open={open}
      width={760}
      destroyOnClose
      title={isEdit ? `Sửa vai trò — ${editing?.code}` : 'Tạo vai trò mới'}
      onClose={onCancel}
      extra={
        <Space>
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" loading={submitting} onClick={() => void form.submit()}>
            {isEdit ? 'Lưu' : 'Tạo vai trò'}
          </Button>
        </Space>
      }
    >
      {isSystem && (
        <Alert
          className="mb-4"
          type="info"
          showIcon
          message="Vai trò hệ thống"
          description={
            isRootRole
              ? 'OWNER là vai trò quản trị gốc: không ngừng hoạt động được và phải giữ nguyên toàn bộ catalog quyền. Bạn chỉ đổi được tên và mô tả.'
              : 'Mã vai trò được hệ thống tham chiếu nên không thể đổi. Có thể ngừng hoặc kích hoạt lại vai trò bằng trường Trạng thái.'
          }
        />
      )}
      <Alert
        className="mb-4"
        type="warning"
        showIcon
        message="Đổi quyền có hiệu lực ngay"
        description="Người đang đăng nhập với vai trò này sẽ phải lấy lại token; phiên hiện tại mất quyền vừa gỡ ở lần gọi API kế tiếp."
      />

      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="code"
          label="Mã vai trò"
          extra="Không đổi được sau khi tạo."
          rules={
            isEdit
              ? []
              : [
                  { required: true, message: 'Nhập mã vai trò' },
                  {
                    pattern: /^[A-Z][A-Z0-9_]{2,49}$/,
                    message: 'Viết hoa, bắt đầu bằng chữ cái, 3–50 ký tự, ví dụ WAREHOUSE_LEAD',
                  },
                ]
          }
        >
          <Input placeholder="WAREHOUSE_LEAD" maxLength={50} disabled={isEdit} />
        </Form.Item>

        <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true, message: 'Nhập tên vai trò' }]}>
          <Input maxLength={255} placeholder="Trưởng kho" />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={2} maxLength={1000} placeholder="Phụ trách nhập xuất kho tại chi nhánh" />
        </Form.Item>

        {isEdit && (
          <Form.Item name="status" label="Trạng thái">
            <Select
              disabled={isRootRole}
              options={[
                { value: 'ACTIVE', label: 'Đang dùng' },
                { value: 'INACTIVE', label: 'Ngừng dùng' },
              ]}
            />
          </Form.Item>
        )}

        <Form.Item
          name="permissionCodes"
          label="Quyền của vai trò"
          rules={[
            {
              validator: (_rule, value: string[] | undefined) =>
                value && value.length > 0
                  ? Promise.resolve()
                  : Promise.reject(new Error('Chọn ít nhất một quyền')),
            },
          ]}
        >
          {/*
            Backend từ chối mọi thay đổi tập quyền của OWNER — đây là tài khoản break-glass duy
            nhất, thu hẹp quyền của nó là tự khoá mình ra khỏi hệ thống. Khoá luôn ở form thay vì
            để người dùng bỏ tick rồi mới nhận 403: thao tác hỏng được biết trước khi bấm Lưu.
          */}
          <PermissionPicker
            permissions={permissions}
            grantableCodes={grantableCodes}
            disabled={!canEditRolePermissions(editing)}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
