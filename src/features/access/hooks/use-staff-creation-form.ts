import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import * as yup from 'yup';
import {
  getListAdminUsersQueryKey,
  useAssignAdminUserRole,
  useCreateAdminStaffUser,
  useListAdminPermissions,
  useListAdminRoles,
} from '@/generated/api/iam/iam';
import {
  AssignableStaffRoleCode,
  CreateStaffUserDtoRoleCode,
  type CreateStaffUserResponseDto,
  type MfaProvisioningDto,
} from '@/generated/api/iam/iam.schemas';
import { useSearchActiveAdminBranches } from '@/generated/api/organization/organization';
import { getApiErrorMessage, getApiErrorPayload, getApiFieldErrors } from '@/lib/api/error';
import { ENTITY_ID_PATTERN } from '@/lib/validation/entity-id';
import { CACHE_POLICY } from '@/shared/constants/query-cache-policy';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { STAFF_CREATION_ERROR_MESSAGES } from '../constants/access.constants';
import { groupPermissionsByModule } from '../model/permission-groups';
import { type AssignmentFormValues, assignmentIdentity, pickAssignableRoles } from '../model/role-assignment.mapper';
import {
  type StaffCreationFormValues,
  toCreateStaffUserDto,
  toExtraAssignUserRoleDtos,
} from '../model/staff-creation.mapper';

const extraAssignmentSchema: yup.ObjectSchema<AssignmentFormValues> = yup.object({
  roleCode: yup
    .mixed<AssignmentFormValues['roleCode']>()
    .oneOf(Object.values(AssignableStaffRoleCode), 'Vui lòng chọn vai trò')
    .required('Vui lòng chọn vai trò'),
  branchId: yup.string().matches(ENTITY_ID_PATTERN, 'Chi nhánh không hợp lệ').required('Vui lòng chọn chi nhánh'),
});

const EMPTY_FORM: StaffCreationFormValues = {
  displayName: '',
  email: '',
  roleCode: CreateStaffUserDtoRoleCode.STAFF,
  branchId: '',
  extraAssignments: [],
};

const schema: yup.ObjectSchema<StaffCreationFormValues> = yup.object({
  displayName: yup.string().trim().required('Nhập tên nhân viên').max(255, 'Tối đa 255 ký tự'),
  email: yup.string().trim().email('Email không hợp lệ').required('Nhập email').max(255, 'Tối đa 255 ký tự'),
  roleCode: yup
    .mixed<CreateStaffUserDtoRoleCode>()
    .oneOf(Object.values(CreateStaffUserDtoRoleCode))
    .required('Vui lòng chọn vai trò'),
  branchId: yup.string().matches(ENTITY_ID_PATTERN, 'Chi nhánh không hợp lệ').required('Vui lòng chọn chi nhánh'),
  extraAssignments: yup.array().of(extraAssignmentSchema).defined(),
});

function isFormField(field: string): field is keyof StaffCreationFormValues {
  return Object.hasOwn(schema.fields, field);
}

interface StaffCreationFormOptions {
  open: boolean;
  onClose: () => void;
  onMfaProvisioned?: (displayName: string, mfa: MfaProvisioningDto) => void;
}

/**
 * Form + dữ liệu tham chiếu + luồng gửi của drawer tạo nhân viên. Tách khỏi component để drawer chỉ
 * còn bố cục; hành vi giữ nguyên: tạo tài khoản với phạm vi chính rồi gán tuần tự các phạm vi thêm.
 */
