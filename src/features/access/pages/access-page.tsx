import { useMemo, useState } from 'react';
import {
  LockOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Alert, Button, Tabs } from 'antd';
import { useAuth } from '@/core/auth/auth-context';
import { AdminTable } from '@/foundation/table';
import { useCan } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage } from '@/foundation/management';
import {
  useListAdminPermissions,
  useListAdminRoles,
  useListAdminUsers,
} from '@/generated/api/iam/iam';
import type { UserDto, UserRoleAssignmentDto } from '@/generated/api/iam/iam.schemas';
import { RoleAssignmentDrawer } from '../components/role-assignment-drawer';
import { RoleAssignmentRevokeModal } from '../components/role-assignment-revoke-modal';
import { StaffCreationDrawer } from '../components/staff-creation-drawer';
import { StaffLifecycleModal, type StaffLifecycleAction } from '../components/staff-lifecycle-modal';
import { useRoleColumns, useUserColumns } from '../hooks/use-access-columns';
import { useStaffMfaActions } from '../hooks/use-staff-mfa-actions';

export function AccessPage() {
  const [activeTab, setActiveTab] = useState('users');
  const [assignmentUserId, setAssignmentUserId] = useState<string>();
  const [revokeTarget, setRevokeTarget] = useState<{
    user: UserDto;
    assignment: UserRoleAssignmentDto;
  }>();
  const [staffCreationOpen, setStaffCreationOpen] = useState(false);
  const [lifecycle, setLifecycle] = useState<{ action: StaffLifecycleAction; user: UserDto }>();
  const canViewRoles = useCan('iam.role.view');
  const canAssignRoles = useCan('iam.assignment.manage');
  const canManageUsers = useCan('iam.user.manage');
  const canManageMfa = useCan('iam.user.mfa.manage');
  const staffMfa = useStaffMfaActions();
  const usersQuery = useListAdminUsers();
  const rolesQuery = useListAdminRoles({ query: { enabled: canViewRoles } });
  const permissionsQuery = useListAdminPermissions({ query: { enabled: canViewRoles } });
  const users = useMemo(() => usersQuery.data?.items ?? [], [usersQuery.data]);
  // Suy ra từ query để drawer phân quyền thấy ngay assignment vừa thêm/sửa/thu hồi.
  const assignmentUser = users.find((user) => user.id === assignmentUserId);
  const { developmentBypass } = useAuth();
  const roles = rolesQuery.data?.items ?? [];
  const permissions = permissionsQuery.data?.items ?? [];
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
  const roleColumns = useRoleColumns(users);
  const hasError =
    usersQuery.isError || (canViewRoles && (rolesQuery.isError || permissionsQuery.isError));

  return (
    <ManagementPage
      eyebrow="Identity & access"
      title="Người dùng & phân quyền"
      description="Hệ thống có một tài khoản Admin duy nhất; Admin tạo và phân quyền BRANCH_MANAGER hoặc STAFF theo chi nhánh."
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
          label: 'Permission codes',
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
      {canManageUsers && (
        <div className="mb-4 flex justify-end">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setStaffCreationOpen(true)}>
            Tạo nhân viên
          </Button>
        </div>
      )}
      {developmentBypass && (
        <Alert
          className="mb-5"
          showIcon
          type="warning"
          message="Development đang mở bypass ở cả giao diện và API"
          description="Chỉ dùng cho local development. Staging/production bắt buộc AUTH_BYPASS=false và kiểm tra permission/scope phía server."
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
        onChange={setActiveTab}
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
                      scroll={{ x: 900 }}
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
