import type { DeleteRoleDto, DeleteRoleResultDto, RoleDto } from '@/generated/api/iam/iam.schemas';
import {
  useCreateAdminRole,
  useDeleteAdminRole,
  useUpdateAdminRole,
} from '@/generated/api/iam/iam';
import type { RoleFormValues } from '../components/role-form-drawer';

interface RoleMutationCallbacks {
  onSaved: (mode: 'create' | 'update') => Promise<void> | void;
  onSaveError: (error: unknown) => void;
  onDeleted: (result: DeleteRoleResultDto) => Promise<void> | void;
  onDeleteError: (error: unknown) => Promise<void> | void;
}

/**
 * Tạo/sửa/xoá vai trò đi qua hook SDK sinh ra để mutation mang `mutationKey` theo operationId.
 * `AuthProvider` dựa vào khoá đó (PERMISSION_CHANGING_OPERATIONS) để đọc lại `/auth/me`; gọi
 * thẳng hàm API thì không có khoá, người đang đăng nhập giữ menu/quyền cũ tới khi tải lại trang.
 */
export function useRoleMutations(callbacks: RoleMutationCallbacks) {
  const create = useCreateAdminRole({
    mutation: { onSuccess: () => callbacks.onSaved('create'), onError: callbacks.onSaveError },
  });
  const update = useUpdateAdminRole({
    mutation: { onSuccess: () => callbacks.onSaved('update'), onError: callbacks.onSaveError },
  });
  const remove = useDeleteAdminRole({
    mutation: { onSuccess: callbacks.onDeleted, onError: callbacks.onDeleteError },
  });

  function save(values: RoleFormValues, editing?: RoleDto) {
    if (editing) {
      update.mutate({
        roleId: editing.id,
        data: {
          name: values.name,
          description: values.description,
          status: values.status,
          permissionCodes: values.permissionCodes,
          expectedVersion: editing.version,
        },
      });
      return;
    }
    create.mutate({
      data: {
        code: values.code!.trim().toUpperCase(),
        name: values.name,
        description: values.description,
        permissionCodes: values.permissionCodes,
      },
    });
  }

  /** CONCURRENCY: gửi version đã load để API trả 409 nếu vai trò vừa bị sửa. */
  function deleteRole(row: RoleDto, data: Omit<DeleteRoleDto, 'expectedVersion'>) {
    return remove.mutateAsync({ roleId: row.id, data: { ...data, expectedVersion: row.version } });
  }

  return { save, saving: create.isPending || update.isPending, deleteRole, deleting: remove.isPending };
}
