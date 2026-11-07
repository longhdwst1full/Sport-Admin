import { useEffect, useMemo, useState } from 'react';
import { EditOutlined } from '@ant-design/icons';
import { App, Button } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useListAdminAllRoles, useListAdminPermissions } from '@/generated/api/iam/iam';
import { useCan, usePermissions } from '@/core/auth/permissions';
import { getApiErrorMessage } from '@/lib/api/error';
import { invalidateReferenceData } from '@/shared/constants/query-cache-policy';
import { useRoleMutations } from '../hooks/use-role-mutations';
import { grantableRoleCodes } from '../model/role-grantable';
import { RoleFormDrawer } from './role-form-drawer';

/**
 * Lối tắt từ màn nhân viên sang ngăn sửa vai trò. Quyền gắn với VAI TRÒ chứ không gắn từng người, nên
 * lưu ở đây đổi quyền của mọi nhân viên đang giữ vai trò đó; ngăn sửa hiện rõ số phân quyền bị ảnh hưởng.
 * Chỉ hiện với người có `iam.role.manage`; API vẫn là nơi quyết định.
 */
export function RoleQuickEditButton({
  roleCode,
  label = 'Sửa quyền vai trò này',
  variant = 'link',
}: {
  roleCode?: string;
  label?: string;
  /** `link` trong form nhân viên; `primary` ở thanh hành động của drawer xem quyền. */
  variant?: 'link' | 'primary';
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const canManage = useCan('iam.role.manage');
  const actorPermissions = usePermissions();
  const [open, setOpen] = useState(false);

  const roles = useListAdminAllRoles({ query: { enabled: open } });
  const permissions = useListAdminPermissions({ query: { enabled: open } });
  const role = roles.data?.items.find((item) => item.code === roleCode);
  const permissionItems = useMemo(() => permissions.data?.items ?? [], [permissions.data]);
  const grantableCodes = useMemo(
    () => grantableRoleCodes(permissionItems, actorPermissions, role),
    [permissionItems, actorPermissions, role],
  );

  useEffect(() => {
    if (open && roles.isSuccess && !role) {
      void message.error('Không tìm thấy vai trò để sửa quyền');
      setOpen(false);
    }
  }, [open, roles.isSuccess, role, message]);

  const roleMutations = useRoleMutations({
    onSaved: async () => {
      await invalidateReferenceData(queryClient, 'roles');
      void message.success('Đã cập nhật quyền của vai trò');
      setOpen(false);
    },
    onSaveError: (error) => void message.error(getApiErrorMessage(error)),
    onDeleted: () => undefined,
    onDeleteError: () => undefined,
  });

  if (!canManage || !roleCode) return null;

  return (
    <>
      <Button
        type={variant}
        size="small"
        className={variant === 'link' ? '!text-xs' : undefined}
        icon={<EditOutlined />}
        loading={open && (roles.isPending || permissions.isPending)}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <RoleFormDrawer
        open={open && Boolean(role) && permissions.isSuccess}
        editing={role}
        permissions={permissionItems}
        grantableCodes={grantableCodes}
        submitting={roleMutations.saving}
        onCancel={() => setOpen(false)}
        onSubmit={(values) => roleMutations.save(values, role)}
      />
    </>
  );
}
