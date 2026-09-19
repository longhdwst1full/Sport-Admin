import { Tag, Tree, Typography } from 'antd';
import { AdminTable, TableActionButton, TableActions } from '@/foundation/table';
import { DeleteOutlined, EditOutlined, StopOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { PermissionDto, RoleDto } from '@/generated/api/iam/models';
import { permissionActionLabels, ROOT_ROLE_CODE } from '../constants/role.constants';
import { buildPermissionTree } from '../model/permission-tree';
import { getRoleRemovalMode } from '../model/role-lifecycle.policy';

function rolePermissionTree(row: RoleDto, permissions: PermissionDto[]): DataNode[] {
  const selected = new Set(row.permissionCodes);
  return buildPermissionTree(permissions.filter(({ code }) => selected.has(code))).map((group) => ({
    key: `group:${group.key}`,
    title: <span className="font-semibold text-slate-700">{group.label}</span>,
    children: group.screens.map((screen) => ({
      key: `screen:${group.key}:${screen.key}`,
      title: <span className="font-medium text-slate-700">{screen.label}</span>,
      children: screen.permissions.map((permission) => ({
        key: permission.code,
        title: (
          <span className="text-sm text-slate-600">
            {permissionActionLabels[permission.action] ?? permission.action}
            <Typography.Text type="secondary" className="ml-2 !text-xs">
              {permission.code}
            </Typography.Text>
          </span>
        ),
        isLeaf: true,
      })),
    })),
  }));
}

export function RoleTable({
  rows,
  permissions,
  loading,
  canManage,
  onEdit,
  onDelete,
}: {
  rows: RoleDto[];
  permissions: PermissionDto[];
  loading: boolean;
  canManage: boolean;
  onEdit: (row: RoleDto) => void;
  onDelete: (row: RoleDto) => void;
}) {
  return (
    <AdminTable<RoleDto>
      rowKey="id"
      loading={loading}
      dataSource={rows}
      pagination={false}
      tableLayout="fixed"
      scroll={{ x: 960 }}
      expandable={{
        expandedRowRender: (row) => (
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quyền theo màn hình
            </div>
            <Tree selectable={false} defaultExpandAll treeData={rolePermissionTree(row, permissions)} />
          </div>
        ),
        rowExpandable: (row) => row.permissionCodes.length > 0,
      }}
      columns={[
        {
          title: 'Vai trò',
          dataIndex: 'name',
          width: 280,
          render: (_value, row) => (
            <div>
              <div className="font-medium">
                {row.name}
                {row.system && (
                  <Tag color="blue" className="ml-2">
                    Hệ thống
                  </Tag>
                )}
                {row.status === 'INACTIVE' && (
                  <Tag color="default" className="ml-2">
                    Ngừng dùng
                  </Tag>
                )}
              </div>
              <Typography.Text type="secondary" className="text-xs">
                {row.code}
              </Typography.Text>
            </div>
          ),
        },
        {
          title: 'Mô tả',
          dataIndex: 'description',
          width: 360,
          ellipsis: true,
          render: (value: string | undefined) => value ?? '—',
        },
        {
          title: 'Số quyền',
          dataIndex: 'permissionCodes',
          width: 110,
          align: 'center',
          render: (codes: string[]) => codes.length,
        },
        {
          title: '',
          key: 'actions',
          width: 100,
          fixed: 'right',
          align: 'right',
          render: (_value, row) => {
            const removalMode = getRoleRemovalMode(row);
            return (
              <TableActions>
              <TableActionButton label={`Sửa vai trò ${row.name}`} icon={<EditOutlined />} disabled={!canManage} onClick={() => onEdit(row)} />
              <TableActionButton
                label={
                  row.code === ROOT_ROLE_CODE
                    ? 'OWNER phải luôn hoạt động để tránh khóa toàn hệ thống'
                    : row.system
                      ? removalMode === 'BLOCKED'
                        ? 'Vai trò đã ngừng; dùng Sửa để kích hoạt lại'
                        : 'Ngừng sử dụng vai trò hệ thống'
                      : 'Xóa vai trò tự tạo chưa được gán'
                }
                  danger
                  icon={row.system ? <StopOutlined /> : <DeleteOutlined />}
                  disabled={
                    !canManage
                    || removalMode === 'BLOCKED'
                  }
                  onClick={() => onDelete(row)}
                />
              </TableActions>
            );
          },
        },
      ]}
    />
  );
}