export function useStaffCreationForm({ open, onClose, onMfaProvisioned }: StaffCreationFormOptions) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const branchSearch = useSearchState('', 300);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<StaffCreationFormValues>({
    resolver: yupResolver(schema),
    defaultValues: EMPTY_FORM,
  });
  const { control, handleSubmit, reset, setError } = form;
  const extraRows = useFieldArray({ control, name: 'extraAssignments' });
  const selectedRole = useWatch({ control, name: 'roleCode' });
  const extraAssignments = useWatch({ control, name: 'extraAssignments' });

  const rolesQuery = useListAdminRoles({ query: { enabled: open } });
  const permissionsQuery = useListAdminPermissions({ query: { enabled: open } });
  const branchesQuery = useSearchActiveAdminBranches(
    { search: branchSearch.debounced, page: 1, limit: 20 },
    { query: { ...CACHE_POLICY.REFERENCE, enabled: open } },
  );

  const roles = useMemo(() => rolesQuery.data?.items ?? [], [rolesQuery.data]);
  const permissions = useMemo(() => permissionsQuery.data?.items ?? [], [permissionsQuery.data]);
  const permissionGroups = useMemo(() => groupPermissionsByModule(permissions), [permissions]);
  const assignableRoles = useMemo(() => pickAssignableRoles(roles), [roles]);
  const assignableRoleOptions = useMemo(
    () => assignableRoles.map((role) => ({ value: role.code, label: role.name })),
    [assignableRoles],
  );
  const branchOptions = useMemo(
    () =>
      (branchesQuery.data?.items ?? []).map((branch) => ({
        value: branch.id,
        label: `${branch.code} — ${branch.label}`,
      })),
    [branchesQuery.data],
  );

  // Quyền hiệu lực = hợp các vai trò đã chọn (dòng chính + các dòng thêm), đọc từ API.
  const grantedCodes = useMemo(() => {
    const selectedCodes = new Set<string>([
      selectedRole,
      ...(extraAssignments ?? []).map((row) => row.roleCode).filter(Boolean),
    ]);
    return new Set(roles.filter((r) => selectedCodes.has(r.code)).flatMap((r) => r.permissionCodes));
  }, [roles, selectedRole, extraAssignments]);

  const createStaff = useCreateAdminStaffUser();
  const assignRole = useAssignAdminUserRole();

  // Đặt lại form trên đường đóng thay vì effect theo `open` (RULE-HOOK-01).
  const close = () => {
    reset(EMPTY_FORM);
    branchSearch.setValue('');
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    // Trùng vai trò + chi nhánh bị server từ chối (409); chặn sớm để không tạo user rồi gán hỏng.
    const seen = new Set([assignmentIdentity(values.roleCode, values.branchId)]);
    let duplicated = false;
    values.extraAssignments.forEach((row, index) => {
      const identity = assignmentIdentity(row.roleCode, row.branchId);
      if (seen.has(identity)) {
        setError(`extraAssignments.${index}.branchId`, {
          message: 'Trùng vai trò và chi nhánh với một dòng khác',
        });
        duplicated = true;
      }
      seen.add(identity);
    });
    if (duplicated) return;

    setSubmitting(true);
    try {
      let created: CreateStaffUserResponseDto;
      try {
        created = await createStaff.mutateAsync({ data: toCreateStaffUserDto(values) });
      } catch (error) {
        Object.entries(getApiFieldErrors(error)).forEach(([field, fieldMessage]) => {
          if (isFormField(field)) setError(field, { message: fieldMessage });
        });
        const reservedMessage = STAFF_CREATION_ERROR_MESSAGES[getApiErrorPayload(error)?.code ?? ''];
        if (reservedMessage) {
          setError('email', { message: reservedMessage });
          void message.error(reservedMessage);
          return;
        }
        void message.error(getApiErrorMessage(error, 'Không thể tạo nhân viên.'));
        return;
      }

      // Tài khoản đã tồn tại; các phạm vi thêm gán tuần tự, dòng lỗi được báo lại để sửa trong
      // màn "Phân quyền người dùng" thay vì im lặng bỏ qua.
      const failures: string[] = [];
      for (const dto of toExtraAssignUserRoleDtos(values)) {
        try {
          await assignRole.mutateAsync({ userId: created.id, data: dto });
        } catch (error) {
          failures.push(`${dto.roleCode}: ${getApiErrorMessage(error, 'không gán được')}`);
        }
      }
      await queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
      if (failures.length > 0) {
        modal.warning({
          title: 'Đã tạo nhân viên nhưng một số phạm vi chưa gán được',
          content: `${failures.join('; ')}. Mở "Phân quyền người dùng" để gán lại.`,
        });
      } else {
        void message.success('Đã tạo nhân viên và gán quyền theo chi nhánh.');
      }
      close();
      if (created.mfa) onMfaProvisioned?.(created.displayName, created.mfa);
    } finally {
      setSubmitting(false);
    }
  });

  return {
    form,
    extraRows,
    selectedRole,
    rolesQuery,
    permissionsQuery,
    branchesQuery,
    branchOptions,
    setBranchSearch: branchSearch.setValue,
    permissionGroups,
    totalPossible: permissions.length,
    assignableRoles,
    assignableRoleOptions,
    grantedCodes,
    submit,
    submitting,
    close,
  };
}
