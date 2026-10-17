import { Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { StatusTag } from '@/foundation/management/status-tag';
import { AdminTable, TableActionButton, col } from '@/foundation/table';
import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { RoleStatus, type RoleDto } from '@/generated/api/iam/iam.schemas';
import { ROLE_STATUS_PRESENTATION } from '../constants/role.constants';
import { getRoleDeleteState } from '../model/role-lifecycle.policy';
import { PermissionCodesCell } from './permission-codes-cell';

export function RoleTable({
  rows,
  loading,
  canManage,
  onEdit,
  onDelete,
  onShowPermissions,
}: {
  rows: RoleDto[];
  loading: boolean;
  canManage: boolean;
  onEdit: (row: RoleDto) => void;
  onDelete: (row: RoleDto) => void;
  /** Mở drawer cây quyền theo màn hình (chỉ đọc, không cần `iam.role.manage`). */
  onShowPermissions: (row: RoleDto) => void;
}) {
  const columns = useMemo<ColumnsType<RoleDto>>(
    () => [
      {
        title: 'Vai trò',
        dataIndex: 'name',
        width: 260,
        render: (_value, row) => (
          <div>
            <div className="flex flex-wrap items-center gap-2 font-medium">
              {row.name}
              {row.system && <Tag className="!m-0">Hệ thống</Tag>}
              {row.status === RoleStatus.INACTIVE && (
                <StatusTag status={row.status} presentations={ROLE_STATUS_PRESENTATION} />
              )}
            </div>
            <Typography.Text type="secondary" className="text-xs">
              {row.code}
            </Typography.Text>
          </div>
        ),
      },
      col.text<RoleDto>('description', 'Mô tả', { width: 260, ellipsis: true }),
      {
        title: 'Số quyền',
        key: 'permissionCount',
        width: 96,
        align: 'center',
        render: (_value, row) => row.permissionCodes.length,
      },
      {
        title: 'Mã quyền',
        key: 'permissionCodes',
        width: 120,
        render: (_value, row) => (
          <PermissionCodesCell codes={row.permissionCodes} onShowMore={() => onShowPermissions(row)} />
        ),
      },
      col.actions<RoleDto>(
        (row) => {
          const deleteState = getRoleDeleteState(row);
          return (
            <>
              <TableActionButton
                label={`Xem chi tiết quyền của ${row.name}`}
                icon={<EyeOutlined />}
                onClick={() => onShowPermissions(row)}
              />
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
        { title: '', width: 136 },
      ),
    ],
    [canManage, onDelete, onEdit, onShowPermissions],
  );

  return (
    <AdminTable<RoleDto>
      rowKey="id"
      loading={loading}
      dataSource={rows}
      pagination={false}
      tableLayout="fixed"
      scroll={{ x: 1180 }}
      columns={columns}
    />
  );
}
