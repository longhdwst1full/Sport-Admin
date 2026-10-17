import { useCallback, useMemo, useState } from 'react';
import {
  LockOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Alert, Button, Tabs } from 'antd';
import { useAuth } from '@/core/auth/auth-context';
import { useUrlFilters } from '@/shared/hooks/use-url-filters';
import { AdminTable } from '@/foundation/table';
import { useCan } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage } from '@/foundation/management';
import {
  useListAdminPermissions,
  useListAdminRoles,
  useListAdminUsers,
} from '@/generated/api/iam/iam';
import type { RoleDto, UserDto, UserRoleAssignmentDto } from '@/generated/api/iam/iam.schemas';
import { RolePermissionsDrawer } from '@/features/roles';
import { RoleAssignmentDrawer } from '../components/role-assignment-drawer';
import { RoleAssignmentRevokeModal } from '../components/role-assignment-revoke-modal';
import { StaffCreationDrawer } from '../components/staff-creation-drawer';
import { StaffLifecycleModal, type StaffLifecycleAction } from '../components/staff-lifecycle-modal';
import { useRoleColumns, useUserColumns } from '../hooks/use-access-columns';
import { useStaffMfaActions } from '../hooks/use-staff-mfa-actions';

const ACCESS_TABS = ['users', 'roles'] as const;

export function AccessPage() {
  const url = useUrlFilters();
  const [assignmentUserId, setAssignmentUserId] = useState<string>();
  const [revokeTarget, setRevokeTarget] = useState<{
    user: UserDto;
    assignment: UserRoleAssignmentDto;
  }>();
  const [staffCreationOpen, setStaffCreationOpen] = useState(false);
  const [lifecycle, setLifecycle] = useState<{ action: StaffLifecycleAction; user: UserDto }>();
  const [permissionRoleId, setPermissionRoleId] = useState<string>();
  const canViewRoles = useCan('iam.role.view');
  const canAssignRoles = useCan('iam.assignment.manage');
  const canManageUsers = useCan('iam.user.manage');
  const canManageMfa = useCan('iam.user.mfa.manage');
  const staffMfa = useStaffMfaActions();
  const usersQuery = useListAdminUsers();
  const rolesQuery = useListAdminRoles({ query: { enabled: canViewRoles } });
  const permissionsQuery = useListAdminPermissions({ query: { enabled: canViewRoles } });
  // Tab nằm trên URL để F5/gửi link giữ đúng tab; không có quyền xem vai trò thì luôn về tab người dùng.
  const requestedTab = url.getEnum('tab', ACCESS_TABS) ?? 'users';
  const activeTab = requestedTab === 'roles' && !canViewRoles ? 'users' : requestedTab;
  const users = useMemo(() => usersQuery.data?.items ?? [], [usersQuery.data]);
  // Suy ra từ query để drawer phân quyền thấy ngay assignment vừa thêm/sửa/thu hồi.
  const assignmentUser = users.find((user) => user.id === assignmentUserId);
  const { developmentBypass } = useAuth();
  const roles = rolesQuery.data?.items ?? [];
  const permissions = useMemo(() => permissionsQuery.data?.items ?? [], [permissionsQuery.data]);
  const loading =
    usersQuery.isPending || (canViewRoles && (rolesQuery.isPending || permissionsQuery.isPending));
  const userColumns = useUserColumns({
    canAssignRoles,
    canManageUsers,
    canManageMfa,
    onAssign: (user) => setAssignmentUserId(user.id),
    onRevoke: (user, assignment) => setRevokeTarget({ user, assignment }),
    onLifecycle: (action, user) => setLifecycle({ action, user }),
    staffMfa,
  });
  const permissionRole = roles.find((role) => role.id === permissionRoleId);
  const showRolePermissions = useCallback((role: RoleDto) => setPermissionRoleId(role.id), []);
  const roleColumns = useRoleColumns(users, showRolePermissions);
  const hasError =
    usersQuery.isError || (canViewRoles && (rolesQuery.isError || permissionsQuery.isError));

  return (
    <ManagementPage
      eyebrow="Danh tính & truy cập"
      title="Người dùng & phân quyền"
      description="Hệ thống có một tài khoản Admin duy nhất; Admin tạo và phân quyền BRANCH_MANAGER hoặc STAFF theo chi nhánh."
      actions={
        canManageUsers && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setStaffCreationOpen(true)}>
            Tạo nhân viên
          </Button>
        )
      }
      metrics={[
        { key: 'users', label: 'Người dùng', value: users.length, icon: <UserOutlined /> },
        {
          key: 'roles',
          label: 'Vai trò',
          value: roles.length,
          icon: <TeamOutlined />,
          tone: 'blue',
        },
        {
          key: 'permissions',
          label: 'Mã quyền',
          value: permissions.length,
          icon: <SafetyCertificateOutlined />,
          tone: 'green',
        },
        {
          key: 'locked',
          label: 'Tài khoản khóa',
          value: users.filter((user) => user.status === 'LOCKED').length,
          icon: <LockOutlined />,
          tone: 'red',
        },
      ]}
    >
      {developmentBypass && (
        <Alert
          className="mb-5"
          showIcon
          type="warning"
          message="Môi trường phát triển đang bỏ qua kiểm tra quyền ở cả giao diện và API"
          description="Chỉ dùng cho môi trường phát triển cục bộ. Staging/production bắt buộc AUTH_BYPASS=false và kiểm tra quyền/phạm vi phía server."
        />
      )}
      {hasError && (
        <div className="mb-4">
          <QueryErrorAlert
            error={usersQuery.error ?? rolesQuery.error ?? permissionsQuery.error}
            retry={() =>
              void Promise.all([
                usersQuery.refetch(),
                rolesQuery.refetch(),
                permissionsQuery.refetch(),
              ])
            }
          />
        </div>
      )}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => url.set('tab', key === 'users' ? undefined : key)}
        items={[
          {
            key: 'users',
            label: 'Người dùng',
            children: (
              <AdminTable
                rowKey="id"
                loading={loading}
                dataSource={users}
                pagination={false}
                scroll={{ x: 900 }}
                columns={userColumns}
              />
            ),
          },
          ...(canViewRoles
            ? [
                {
                  key: 'roles',
                  label: 'Vai trò & quyền',
                  children: (
                    <AdminTable
                      rowKey="id"
                      loading={loading}
                      dataSource={roles}
                      pagination={false}
                      tableLayout="fixed"
                      scroll={{ x: 960 }}
                      columns={roleColumns}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
      <RoleAssignmentDrawer
        user={assignmentUser}
        open={Boolean(assignmentUser)}
        onClose={() => setAssignmentUserId(undefined)}
        onRevoke={(assignment) => assignmentUser && setRevokeTarget({ user: assignmentUser, assignment })}
      />
      <RolePermissionsDrawer
        role={permissionRole}
        permissions={permissions}
        onClose={() => setPermissionRoleId(undefined)}
      />
      <RoleAssignmentRevokeModal target={revokeTarget} onClose={() => setRevokeTarget(undefined)} />
      <StaffCreationDrawer
        open={staffCreationOpen}
        onClose={() => setStaffCreationOpen(false)}
        onMfaProvisioned={(displayName, provisioning) =>
          staffMfa.showProvisionedQr({ title: 'QR xác thực 2 lớp cho nhân viên mới', displayName, provisioning })
        }
      />
      {staffMfa.modals}
      <StaffLifecycleModal
        action={lifecycle?.action}
        user={lifecycle?.user}
        onClose={() => setLifecycle(undefined)}
      />
    </ManagementPage>
  );
}
