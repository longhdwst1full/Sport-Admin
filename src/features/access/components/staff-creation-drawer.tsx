import { CACHE_POLICY } from '@/shared/constants/query-cache-policy';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Form,
  Input,
  Select,
  Spin,
  Tag,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQueryClient } from '@tanstack/react-query';
import { ENTITY_ID_PATTERN } from '@/lib/validation/entity-id';
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
  type CreateStaffUserDtoRoleCode as StaffRoleCode,
  type CreateStaffUserResponseDto,
  type MfaProvisioningDto,
  type PermissionDto,
} from '@/generated/api/iam/iam.schemas';
import { useSearchActiveAdminBranches } from '@/generated/api/organization/organization';
import { getApiErrorMessage, getApiErrorPayload, getApiFieldErrors } from '@/lib/api/error';
import {
  ASSIGNABLE_ROLE_CODES,
  ASSIGNABLE_ROLE_PRESENTATION,
  STAFF_CREATION_ERROR_MESSAGES,
} from '../constants/access.constants';
import { type AssignmentFormValues, assignmentIdentity } from '../model/role-assignment.mapper';
import {
  type StaffCreationFormValues,
  toCreateStaffUserDto,
  toExtraAssignUserRoleDtos,
} from '../model/staff-creation.mapper';
import { BranchSelect } from '@/features/organization';
import { FormDrawer } from '@/foundation/overlay';
import { useSearchState } from '@/shared/hooks/use-search-state';

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
    .mixed<StaffRoleCode>()
    .oneOf(Object.values(CreateStaffUserDtoRoleCode))
    .required('Vui lòng chọn vai trò'),
  branchId: yup.string().matches(ENTITY_ID_PATTERN, 'Chi nhánh không hợp lệ').required('Vui lòng chọn chi nhánh'),
  extraAssignments: yup.array().of(extraAssignmentSchema).defined(),
});

const MODULE_TRANSLATIONS: Record<string, { label: string; icon: string }> = {
  Catalog: { label: 'Sản phẩm & Danh mục (Catalog)', icon: '📦' },
  Pricing: { label: 'Bảng giá & Khuyến mãi (Pricing)', icon: '🏷️' },
  Order: { label: 'Bán hàng & Đơn hàng (Order)', icon: '🛒' },
  Payment: { label: 'Thanh toán & Đối soát (Payment)', icon: '💳' },
  Fulfillment: { label: 'Xử lý đóng gói & Giao nhận (Fulfillment)', icon: '🚚' },
  Inventory: { label: 'Kho vận & Tồn kho (Inventory)', icon: '🏭' },
  Customer: { label: 'Khách hàng (Customer)', icon: '👥' },
  Review: { label: 'Đánh giá & Bình luận (Review)', icon: '⭐' },
  Organization: { label: 'Chi nhánh & Kho trực thuộc (Organization)', icon: '🏢' },
  IAM: { label: 'Phân quyền & Tài khoản (IAM)', icon: '🛡️' },
  CMS: { label: 'Nội dung & Bài viết (CMS)', icon: '📰' },
  Media: { label: 'Quản lý File & Ảnh (Media)', icon: '🖼️' },
  Reporting: { label: 'Báo cáo & Thống kê (Reporting)', icon: '📊' },
  System: { label: 'Hệ thống (System)', icon: '⚙️' },
};

