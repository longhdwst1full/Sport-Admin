import { useEffect, useState } from 'react';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Checkbox,
  Collapse,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Tooltip,
} from 'antd';
import {
  CheckCircleFilled,
  CheckCircleOutlined,
  CheckOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useDebounce } from 'use-debounce';
import * as yup from 'yup';
import { useQueryClient } from '@tanstack/react-query';
import { ENTITY_ID_PATTERN } from '../../lib/validation/entity-id';
import {
  getListAdminUsersQueryKey,
  useCreateAdminStaffUser,
} from '@/generated/api/iam/iam';
import {
  CreateStaffUserDtoRoleCode,
  type CreateStaffUserDtoRoleCode as StaffRoleCode,
} from '@/generated/api/iam/models';
import { useSearchActiveAdminBranches } from '@/generated/api/organization/organization';
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api/error';
import { type StaffFormValues, toCreateStaffUserDto } from './staff-creation.mapper';

const schema: yup.ObjectSchema<StaffFormValues> = yup.object({
  displayName: yup.string().trim().required('Nhập tên nhân viên').max(255, 'Tối đa 255 ký tự'),
  email: yup.string().trim().email('Email không hợp lệ').required('Nhập email').max(255, 'Tối đa 255 ký tự'),
  roleCode: yup
    .mixed<StaffRoleCode>()
    .oneOf(Object.values(CreateStaffUserDtoRoleCode))
    .required('Vui lòng chọn vai trò'),
  branchId: yup.string().matches(ENTITY_ID_PATTERN, 'Chi nhánh không hợp lệ').required('Vui lòng chọn chi nhánh'),
});

// Definition of permissions grouped by module for visual checkbox matrix
interface PermissionGroup {
  module: string;
  label: string;
  icon: string;
  permissions: {
    code: string;
    label: string;
    roles: StaffRoleCode[];
  }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    module: 'catalog',
    label: 'Sản phẩm & Danh mục',
    icon: '📦',
    permissions: [
      { code: 'catalog.product.view', label: 'Xem danh sách & chi tiết sản phẩm', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER, CreateStaffUserDtoRoleCode.STAFF] },
      { code: 'catalog.product.manage', label: 'Tạo, sửa thông tin & giá sản phẩm', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER] },
      { code: 'catalog.category.view', label: 'Xem danh mục & thương hiệu', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER, CreateStaffUserDtoRoleCode.STAFF] },
      { code: 'catalog.category.manage', label: 'Quản lý danh mục & phân cấp', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER] },
      { code: 'catalog.price.view', label: 'Xem bảng giá niêm yết & khuyến mãi', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER, CreateStaffUserDtoRoleCode.STAFF] },
    ],
  },
  {
    module: 'order',
    label: 'Bán hàng & Đơn hàng',
    icon: '🛒',
    permissions: [
      { code: 'order.view', label: 'Xem danh sách đơn đặt hàng chi nhánh', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER, CreateStaffUserDtoRoleCode.STAFF] },
      { code: 'order.manage', label: 'Xử lý, xác nhận & cập nhật trạng thái đơn', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER, CreateStaffUserDtoRoleCode.STAFF] },
      { code: 'order.cancel', label: 'Duyệt hủy đơn & điều phối hoàn trả', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER] },
      { code: 'payment.view', label: 'Xem bằng chứng giao dịch & thanh toán', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER, CreateStaffUserDtoRoleCode.STAFF] },
    ],
  },
  {
    module: 'inventory',
    label: 'Kho vận & Tồn kho',
    icon: '🏭',
    permissions: [
      { code: 'inventory.stock.view', label: 'Tra cứu số lượng tồn kho khả dụng', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER, CreateStaffUserDtoRoleCode.STAFF] },
      { code: 'inventory.stock.adjust', label: 'Tạo phiếu kiểm kê & điều chỉnh tồn kho', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER] },
      { code: 'inventory.transfer.view', label: 'Xem danh sách phiếu điều chuyển', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER, CreateStaffUserDtoRoleCode.STAFF] },
      { code: 'inventory.transfer.manage', label: 'Duyệt xuất - nhập chuyển kho liên chi nhánh', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER] },
    ],
  },
  {
    module: 'customer',
    label: 'Khách hàng & Đánh giá',
    icon: '👥',
    permissions: [
      { code: 'customer.view', label: 'Xem thông tin khách hàng & lịch sử mua', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER, CreateStaffUserDtoRoleCode.STAFF] },
      { code: 'review.view', label: 'Xem danh sách đánh giá & bình luận', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER, CreateStaffUserDtoRoleCode.STAFF] },
      { code: 'review.moderate', label: 'Kiểm duyệt & ẩn/hiện đánh giá', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER] },
    ],
  },
  {
    module: 'branch',
    label: 'Nhân sự & Chi nhánh',
    icon: '🛡️',
    permissions: [
      { code: 'org.branch.view', label: 'Xem thông tin chi nhánh & kho trực thuộc', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER, CreateStaffUserDtoRoleCode.STAFF] },
      { code: 'iam.user.view', label: 'Xem danh sách nhân sự cùng chi nhánh', roles: [CreateStaffUserDtoRoleCode.BRANCH_MANAGER] },
    ],
  },
];

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

  const branchesQuery = useSearchActiveAdminBranches(
    { search: debouncedBranchSearch || undefined, page: 1, limit: 20 },
    { query: { enabled: open } },
  );

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
      reset();
      setBranchSearch('');
    }
  }, [open, reset]);

  const submit = handleSubmit((values) => {
    createStaff.mutate({
      data: toCreateStaffUserDto(values),
    });
  });

  // Calculate total permissions granted for currently selected role
  const totalGrantedCount = PERMISSION_GROUPS.reduce((acc, grp) => {
    return acc + grp.permissions.filter((p) => p.roles.includes(selectedRole)).length;
  }, 0);

  const totalPossibleCount = PERMISSION_GROUPS.reduce((acc, grp) => acc + grp.permissions.length, 0);

  return (
    <Drawer
      open={open}
      width={600}
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
            Đã gán: <strong className="text-emerald-700 font-semibold">{totalGrantedCount}</strong>/{totalPossibleCount} quyền
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
                  Toàn quyền điều hành hàng hóa, kiểm kê tồn kho, duyệt chuyển kho và quản lý đơn hàng tại chi nhánh.
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                <span className="flex items-center gap-1">
                  <SafetyCertificateOutlined /> 18 quyền hạn
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
                  <SafetyCertificateOutlined /> 11 quyền hạn
                </span>
                <span className="font-mono text-[10px] text-slate-400">STAFF</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Checkbox Permissions Matrix (Ma trận quyền hạn dạng Checkbox) ─ */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden mb-2">
          <div
            onClick={() => setShowMatrix(!showMatrix)}
            className="flex items-center justify-between px-4 py-3 bg-slate-100/70 cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <SafetyCertificateOutlined className="text-emerald-600" />
              <span>Ma trận quyền hạn chi tiết ({totalGrantedCount}/{totalPossibleCount})</span>
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
              {PERMISSION_GROUPS.map((group) => {
                const grantedInGroup = group.permissions.filter((p) => p.roles.includes(selectedRole)).length;
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
                        const isGranted = perm.roles.includes(selectedRole);
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
                              <span>{perm.label}</span>
                              <code className="text-[10px] text-slate-400 font-mono">{perm.code}</code>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Form>
    </Drawer>
  );
}
