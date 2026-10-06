import { CACHE_POLICY } from '@/shared/constants/query-cache-policy';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Avatar,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  Spin,
  Tag,
} from 'antd';
import {
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
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
import { ASSIGNABLE_ROLE_CODES, ASSIGNABLE_ROLE_PRESENTATION } from '../constants/access.constants';
import {
  type AssignmentFormValues,
  assignmentIdentity,
  isEditableAssignment,
  toAssignUserRoleDto,
  toAssignmentFormValues,
} from '../model/role-assignment.mapper';
import { BranchSelect } from '@/features/organization';
import { FormDrawer } from '@/foundation/overlay';

interface RoleAssignmentDrawerProps {
  user?: UserDto;
  open: boolean;
  onClose: () => void;
  /** Thu hồi đi qua modal xác nhận có lý do của trang (`RoleAssignmentRevokeModal`). */
  onRevoke: (assignment: UserRoleAssignmentDto) => void;
}

interface AssignmentEditorValues extends AssignmentFormValues {
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

export function RoleAssignmentDrawer({ user, open, onClose, onRevoke }: RoleAssignmentDrawerProps) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const canViewBranches = useCan('org.branch.view');
  /** Id assignment đang sửa; undefined = chế độ gán mới. */
  const [editingId, setEditingId] = useState<string>();
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<AssignmentEditorValues>({
    resolver: yupResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  const selectedRole = useWatch({ control, name: 'roleCode' });

  const rolesQuery = useListAdminRoles({ query: { enabled: open } });
  // Assignment chỉ trả branchId; tra nhãn chi nhánh khi có quyền xem, không có thì hiện mã.
  const branchesQuery = useListAdminBranches({
    query: { ...CACHE_POLICY.REFERENCE, enabled: open && canViewBranches },
  });

  const roles = useMemo(() => rolesQuery.data?.items ?? [], [rolesQuery.data]);
  const assignableRoles = useMemo(
    () => roles.filter((r) => (ASSIGNABLE_ROLE_CODES as string[]).includes(r.code)),
    [roles],
  );
  const selectedRoleDto = useMemo(
    () => roles.find((r) => r.code === selectedRole),
    [roles, selectedRole],
  );
  const branchLabels = useMemo(
    () => new Map((branchesQuery.data?.items ?? []).map((b) => [b.id, `${b.code} — ${b.name}`])),
    [branchesQuery.data],
  );
  const branchLabel = (branchId?: string) =>
    branchId ? (branchLabels.get(branchId) ?? `Chi nhánh #${branchId}`) : 'Toàn hệ thống';
  const roleName = (code: string) => roles.find((r) => r.code === code)?.name ?? code;

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

  useEffect(() => {
    if (!open) {
      setEditingId(undefined);
      reset(EMPTY_VALUES);
    }
  }, [open, reset]);

  const applyFieldErrors = (error: unknown) => {
    Object.entries(getApiFieldErrors(error)).forEach(([field, fieldMessage]) => {
      if (field in schema.fields) {
        setError(field as keyof AssignmentEditorValues, { message: fieldMessage });
      }
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
      // Gán mới TRƯỚC, thu hồi cũ SAU: lỗi ở bước gán không làm nhân viên mất quyền đang có.
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
        await revoke.mutateAsync({
          userId: user.id,
          assignmentId: editing.id,
          data: { reason },
        });
        void message.success('Đã cập nhật vai trò và phạm vi chi nhánh.');
        startAdd();
      } catch (error) {
        // Assignment mới đã có hiệu lực; báo rõ để người dùng thu hồi bản cũ thủ công.
        modal.warning({
          title: 'Đã gán vai trò mới nhưng chưa thu hồi được vai trò cũ',
          content: `${editing.roleCode} tại ${branchLabel(editing.branchId)} vẫn còn hiệu lực. ${getApiErrorMessage(
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

  return (
    <FormDrawer
      open={open}
      size="sm"
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <SafetyCertificateOutlined />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900">Phân quyền người dùng</div>
            <div className="text-xs text-slate-500 font-normal">
              Thêm, sửa, thu hồi vai trò và chi nhánh hoạt động theo OpenAPI contract
            </div>
          </div>
        </div>
      }
      onClose={onClose}
      onSubmit={() => void submit()}
      submitting={saving}
      submitText={saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Gán vai trò'}
      cancelText="Đóng"
      isDirty={() => isDirty}
    >
      {/* Target User Info Header */}
      {user && (
        <div className="mb-5 flex items-center gap-3.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
          <Avatar
            size={46}
            className="!flex shrink-0 !items-center !justify-center !text-base !font-bold bg-emerald-600 text-white ring-2 ring-emerald-500/20"
          >
            {user.displayName.slice(0, 2).toUpperCase()}
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{user.displayName}</span>
              <Tag color={user.status === 'ACTIVE' ? 'success' : 'default'} className="!mr-0 !text-[10px]">
                {user.status}
              </Tag>
            </div>
            <div className="text-xs text-slate-500 truncate mt-0.5">{user.maskedEmail}</div>
          </div>
        </div>
      )}

      {/* ── Current assignments: edit / revoke ─────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-700">Vai trò & phạm vi hiện tại</label>
          {editing && (
            <Button type="link" size="small" className="!text-xs" onClick={startAdd}>
              + Gán vai trò mới
            </Button>
          )}
        </div>
        {assignments.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có vai trò nào" />
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => {
              const editable = isEditableAssignment(a);
              const isEditing = editing?.id === a.id;
              return (
                <div
                  key={a.id}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 ${
                    isEditing ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/30' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{roleName(a.roleCode)}</span>
                      <Tag color={a.roleCode === 'BRANCH_MANAGER' ? 'emerald' : 'blue'} className="!mr-0 !text-[10px]">
                        {a.roleCode}
                      </Tag>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {a.scopeType} · {branchLabel(a.branchId)}
                    </div>
                  </div>
                  {editable && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="small"
                        type="text"
                        icon={<EditOutlined />}
                        disabled={saving}
                        aria-label={`Sửa ${a.roleCode} tại ${branchLabel(a.branchId)}`}
                        onClick={() => startEdit(a)}
                      />
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={saving}
                        aria-label={`Thu hồi ${a.roleCode} tại ${branchLabel(a.branchId)}`}
                        onClick={() => onRevoke(a)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Form layout="vertical">
        {editing && (
          <Alert
            className="mb-4 !rounded-xl"
            type="info"
            showIcon
            message={`Đang sửa ${editing.roleCode} tại ${branchLabel(editing.branchId)}`}
            description="Hệ thống gán vai trò/chi nhánh mới trước rồi mới thu hồi assignment cũ (giữ bản REVOKED để audit)."
          />
        )}

        {/* ── Checkbox Role Selection (From OpenAPI) ─────────────── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700">
              {editing ? 'Vai trò mới' : 'Chọn vai trò cần gán'} <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Dạng thẻ Checkbox</span>
          </div>

          {rolesQuery.isPending ? (
            <div className="py-6 text-center">
              <Spin size="small" />
            </div>
          ) : (
            <div className="space-y-2.5">
              {assignableRoles.map((r) => {
                const isSelected = selectedRole === r.code;
                const presentation = ASSIGNABLE_ROLE_PRESENTATION[r.code as AssignableStaffRoleCode];
                return (
                  <div
                    key={r.code}
                    onClick={() =>
                      setValue('roleCode', r.code as AssignmentFormValues['roleCode'], {
                        shouldValidate: true,
                      })
                    }
                    className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2.5">
                        <Checkbox checked={isSelected} className="dctd-role-checkbox" />
                        <span className="text-sm font-bold text-slate-900">{r.name}</span>
                      </div>
                      <Tag color={presentation.color} className="!mr-0 !text-[10px] !font-medium">
                        {r.code}
                      </Tag>
                    </div>
                    <p className="text-xs text-slate-500 pl-7 m-0">
                      {r.description || presentation.fallbackDescription}
                    </p>
                  </div>
                );
              })}
              {assignableRoles.length === 0 && (
                <Alert
                  type="warning"
                  showIcon
                  message={rolesQuery.isError ? 'Không tải được danh sách vai trò' : 'Chưa có vai trò gán được'}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Branch Selection ─────────────────────────────────── */}
        <Form.Item
          label={<span className="text-xs font-semibold text-slate-700">Chi nhánh áp dụng</span>}
          required
          validateStatus={errors.branchId ? 'error' : undefined}
          help={errors.branchId?.message}
          className="mb-4"
        >
          <Controller
            name="branchId"
            control={control}
            render={({ field }) => (
              <BranchSelect
                className="w-full"
                placeholder="Chọn chi nhánh đang hoạt động"
                labelFormat="code-name"
                suffixIcon={<ShopOutlined className="text-slate-400" />}
                value={field.value || undefined}
                onChange={(next) => field.onChange(next ?? '')}
                seedLabel={field.value ? branchLabel(field.value) : undefined}
                status={errors.branchId ? 'error' : undefined}
              />
            )}
          />
        </Form.Item>

        {editing && (
          <Form.Item
            label={<span className="text-xs font-semibold text-slate-700">Lý do thay đổi</span>}
            required
            validateStatus={errors.reason ? 'error' : undefined}
            help={errors.reason?.message}
            className="mb-4"
          >
            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <Input.TextArea
                  {...field}
                  rows={2}
                  maxLength={255}
                  showCount
                  placeholder="Ví dụ: Nhân viên chuyển sang chi nhánh khác"
                />
              )}
            />
          </Form.Item>
        )}

        {/* ── Real Permissions Preview from OpenAPI ────────────── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <SafetyCertificateOutlined className="text-emerald-600" />
              Quyền hạn OpenAPI ({selectedRoleDto?.permissionCodes?.length ?? 0})
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">Theo vai trò API</span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
            {(selectedRoleDto?.permissionCodes ?? []).map((perm) => (
              <Tag
                key={perm}
                color="default"
                className="!mr-0 !rounded-md !border-slate-200 !bg-white !px-2 !py-0.5 !text-[11px] !font-mono !text-slate-700 flex items-center gap-1 shadow-2xs"
              >
                <CheckOutlined className="text-emerald-600 text-[10px]" />
                {perm}
              </Tag>
            ))}
          </div>
        </div>
      </Form>
    </FormDrawer>
  );
}