export function StaffCreationDrawer({
  open,
  onClose,
  onMfaProvisioned,
}: {
  open: boolean;
  onClose: () => void;
  /** API chỉ trả `mfa` khi người tạo giữ iam.user.mfa.manage; trang hiển thị QR ngay sau khi tạo. */
  onMfaProvisioned?: (displayName: string, mfa: MfaProvisioningDto) => void;
}) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const branchSearch = useSearchState('', 300);
  const setBranchSearch = branchSearch.setValue;
  const [showMatrix, setShowMatrix] = useState(true);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<StaffCreationFormValues>({
    resolver: yupResolver(schema),
    defaultValues: EMPTY_FORM,
  });
  const extraRows = useFieldArray({ control, name: 'extraAssignments' });
  const [submitting, setSubmitting] = useState(false);

  const selectedRole = useWatch({ control, name: 'roleCode' });
  const extraAssignments = useWatch({ control, name: 'extraAssignments' });

  // Fetch actual roles and permissions defined in OpenAPI / backend
  const rolesQuery = useListAdminRoles({ query: { enabled: open } });
  const permissionsQuery = useListAdminPermissions({ query: { enabled: open } });

  const branchesQuery = useSearchActiveAdminBranches(
    { search: branchSearch.debounced, page: 1, limit: 20 },
    { query: { ...CACHE_POLICY.REFERENCE, enabled: open } },
  );

  const roles = useMemo(() => rolesQuery.data?.items ?? [], [rolesQuery.data]);
  const permissions = useMemo(
    () => permissionsQuery.data?.items ?? [],
    [permissionsQuery.data],
  );

  // Group OpenAPI permissions by module
  const permissionsByModule = useMemo(() => {
    const map = new Map<string, PermissionDto[]>();
    for (const perm of permissions) {
      const list = map.get(perm.module) ?? [];
      list.push(perm);
      map.set(perm.module, list);
    }
    return Array.from(map.entries()).map(([moduleName, perms]) => ({
      module: moduleName,
      label: MODULE_TRANSLATIONS[moduleName]?.label ?? moduleName,
      icon: MODULE_TRANSLATIONS[moduleName]?.icon ?? '📁',
      permissions: perms,
    }));
  }, [permissions]);

  const assignableRoles = useMemo(
    () => roles.filter((r) => (ASSIGNABLE_ROLE_CODES as string[]).includes(r.code)),
    [roles],
  );
  const assignableRoleOptions = useMemo(
    () => assignableRoles.map((r) => ({ value: r.code, label: r.name })),
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
  const grantedCodesSet = useMemo(() => {
    const selectedCodes = new Set<string>([
      selectedRole,
      ...(extraAssignments ?? []).map((row) => row.roleCode).filter(Boolean),
    ]);
    return new Set(
      roles.filter((r) => selectedCodes.has(r.code)).flatMap((r) => r.permissionCodes),
    );
  }, [roles, selectedRole, extraAssignments]);

  const createStaff = useCreateAdminStaffUser();
  const assignRole = useAssignAdminUserRole();

  useEffect(() => {
    if (!open) {
      reset(EMPTY_FORM);
      setBranchSearch('');
    }
  }, [open, reset, setBranchSearch]);

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
      let userId: string;
      let created: CreateStaffUserResponseDto;
      try {
        created = await createStaff.mutateAsync({ data: toCreateStaffUserDto(values) });
        userId = created.id;
      } catch (error) {
        Object.entries(getApiFieldErrors(error)).forEach(([field, fieldMessage]) => {
          if (field in schema.fields) {
            setError(field as keyof StaffCreationFormValues, { message: fieldMessage });
          }
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
          await assignRole.mutateAsync({ userId, data: dto });
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
      reset(EMPTY_FORM);
      onClose();
      if (created.mfa) onMfaProvisioned?.(created.displayName, created.mfa);
    } finally {
      setSubmitting(false);
    }
  });

  const totalGranted = grantedCodesSet.size;
  const totalPossible = permissions.length;

  return (
    <FormDrawer
      open={open}
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <UserOutlined />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900">Tạo tài khoản nhân viên</div>
            <div className="text-xs text-slate-500 font-normal">
              Thiết lập thông tin và gán quyền theo chi nhánh
            </div>
          </div>
        </div>
      }
      onClose={onClose}
      onSubmit={() => void submit()}
      submitting={submitting}
      submitText={submitting ? 'Đang khởi tạo...' : 'Tạo nhân viên'}
      isDirty={() => isDirty}
      className="dctd-staff-drawer"
      footerExtra={
        <span className="text-xs text-slate-500">
          Quyền kích hoạt: <strong className="text-emerald-700 font-semibold">{totalGranted}</strong>/{totalPossible} quyền
        </span>
      }
    >
      <Alert
        className="mb-5 !rounded-xl !border-amber-200 !bg-amber-50/80"
        type="warning"
        showIcon
        message={
          <span className="text-xs font-semibold text-amber-900">
            Mật khẩu khởi tạo mặc định: <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 font-mono">Aa@123456</code>
          </span>
        }
        description={
          <span className="text-xs text-amber-700 leading-relaxed block mt-0.5">
            Nhân sự bắt buộc đổi mật khẩu mới trong lần đăng nhập đầu tiên để kích hoạt tài khoản.
          </span>
        }
      />

      <Form layout="vertical">
        {/* Basic Info Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-2">
          <Form.Item
            label={<span className="text-xs font-semibold text-slate-700">Tên nhân viên</span>}
            required
            validateStatus={errors.displayName ? 'error' : undefined}
            help={errors.displayName?.message}
            className="mb-3"
          >
            <Controller
              name="displayName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="!rounded-lg"
                  prefix={<UserOutlined className="text-slate-400" />}
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-xs font-semibold text-slate-700">Email đăng nhập</span>}
            required
            validateStatus={errors.email ? 'error' : undefined}
            help={errors.email?.message}
            className="mb-3"
          >
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="email"
                  placeholder="nhanvien@baoansport.vn"
                  className="!rounded-lg"
                />
              )}
            />
          </Form.Item>
        </div>

        {/* Branch Selection */}
        <Form.Item
          label={<span className="text-xs font-semibold text-slate-700">Chi nhánh trực thuộc</span>}
          required
          validateStatus={errors.branchId ? 'error' : undefined}
          help={errors.branchId?.message}
          className="mb-4"
        >
          <Controller
            name="branchId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                showSearch
                filterOption={false}
                onSearch={setBranchSearch}
                loading={branchesQuery.isFetching}
                options={branchOptions}
                placeholder="Chọn chi nhánh đang hoạt động"
                notFoundContent={branchesQuery.isError ? 'Không tải được chi nhánh' : undefined}
                className="w-full"
                suffixIcon={<ShopOutlined className="text-slate-400" />}
              />
            )}
          />
        </Form.Item>

        {/* ── Checkbox Role Selection Section ──────────────────── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700">
              Chọn vai trò phân quyền <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Dạng thẻ Checkbox lựa chọn</span>
          </div>

          {rolesQuery.isPending ? (
            <div className="py-6 text-center">
              <Spin size="small" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assignableRoles.map((role) => {
                const isSelected = selectedRole === role.code;
                const presentation = ASSIGNABLE_ROLE_PRESENTATION[role.code as AssignableStaffRoleCode];
                return (
                  <div
                    key={role.code}
                    onClick={() => setValue('roleCode', role.code as StaffRoleCode, { shouldValidate: true })}
                    className={`relative flex flex-col justify-between rounded-xl border p-3.5 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={isSelected} className="dctd-role-checkbox" />
                          <span className="text-sm font-bold text-slate-900">{role.name}</span>
                        </div>
                        <Tag color={presentation.color} className="!mr-0 !rounded-md !text-[10px] !font-medium">
                          {presentation.tag}
                        </Tag>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 m-0">
                        {role.description || presentation.fallbackDescription}
                      </p>
                    </div>

                    <div className={`mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium ${presentation.accentClass}`}>
                      <span className="flex items-center gap-1">
                        <SafetyCertificateOutlined /> {role.permissionCodes.length} quyền
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{role.code}</span>
                    </div>
                  </div>
                );
              })}
              {assignableRoles.length === 0 && (
                <Alert
                  className="sm:col-span-2"
                  type="warning"
                  showIcon
                  message={rolesQuery.isError ? 'Không tải được danh sách vai trò' : 'Chưa có vai trò gán được'}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Additional role + branch scopes ─────────────────── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700">Phạm vi bổ sung</label>
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              className="!text-xs"
              onClick={() => extraRows.append({ roleCode: AssignableStaffRoleCode.STAFF, branchId: '' })}
            >
              Thêm vai trò / chi nhánh
            </Button>
          </div>
          {extraRows.fields.length === 0 ? (
            <p className="text-[11px] text-slate-400 m-0">
              Tùy chọn: thêm vai trò tại chi nhánh khác. Có thể sửa hoặc thu hồi sau khi tạo.
            </p>
          ) : (
            <div className="space-y-2">
              {extraRows.fields.map((row, index) => {
                const rowErrors = errors.extraAssignments?.[index];
                return (
                  <div key={row.id} className="flex items-start gap-2">
                    <Form.Item
                      className="mb-0 w-44 shrink-0"
                      validateStatus={rowErrors?.roleCode ? 'error' : undefined}
                      help={rowErrors?.roleCode?.message}
                    >
                      <Controller
                        name={`extraAssignments.${index}.roleCode`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            options={assignableRoleOptions}
                            placeholder="Vai trò"
                          />
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      className="mb-0 min-w-0 flex-1"
                      validateStatus={rowErrors?.branchId ? 'error' : undefined}
                      help={rowErrors?.branchId?.message}
                    >
                      <Controller
                        name={`extraAssignments.${index}.branchId`}
                        control={control}
                        render={({ field }) => (
                          <BranchSelect
                            className="w-full"
                            placeholder="Chọn chi nhánh đang hoạt động"
                            labelFormat="code-name"
                            suffixIcon={<ShopOutlined className="text-slate-400" />}
                            value={field.value || undefined}
                            onChange={(next) => field.onChange(next ?? '')}
                            status={rowErrors?.branchId ? 'error' : undefined}
                          />
                        )}
                      />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={`Bỏ dòng phạm vi ${index + 1}`}
                      onClick={() => extraRows.remove(index)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Checkbox Permissions Matrix (Ma trận quyền hạn OpenAPI) ─ */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden mb-2">
          <div
            onClick={() => setShowMatrix(!showMatrix)}
            className="flex items-center justify-between px-4 py-3 bg-slate-100/70 cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <SafetyCertificateOutlined className="text-emerald-600" />
              <span>Ma trận quyền hạn theo hợp đồng API ({totalGranted}/{totalPossible})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-700 font-semibold">
                {extraRows.fields.length > 0
                  ? `${extraRows.fields.length + 1} phạm vi`
                  : selectedRole === CreateStaffUserDtoRoleCode.BRANCH_MANAGER
                    ? 'Vai trò Quản lý'
                    : 'Vai trò Nhân viên'}
              </span>
              <Button type="text" size="small" className="!text-xs !text-slate-500">
                {showMatrix ? 'Thu gọn ▲' : 'Xem chi tiết ▼'}
              </Button>
            </div>
          </div>

          {showMatrix && (
            <div className="p-3.5 space-y-3.5 max-h-[340px] overflow-y-auto">
              {permissionsQuery.isLoading ? (
                <div className="py-6 text-center">
                  <Spin size="small" />
                </div>
              ) : (
                permissionsByModule.map((group) => {
                  const grantedInGroup = group.permissions.filter((p) => grantedCodesSet.has(p.code)).length;
                  return (
                    <div key={group.module} className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{group.icon}</span>
                          <span className="text-xs font-bold text-slate-800">{group.label}</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">
                          {grantedInGroup}/{group.permissions.length} quyền
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5 pl-6">
                        {group.permissions.map((perm) => {
                          const isGranted = grantedCodesSet.has(perm.code);
                          return (
                            <div
                              key={perm.code}
                              className={`flex items-start gap-2 py-1 px-2 rounded-md text-xs transition-colors ${
                                isGranted ? 'bg-emerald-50/50 text-slate-800 font-medium' : 'opacity-40 text-slate-400'
                              }`}
                            >
                              <Checkbox
                                checked={isGranted}
                                disabled
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1 flex flex-wrap items-center justify-between gap-1">
                                <span className="font-mono text-xs">{perm.code}</span>
                                {perm.sensitive && (
                                  <Tag color="volcano" className="!mr-0 !text-[10px] !py-0 !px-1">
                                    Sensitive
                                  </Tag>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </Form>
    </FormDrawer>
  );
}
