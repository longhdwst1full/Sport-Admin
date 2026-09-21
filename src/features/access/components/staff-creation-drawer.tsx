import { CACHE_POLICY } from '@/app/config/query-cache-policy';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Drawer,
  Form,
  Input,
  Select,
  Spin,
  Tag,
} from 'antd';
import {
  SafetyCertificateOutlined,
  ShopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useDebounce } from 'use-debounce';
import * as yup from 'yup';
import { useQueryClient } from '@tanstack/react-query';
import { ENTITY_ID_PATTERN } from '@/lib/validation/entity-id';
import {
  getListAdminUsersQueryKey,
  useCreateAdminStaffUser,
  useListAdminPermissions,
  useListAdminRoles,
} from '@/generated/api/iam/iam';
import {
  CreateStaffUserDtoRoleCode,
  type CreateStaffUserDtoRoleCode as StaffRoleCode,
  type PermissionDto,
} from '@/generated/api/iam/models';
import { useSearchActiveAdminBranches } from '@/generated/api/organization/organization';
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api/error';
import { type StaffFormValues, toCreateStaffUserDto } from '../model/staff-creation.mapper';

const schema: yup.ObjectSchema<StaffFormValues> = yup.object({
  displayName: yup.string().trim().required('Nhập tên nhân viên').max(255, 'Tối đa 255 ký tự'),
  email: yup.string().trim().email('Email không hợp lệ').required('Nhập email').max(255, 'Tối đa 255 ký tự'),
  roleCode: yup
    .mixed<StaffRoleCode>()
    .oneOf(Object.values(CreateStaffUserDtoRoleCode))
    .required('Vui lòng chọn vai trò'),
  branchId: yup.string().matches(ENTITY_ID_PATTERN, 'Chi nhánh không hợp lệ').required('Vui lòng chọn chi nhánh'),
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

export function StaffCreationDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [branchSearch, setBranchSearch] = useState('');
  const [debouncedBranchSearch] = useDebounce(branchSearch.trim(), 300);
  const [showMatrix, setShowMatrix] = useState(true);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = useForm<StaffFormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      displayName: '',
      email: '',
      roleCode: CreateStaffUserDtoRoleCode.STAFF,
      branchId: '',
    },
  });

  const selectedRole = useWatch({ control, name: 'roleCode' });

  // Fetch actual roles and permissions defined in OpenAPI / backend
  const rolesQuery = useListAdminRoles({ query: { enabled: open } });
  const permissionsQuery = useListAdminPermissions({ query: { enabled: open } });

  const branchesQuery = useSearchActiveAdminBranches(
    { search: debouncedBranchSearch || undefined, page: 1, limit: 20 },
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

  // Find the selected RoleDto from API
  const selectedRoleDto = useMemo(() => {
    return roles.find((r) => r.code === selectedRole);
  }, [roles, selectedRole]);

  const grantedCodesSet = useMemo(() => {
    return new Set(selectedRoleDto?.permissionCodes ?? []);
  }, [selectedRoleDto]);

  const createStaff = useCreateAdminStaffUser({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
        void message.success('Đã tạo nhân viên và gán quyền theo chi nhánh.');
        reset();
        onClose();
      },
      onError: (error) => {
        const fields = getApiFieldErrors(error);
        Object.entries(fields).forEach(([field, fieldMessage]) => {
          if (field in schema.fields) {
            setError(field as keyof StaffFormValues, { message: fieldMessage });
          }
        });
        void message.error(getApiErrorMessage(error, 'Không thể tạo nhân viên.'));
      },
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        displayName: '',
        email: '',
        roleCode: CreateStaffUserDtoRoleCode.STAFF,
        branchId: '',
      });
      setBranchSearch('');
    }
  }, [open, reset]);

  const submit = handleSubmit((values) => {
    createStaff.mutate({
      data: toCreateStaffUserDto(values),
    });
  });

  const totalGranted = grantedCodesSet.size;
  const totalPossible = permissions.length;

  return (
    <Drawer
      open={open}
      width={620}
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
      destroyOnHidden
      className="dctd-staff-drawer"
      footer={
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Quyền kích hoạt: <strong className="text-emerald-700 font-semibold">{totalGranted}</strong>/{totalPossible} quyền
          </span>
          <div className="flex gap-2">
            <Button onClick={onClose} className="!rounded-xl">
              Hủy
            </Button>
            <Button
              type="primary"
              loading={createStaff.isPending}
              onClick={() => void submit()}
              className="!rounded-xl !bg-emerald-600 hover:!bg-emerald-500 !font-semibold !px-5 shadow-xs"
            >
              {createStaff.isPending ? 'Đang khởi tạo...' : 'Tạo nhân viên'}
            </Button>
          </div>
        </div>
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
                options={(branchesQuery.data?.items ?? []).map((branch) => ({
                  value: branch.id,
                  label: `${branch.code} — ${branch.label}`,
                }))}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Card: Quản lý chi nhánh */}
            <div
              onClick={() => setValue('roleCode', CreateStaffUserDtoRoleCode.BRANCH_MANAGER, { shouldValidate: true })}
              className={`relative flex flex-col justify-between rounded-xl border p-3.5 cursor-pointer transition-all duration-200 ${
                selectedRole === CreateStaffUserDtoRoleCode.BRANCH_MANAGER
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500/30'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedRole === CreateStaffUserDtoRoleCode.BRANCH_MANAGER}
                      className="dctd-role-checkbox"
                    />
                    <span className="text-sm font-bold text-slate-900">Quản lý chi nhánh</span>
                  </div>
                  <Tag color="emerald" className="!mr-0 !rounded-md !text-[10px] !font-medium">
                    Quản lý
                  </Tag>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 m-0">
                  Toàn quyền điều hành hàng hóa, kiểm kê tồn kho, duyệt chuyển kho và đơn hàng tại chi nhánh.
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                <span className="flex items-center gap-1">
                  <SafetyCertificateOutlined />{' '}
                  {roles.find((r) => r.code === 'BRANCH_MANAGER')?.permissionCodes.length ?? 32} quyền
                </span>
                <span className="font-mono text-[10px] text-slate-400">BRANCH_MANAGER</span>
              </div>
            </div>

            {/* Card: Nhân viên */}
            <div
              onClick={() => setValue('roleCode', CreateStaffUserDtoRoleCode.STAFF, { shouldValidate: true })}
              className={`relative flex flex-col justify-between rounded-xl border p-3.5 cursor-pointer transition-all duration-200 ${
                selectedRole === CreateStaffUserDtoRoleCode.STAFF
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500/30'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedRole === CreateStaffUserDtoRoleCode.STAFF}
                      className="dctd-role-checkbox"
                    />
                    <span className="text-sm font-bold text-slate-900">Nhân viên vận hành</span>
                  </div>
                  <Tag color="blue" className="!mr-0 !rounded-md !text-[10px] !font-medium">
                    Vận hành
                  </Tag>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 m-0">
                  Tra cứu danh mục sản phẩm, theo dõi tồn kho và tiếp nhận, xử lý đơn đặt hàng hàng ngày.
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-blue-800 font-medium">
                <span className="flex items-center gap-1">
                  <SafetyCertificateOutlined />{' '}
                  {roles.find((r) => r.code === 'STAFF')?.permissionCodes.length ?? 18} quyền
                </span>
                <span className="font-mono text-[10px] text-slate-400">STAFF</span>
              </div>
            </div>
          </div>
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
                {selectedRole === CreateStaffUserDtoRoleCode.BRANCH_MANAGER ? 'Vai trò Quản lý' : 'Vai trò Nhân viên'}
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
    </Drawer>
  );
}
