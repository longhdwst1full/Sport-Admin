import { useMemo } from 'react';
import {
  DeleteOutlined,
  KeyOutlined,
  QrcodeOutlined,
  StopOutlined,
  UnlockOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { col, TableActionButton } from '@/foundation/table';
import type { RoleDto, UserDto, UserRoleAssignmentDto } from '@/generated/api/iam/iam.schemas';
import { USER_STATUS_PRESENTATION } from '../constants/access.constants';
import type { StaffLifecycleAction } from '../components/staff-lifecycle-modal';

/** Cột dữ liệu của bảng người dùng không phụ thuộc quyền/handler. */
const USER_INFO_COLUMNS: ColumnsType<UserDto> = [
  {
    title: 'Phạm vi dữ liệu',
    dataIndex: 'assignments',
    width: 180,
    render: (assignments: UserRoleAssignmentDto[]) =>
      assignments.map((assignment) => assignment.scopeType).join(', ') || 'Chưa gán',
  },
  {
    title: 'Bảo mật đăng nhập',
    width: 190,
    render: (_, user) => (
      <div>
        {user.mustChangePassword
          ? <Tag color="gold">Phải đổi mật khẩu</Tag>
          : <Tag color="green">Mật khẩu đã đổi</Tag>}
        <div className="mt-1 text-xs text-slate-500">
          Sai liên tiếp: {user.failedLoginAttempts}/5
        </div>
        {user.lockReason && (
          <div className="mt-1 text-xs text-red-600">Lý do: {user.lockReason}</div>
        )}
      </div>
    ),
  },
  col.text<UserDto>('permissionVersion', 'Permission version', { align: 'center', width: 150 }),
  col.status<UserDto, UserDto['status']>('status', 'Trạng thái', USER_STATUS_PRESENTATION, { width: 140 }),
];

const USER_IDENTITY_COLUMN: ColumnsType<UserDto>[number] = {
  title: 'Người dùng',
  dataIndex: 'displayName',
  width: 240,
  render: (value: string, row) => (
    <Space>
      <Avatar>{value.slice(0, 1)}</Avatar>
      <div>
        <Typography.Text strong>{value}</Typography.Text>
        <div className="text-xs text-slate-500">{row.maskedEmail}</div>
      </div>
    </Space>
  ),
};

interface UserColumnOptions {
  canAssignRoles: boolean;
  canManageUsers: boolean;
  canManageMfa: boolean;
  onAssign: (user: UserDto) => void;
  onRevoke: (user: UserDto, assignment: UserRoleAssignmentDto) => void;
  onLifecycle: (action: StaffLifecycleAction, user: UserDto) => void;
  staffMfa: {
    viewQr: (user: UserDto) => void;
    reissueQr: (user: UserDto) => void;
    resetMfa: (user: UserDto) => void;
  };
}

/**
 * Cột bảng người dùng. PERMISSION: nút thu hồi/phân quyền/2FA/vòng đời chỉ là affordance theo quyền
 * hiện tại; API vẫn chặn. Tài khoản OWNER không có thao tác.
 */
export function useUserColumns({
  canAssignRoles,
  canManageUsers,
  canManageMfa,
  onAssign,
  onRevoke,
  onLifecycle,
  staffMfa,
}: UserColumnOptions) {
  return useMemo<ColumnsType<UserDto>>(
    () => [
      USER_IDENTITY_COLUMN,
      {
        title: 'Vai trò',
        dataIndex: 'assignments',
        width: 210,
        render: (assignments: UserRoleAssignmentDto[], user: UserDto) => (
          <Space size={[4, 4]} wrap>
            {assignments.map((assignment) => (
              <Space.Compact key={assignment.id}>
                <Tag color="blue" style={{ marginInlineEnd: 0 }}>{assignment.roleCode}</Tag>
                {canAssignRoles && assignment.roleCode !== 'OWNER' && (
                  <Button size="small" danger type="link" onClick={() => onRevoke(user, assignment)}>
                    Thu hồi
                  </Button>
                )}
              </Space.Compact>
            ))}
          </Space>
        ),
      },
      ...USER_INFO_COLUMNS,
      ...(canAssignRoles || canManageUsers || canManageMfa
        ? [
            col.actions<UserDto>(
              (user) => {
                const isOwner = user.assignments.some(({ roleCode }) => roleCode === 'OWNER');
                return (
                  <>
                    {canAssignRoles && !isOwner && (
                      <TableActionButton
                        label={`Phân quyền cho ${user.displayName}`}
                        icon={<UserSwitchOutlined />}
                        onClick={() => onAssign(user)}
                      />
                    )}
                    {canManageMfa && !isOwner && user.userType === 'STAFF' && (
                      <>
                        <TableActionButton
                          label={`Xem QR 2FA của ${user.displayName}`}
                          icon={<QrcodeOutlined />}
                          onClick={() => staffMfa.viewQr(user)}
                        />
                        <TableActionButton
                          label={`Cấp lại QR 2FA cho ${user.displayName}`}
                          icon={<KeyOutlined />}
                          onClick={() => staffMfa.reissueQr(user)}
                        />
                        <TableActionButton
                          label={`Đặt lại 2FA của ${user.displayName}`}
                          danger
                          icon={<StopOutlined />}
                          onClick={() => staffMfa.resetMfa(user)}
                        />
                      </>
                    )}
                    {canManageUsers && !isOwner && user.status === 'ACTIVE' && (
                      <TableActionButton
                        label={`Xóa tài khoản ${user.displayName}`}
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => onLifecycle('DELETE', user)}
                      />
                    )}
                    {canManageUsers && !isOwner && user.status === 'LOCKED' && (
                      <TableActionButton
                        label={`Mở khóa ${user.displayName}`}
                        icon={<UnlockOutlined />}
                        onClick={() => onLifecycle('UNLOCK', user)}
                      />
                    )}
                  </>
                );
              },
              { title: '', width: canManageMfa ? 200 : 130, align: undefined },
            ),
          ]
        : []),
    ],
    [canAssignRoles, canManageMfa, canManageUsers, onAssign, onLifecycle, onRevoke, staffMfa],
  );
}

const ROLE_INFO_COLUMNS: ColumnsType<RoleDto> = [
  {
    title: 'Vai trò',
    dataIndex: 'name',
    width: 220,
    render: (value: string, row) => (
      <div>
        <strong>{value}</strong>
        <div className="text-xs text-slate-500">{row.description}</div>
      </div>
    ),
  },
  {
    title: 'Loại',
    dataIndex: 'system',
    width: 120,
    render: (system: boolean) => <Tag>{system ? 'Hệ thống' : 'Tùy chỉnh'}</Tag>,
  },
];

const ROLE_PERMISSION_COLUMN: ColumnsType<RoleDto>[number] = {
  title: 'Permission keys',
  dataIndex: 'permissionCodes',
  render: (values: string[]) => (
    <Space size={[4, 4]} wrap>
      {values.map((value) => (
        <Tag key={value}>{value}</Tag>
      ))}
    </Space>
  ),
};

/** Cột bảng vai trò; số người dùng của vai trò đếm trên danh sách người dùng đang tải. */
export function useRoleColumns(users: readonly UserDto[]) {
  return useMemo<ColumnsType<RoleDto>>(
    () => [
      ...ROLE_INFO_COLUMNS,
      {
        title: 'Người dùng',
        key: 'users',
        align: 'center',
        width: 110,
        render: (_, role) =>
          users.filter((user) => user.assignments.some((assignment) => assignment.roleId === role.id)).length,
      },
      ROLE_PERMISSION_COLUMN,
    ],
    [users],
  );
}
