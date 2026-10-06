import { Tag, Tree, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { AdminTable, TableActionButton, col } from '@/foundation/table';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { PermissionDto, RoleDto } from '@/generated/api/iam/iam.schemas';
import { permissionActionLabels } from '../constants/role.constants';
import { buildPermissionTree } from '../model/permission-tree';
import { getRoleDeleteState } from '../model/role-lifecycle.policy';
import { buildMenuVisibility } from '../model/menu-visibility';

/** Xem trước menu vai trò sẽ thấy — cùng hàm lọc với sidebar nên không lệch thực tế. */
function RoleMenuPreview({ row }: { row: RoleDto }) {
  const items = buildMenuVisibility(new Set(row.permissionCodes)).flatMap((group) =>
    group.items.filter((item) => item.visible),
  );
  if (items.length === 0) {
    return <Typography.Text type="secondary">Không thấy mục menu nào</Typography.Text>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Tag key={item.path}>{item.label}</Tag>
      ))}
    </div>
  );
}

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
  const columns = useMemo<ColumnsType<RoleDto>>(
    () => [
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
      col.text<RoleDto>('description', 'Mô tả', { width: 360, ellipsis: true }),
      {
        title: 'Số quyền',
        dataIndex: 'permissionCodes',
        width: 110,
        align: 'center',
        render: (codes: string[]) => codes.length,
      },
      col.actions<RoleDto>(
        (row) => {
          const deleteState = getRoleDeleteState(row);
          return (
            <>
              <TableActionButton label={`Sửa vai trò ${row.name}`} icon={<EditOutlined />} disabled={!canManage} onClick={() => onEdit(row)} />
              <TableActionButton
                label={deleteState.label}
                danger
                icon={<DeleteOutlined />}
                disabled={!canManage || !deleteState.allowed}
                onClick={() => onDelete(row)}
              />
            </>
          );
        },
        { title: '', width: 100 },
      ),
    ],
    [canManage, onDelete, onEdit],
  );

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
              Menu sẽ hiển thị
            </div>
            <div className="mb-3">
              <RoleMenuPreview row={row} />
            </div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quyền theo màn hình
            </div>
            <Tree selectable={false} defaultExpandAll treeData={rolePermissionTree(row, permissions)} />
          </div>
        ),
        rowExpandable: (row) => row.permissionCodes.length > 0,
      }}
      columns={columns}
    />
  );
}
