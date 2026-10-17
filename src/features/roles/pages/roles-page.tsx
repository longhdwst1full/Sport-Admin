import { useMemo, useState } from 'react';
import { KeyOutlined, PlusOutlined, SafetyOutlined } from '@ant-design/icons';
import { App, Button } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useListAdminAllRoles, useListAdminPermissions } from '@/generated/api/iam/iam';
import type { RoleDto } from '@/generated/api/iam/iam.schemas';
import { useCan, usePermissions } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { SearchInput } from '@/foundation/inputs/search-input';
import { ManagementPage } from '@/foundation/management';
import { FilterBar, RefreshButton } from '@/foundation/table';
import { getApiErrorMessage } from '@/lib/api/error';
import { invalidateReferenceData } from '@/shared/constants/query-cache-policy';
import { useUrlSearch } from '@/shared/hooks/use-url-search';
import { RoleDeleteModal } from '../components/role-delete-modal';
import { RoleFormDrawer } from '../components/role-form-drawer';
import { RolePermissionsDrawer } from '../components/role-permissions-drawer';
import { RoleTable } from '../components/role-table';
import {
  describeRoleDeleteResult,
  roleDeleteErrorMessage,
  shouldReloadAfterRoleDeleteError,
} from '../model/role-lifecycle.policy';
import { useRoleMutations } from '../hooks/use-role-mutations';

export function RolesPage() {
  const { message } = App.useApp();
  // Danh sách vai trò trả trọn một lần; ô tìm lọc tại chỗ theo tên/mã và nằm trên URL (`q`).
  const search = useUrlSearch(['q']);
  const keyword = (search.url.get('q') ?? '').toLocaleLowerCase('vi');
  const queryClient = useQueryClient();
  const canManage = useCan('iam.role.manage');
  const actorPermissions = usePermissions();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleDto>();
  // Lưu id thay vì DTO để drawer luôn đọc bản mới nhất sau khi refetch.
  const [viewingRoleId, setViewingRoleId] = useState<string>();
  const [deleting, setDeleting] = useState<RoleDto>();

  const roles = useListAdminAllRoles();
  const permissions = useListAdminPermissions();
  const rows = useMemo(
    () =>
      (roles.data?.items ?? []).filter(
        (role) => !keyword || `${role.name} ${role.code}`.toLocaleLowerCase('vi').includes(keyword),
      ),
    [roles.data, keyword],
  );
  const permissionItems = useMemo(() => permissions.data?.items ?? [], [permissions.data]);
  const viewingRole = roles.data?.items.find((role) => role.id === viewingRoleId);

  /**
   * API chặn cấp quyền vượt quá quyền của chính người thao tác. Khi sửa một vai trò,
   * quyền vai trò đã có vẫn giữ được, nên cộng vào tập cấp được để không buộc
   * người sửa phải có toàn quyền mới đổi được tên.
   */
  const grantableCodes = useMemo(() => {
    const codes = new Set(
      permissionItems.filter(({ code }) => actorPermissions.has(code)).map(({ code }) => code),
    );
    for (const code of editing?.permissionCodes ?? []) codes.add(code);
    return codes;
  }, [permissionItems, actorPermissions, editing]);

  async function refresh() {
    // Mọi danh sách vai trò (cache dài), không chỉ bảng của trang này. Quyền của chính người thao
    // tác (`/auth/me`) do AuthProvider làm mới theo mutationKey của hook SDK.
    await invalidateReferenceData(queryClient, 'roles');
  }

  const roleMutations = useRoleMutations({
    onSaved: async (mode) => {
      await refresh();
      void message.success(mode === 'update' ? 'Đã cập nhật vai trò' : 'Đã tạo vai trò');
      setFormOpen(false);
      setEditing(undefined);
    },
    onSaveError: (error) => void message.error(getApiErrorMessage(error)),
    onDeleted: async (result) => {
      // Tra tên vai trò nhận người giữ TRƯỚC khi tải lại danh sách.
      const fallbackRole = roles.data?.items.find(({ id }) => id === result.fallbackRoleId);
      await refresh();
      void message.success(
        describeRoleDeleteResult(result, fallbackRole && `${fallbackRole.name} (${fallbackRole.code})`),
      );
    },
    onDeleteError: async (error) => {
      void message.error(roleDeleteErrorMessage(error, getApiErrorMessage(error)));
      if (shouldReloadAfterRoleDeleteError(error)) await refresh();
    },
  });

  return (
    <>
      <ManagementPage
        eyebrow="Danh tính & truy cập"
        title="Vai trò & phân quyền"
        description="Tạo vai trò riêng cho cửa hàng và tích chọn đúng những gì vai trò đó được làm."
        metrics={[
          {
            key: 'roles',
            label: 'Vai trò',
            value: roles.data?.total ?? 0,
            icon: <SafetyOutlined />,
            tone: 'blue',
          },
          {
            key: 'permissions',
            label: 'Quyền khả dụng',
            value: permissions.data?.total ?? 0,
            icon: <KeyOutlined />,
            tone: 'green',
          },
        ]}
        filters={
          <FilterBar
            actions={
              <>
                <RefreshButton onRefresh={roles.refetch} loading={roles.isFetching} />
                {canManage && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditing(undefined);
                      setFormOpen(true);
                    }}
                  >
                    Tạo vai trò
                  </Button>
                )}
              </>
            }
          >
            <SearchInput value={search.values.q} onChange={search.setter('q')} placeholder="Tìm theo tên hoặc mã vai trò" />
          </FilterBar>
        }
      >
        {roles.isError && <QueryErrorAlert error={roles.error} retry={() => void roles.refetch()} />}
        <RoleTable
          rows={rows}
          loading={roles.isLoading || roles.isFetching}
          canManage={canManage}
          onEdit={(row) => {
            setEditing(row);
            setFormOpen(true);
          }}
          onDelete={setDeleting}
          onShowPermissions={(row) => setViewingRoleId(row.id)}
        />
      </ManagementPage>

      <RolePermissionsDrawer
        role={viewingRole}
        permissions={permissionItems}
        onClose={() => setViewingRoleId(undefined)}
      />

      <RoleDeleteModal
        target={deleting}
        submitting={roleMutations.deleting}
        onClose={() => setDeleting(undefined)}
        roles={roles.data?.items ?? []}
        onSubmit={roleMutations.deleteRole}
      />

      <RoleFormDrawer
        open={formOpen}
        editing={editing}
        permissions={permissionItems}
        grantableCodes={grantableCodes}
        submitting={roleMutations.saving}
        onCancel={() => {
          setFormOpen(false);
          setEditing(undefined);
        }}
        onSubmit={(values) => roleMutations.save(values, editing)}
      />
    </>
  );
}
