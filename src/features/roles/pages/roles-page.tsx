import { useMemo, useState } from 'react';
import { KeyOutlined, PlusOutlined, SafetyOutlined } from '@ant-design/icons';
import { Alert, App, Button, Input } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useListAdminAllRoles, useListAdminPermissions } from '@/generated/api/iam/iam';
import type { RoleDto } from '@/generated/api/iam/iam.schemas';
import { useCan, usePermissions } from '@/core/auth/permissions';
import { ManagementPage } from '@/foundation/management';
import { FilterBar, RefreshButton } from '@/foundation/table';
import { getApiErrorMessage } from '@/lib/api/error';
import { invalidateReferenceData } from '@/shared/constants/query-cache-policy';
import { RoleFormDrawer } from '../components/role-form-drawer';
import { RoleTable } from '../components/role-table';
import {
  describeRoleDeleteImpact,
  describeRoleDeleteResult,
  roleDeleteErrorMessage,
  shouldReloadAfterRoleDeleteError,
} from '../model/role-lifecycle.policy';
import { useRoleMutations } from '../hooks/use-role-mutations';

export function RolesPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const canManage = useCan('iam.role.manage');
  const actorPermissions = usePermissions();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleDto>();

  const roles = useListAdminAllRoles();
  const permissions = useListAdminPermissions();
  const rows = roles.data?.items ?? [];
  const permissionItems = useMemo(() => permissions.data?.items ?? [], [permissions.data]);

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
      await refresh();
      void message.success(describeRoleDeleteResult(result));
    },
    onDeleteError: async (error) => {
      void message.error(roleDeleteErrorMessage(error, getApiErrorMessage(error)));
      if (shouldReloadAfterRoleDeleteError(error)) await refresh();
    },
  });

  function confirmDelete(row: RoleDto) {
    let reason = '';
    modal.confirm({
      title: `Xoá vai trò ${row.code}?`,
      content: (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">{describeRoleDeleteImpact(row)}</p>
          <Input.TextArea
            rows={2}
            placeholder="Lý do (tối thiểu 3 ký tự)"
            onChange={(event) => {
              reason = event.target.value;
            }}
          />
        </div>
      ),
      okText: 'Xoá',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: () => {
        if (reason.trim().length < 3) {
          void message.error('Vui lòng nhập lý do tối thiểu 3 ký tự');
          return Promise.reject(new Error('reason-required'));
        }
        return roleMutations.deleteRole(row, reason.trim());
      },
    });
  }

  return (
    <>
      <ManagementPage
        eyebrow="Access control"
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
          />
        }
      >
        {roles.isError && (
          <Alert
            className="mb-5"
            type="error"
            showIcon
            message="Không tải được danh sách vai trò"
            description={getApiErrorMessage(roles.error)}
          />
        )}
        <RoleTable
          rows={rows}
          permissions={permissionItems}
          loading={roles.isLoading || roles.isFetching}
          canManage={canManage}
          onEdit={(row) => {
            setEditing(row);
            setFormOpen(true);
          }}
          onDelete={confirmDelete}
        />
      </ManagementPage>

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
