import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import * as yup from 'yup';
import { useCan } from '@/core/auth/permissions';
import {
  getListAdminUsersQueryKey,
  useAssignAdminUserRole,
  useListAdminRoles,
  useRevokeAdminUserRoleAssignment,
} from '@/generated/api/iam/iam';
import {
  AssignableStaffRoleCode,
  type UserDto,
  type UserRoleAssignmentDto,
} from '@/generated/api/iam/iam.schemas';
import { useListAdminBranches } from '@/generated/api/organization/organization';
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api/error';
import { ENTITY_ID_PATTERN } from '@/lib/validation/entity-id';
import { CACHE_POLICY } from '@/shared/constants/query-cache-policy';
import { roleCodeLabel } from '../constants/access.constants';
import {
  type AssignmentFormValues,
  assignmentIdentity,
  pickAssignableRoles,
  toAssignUserRoleDto,
  toAssignmentFormValues,
} from '../model/role-assignment.mapper';

export interface AssignmentEditorValues extends AssignmentFormValues {
  /** Lý do thu hồi assignment cũ; chỉ bắt buộc khi sửa. */
  reason: string;
}

const schema: yup.ObjectSchema<AssignmentEditorValues> = yup.object({
  roleCode: yup
    .mixed<AssignmentFormValues['roleCode']>()
    .oneOf(Object.values(AssignableStaffRoleCode))
    .required('Vui lòng chọn vai trò cần gán'),
  branchId: yup.string().matches(ENTITY_ID_PATTERN, 'Chi nhánh không hợp lệ').required('Vui lòng chọn chi nhánh'),
  reason: yup.string().defined().max(255, 'Tối đa 255 ký tự'),
});

const EMPTY_VALUES: AssignmentEditorValues = { roleCode: 'STAFF', branchId: '', reason: '' };

function isEditorField(field: string): field is keyof AssignmentEditorValues {
  return Object.hasOwn(schema.fields, field);
}

/**
 * Form + luồng thêm/sửa vai trò của drawer phân quyền.
 * Sửa = gán mới TRƯỚC rồi thu hồi cũ SAU, để lỗi ở bước gán không làm nhân viên mất quyền đang có.
 */
export function useRoleAssignmentEditor({
  user,
  open,
  onClose,
}: {
  user?: UserDto;
  open: boolean;
  onClose: () => void;
}) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const canViewBranches = useCan('org.branch.view');
  /** Id assignment đang sửa; undefined = chế độ gán mới. */
  const [editingId, setEditingId] = useState<string>();
  const [saving, setSaving] = useState(false);

  const form = useForm<AssignmentEditorValues>({
    resolver: yupResolver(schema),
    defaultValues: EMPTY_VALUES,
  });
  const { control, handleSubmit, reset, setError } = form;
  const selectedRole = useWatch({ control, name: 'roleCode' });

  const rolesQuery = useListAdminRoles({ query: { enabled: open } });
  // Assignment chỉ trả branchId; tra nhãn chi nhánh khi có quyền xem, không có thì hiện mã.
  const branchesQuery = useListAdminBranches({
    query: { ...CACHE_POLICY.REFERENCE, enabled: open && canViewBranches },
  });

  const roles = useMemo(() => rolesQuery.data?.items ?? [], [rolesQuery.data]);
  const assignableRoles = useMemo(() => pickAssignableRoles(roles), [roles]);
  const selectedRoleDto = useMemo(() => roles.find((r) => r.code === selectedRole), [roles, selectedRole]);
  const branchLabels = useMemo(
    () => new Map((branchesQuery.data?.items ?? []).map((b) => [b.id, `${b.code} — ${b.name}`])),
    [branchesQuery.data],
  );
  const branchLabel = (branchId?: string) =>
    branchId ? (branchLabels.get(branchId) ?? `Chi nhánh #${branchId}`) : 'Toàn hệ thống';
  const roleName = (code: string) => roles.find((r) => r.code === code)?.name ?? roleCodeLabel(code);

  const assignments = useMemo(() => user?.assignments ?? [], [user]);
  // Suy ra từ danh sách mới nhất: assignment vừa bị thu hồi ở modal thì tự thoát chế độ sửa.
  const editing = assignments.find((a) => a.id === editingId);

  const assign = useAssignAdminUserRole();
  const revoke = useRevokeAdminUserRoleAssignment();

  const startAdd = () => {
    setEditingId(undefined);
    reset(EMPTY_VALUES);
  };

  const startEdit = (assignment: UserRoleAssignmentDto) => {
    setEditingId(assignment.id);
    reset({ ...toAssignmentFormValues(assignment), reason: '' });
  };

  // Về chế độ gán mới ngay trên đường đóng thay vì effect theo `open` (RULE-HOOK-01).
  const close = () => {
    startAdd();
    onClose();
  };

  const applyFieldErrors = (error: unknown) => {
    Object.entries(getApiFieldErrors(error)).forEach(([field, fieldMessage]) => {
      if (isEditorField(field)) setError(field, { message: fieldMessage });
    });
  };

  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });

  const submit = handleSubmit(async (values) => {
    if (!user) return;
    const nextIdentity = assignmentIdentity(values.roleCode, values.branchId);
    if (editing && assignmentIdentity(editing.roleCode, editing.branchId) === nextIdentity) {
      void message.info('Vai trò và chi nhánh không thay đổi.');
      return;
    }
    const duplicated = assignments.some(
      (a) => a.id !== editing?.id && assignmentIdentity(a.roleCode, a.branchId) === nextIdentity,
    );
    if (duplicated) {
      setError('branchId', { message: 'Nhân viên đã có vai trò này tại chi nhánh đã chọn.' });
      return;
    }
    const reason = values.reason.trim();
    if (editing && reason.length < 3) {
      setError('reason', { message: 'Nhập lý do thay đổi (tối thiểu 3 ký tự)' });
      return;
    }

    setSaving(true);
    try {
      try {
        await assign.mutateAsync({ userId: user.id, data: toAssignUserRoleDto(values) });
      } catch (error) {
        applyFieldErrors(error);
        void message.error(getApiErrorMessage(error, 'Không thể gán vai trò.'));
        return;
      }

      if (!editing) {
        void message.success('Đã gán vai trò cho người dùng thành công.');
        startAdd();
        return;
      }

      try {
        await revoke.mutateAsync({ userId: user.id, assignmentId: editing.id, data: { reason } });
        void message.success('Đã cập nhật vai trò và phạm vi chi nhánh.');
        startAdd();
      } catch (error) {
        // Assignment mới đã có hiệu lực; báo rõ để người dùng thu hồi bản cũ thủ công.
        modal.warning({
          title: 'Đã gán vai trò mới nhưng chưa thu hồi được vai trò cũ',
          content: `${roleCodeLabel(editing.roleCode)} tại ${branchLabel(editing.branchId)} vẫn còn hiệu lực. ${getApiErrorMessage(
            error,
            'Không thể thu hồi vai trò cũ.',
          )} Hãy thu hồi thủ công trong danh sách vai trò hiện tại.`,
        });
        setEditingId(undefined);
      }
    } finally {
      await refreshUsers();
      setSaving(false);
    }
  });

  return {
    form,
    selectedRole,
    selectedRoleDto,
    rolesQuery,
    assignableRoles,
    assignments,
    editing,
    saving,
    branchLabel,
    roleName,
    startAdd,
    startEdit,
    submit,
    close,
  };
}
