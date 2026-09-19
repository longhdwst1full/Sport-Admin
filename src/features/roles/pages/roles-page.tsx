import { useMemo, useState } from 'react';
import { KeyOutlined, PlusOutlined, ReloadOutlined, SafetyOutlined } from '@ant-design/icons';
import { Alert, App, Button, Input } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAdminRole,
  deleteAdminRole,
  getListAdminAllRolesQueryKey,
  updateAdminRole,
  useListAdminAllRoles,
  useListAdminPermissions,
} from '@/generated/api/iam/iam';
import type { RoleDto } from '@/generated/api/iam/models';
import { useCan, usePermissions } from '@/core/auth/permissions';
import { ManagementPage } from '@/foundation/management';
import { getApiErrorMessage } from '@/lib/api/error';
import { RoleFormDrawer, type RoleFormValues } from '../components/role-form-drawer';
import { RoleTable } from '../components/role-table';
import { getRoleRemovalMode } from '../model/role-lifecycle.policy';

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
    await queryClient.invalidateQueries({ queryKey: getListAdminAllRolesQueryKey() });
  }

  const saveMutation = useMutation({
    mutationFn: (values: RoleFormValues) => {
      if (editing) {
        return updateAdminRole(editing.id, {
          name: values.name,
          description: values.description,
          status: values.status,
          permissionCodes: values.permissionCodes,
          expectedVersion: editing.version,
        });
      }
      return createAdminRole({
        code: values.code!.trim().toUpperCase(),
        name: values.name,
        description: values.description,
        permissionCodes: values.permissionCodes,
      });
    },
    onSuccess: async () => {
      await refresh();
      void message.success(editing ? 'Đã cập nhật vai trò' : 'Đã tạo vai trò');
      setFormOpen(false);
      setEditing(undefined);
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ row, reason }: { row: RoleDto; reason: string }) =>
      deleteAdminRole(row.id, { expectedVersion: row.version, reason }),
    onSuccess: async (_data, { row }) => {
      await refresh();
      void message.success(row.system ? 'Đã ngừng sử dụng vai trò' : 'Đã xoá vai trò');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

  function confirmDelete(row: RoleDto) {
    let reason = '';
    const deactivateSystemRole = getRoleRemovalMode(row) === 'DEACTIVATE';
    modal.confirm({
      title: deactivateSystemRole
        ? `Ngừng sử dụng vai trò ${row.code}?`
        : `Xoá vai trò ${row.code}?`,
      content: (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">
            {deactivateSystemRole
              ? 'Nhân viên đang giữ vai trò này sẽ mất quyền ngay. Vai trò và lịch sử phân quyền vẫn được giữ lại, và có thể kích hoạt lại ở màn Sửa.'
              : 'Chỉ xoá được khi vai trò chưa gán cho người dùng nào. Thao tác không hoàn tác được.'}
          </p>
          <Input.TextArea
            rows={2}
            placeholder="Lý do (tối thiểu 3 ký tự)"
            onChange={(event) => {
              reason = event.target.value;
            }}
          />
        </div>
      ),
      okText: deactivateSystemRole ? 'Ngừng sử dụng' : 'Xoá',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: () => {
        if (reason.trim().length < 3) {
          void message.error('Vui lòng nhập lý do tối thiểu 3 ký tự');
          return Promise.reject(new Error('reason-required'));
        }
        return deleteMutation.mutateAsync({ row, reason: reason.trim() });
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
          <div className="flex w-full flex-wrap justify-end gap-3">
            <Button icon={<ReloadOutlined />} onClick={() => void roles.refetch()}>
              Làm mới
            </Button>
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
          </div>
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
        submitting={saveMutation.isPending}
        onCancel={() => {
          setFormOpen(false);
          setEditing(undefined);
        }}
        onSubmit={(values) => saveMutation.mutate(values)}
      />
    </>
  );
}
