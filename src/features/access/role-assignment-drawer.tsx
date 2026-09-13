import { useEffect, useState } from 'react';
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Checkbox,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Tag,
} from 'antd';
import {
  CheckOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import * as yup from 'yup';
import {
  getListAdminUsersQueryKey,
  useAssignAdminUserRole,
  useSearchActiveAdminRoles,
} from '@/generated/api/iam/iam';
import {
  AssignUserRoleDtoRoleCode,
  type UserDto,
} from '@/generated/api/iam/models';
import {
  useSearchActiveAdminBranches,
} from '@/generated/api/organization/organization';
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api/error';
import {
  type AssignmentFormValues,
  toAssignUserRoleDto,
} from './role-assignment.mapper';

interface RoleAssignmentDrawerProps {
  user?: UserDto;
  open: boolean;
  onClose: () => void;
}

const schema: yup.ObjectSchema<AssignmentFormValues> = yup.object({
  roleCode: yup
    .mixed<AssignmentFormValues['roleCode']>()
    .oneOf(Object.values(AssignUserRoleDtoRoleCode))
    .required('Vui lòng chọn vai trò cần gán'),
  branchId: yup.string().required('Vui lòng chọn chi nhánh'),
});

const ROLE_PREVIEWS: Record<
  string,
  { label: string; desc: string; tone: string; permissions: string[] }
> = {
  BRANCH_MANAGER: {
    label: 'Quản lý chi nhánh',
    desc: 'Toàn quyền điều hành kho, đơn hàng, phân quyền nhân sự chi nhánh',
    tone: 'emerald',
    permissions: [
      'catalog.product.manage',
      'catalog.category.manage',
      'order.manage',
      'order.cancel',
      'inventory.stock.adjust',
      'inventory.transfer.manage',
      'iam.user.view',
      'review.moderate',
    ],
  },
  STAFF: {
    label: 'Nhân viên vận hành',
    desc: 'Tiếp nhận đơn hàng, xem tồn kho sản phẩm, xem thông tin khách hàng',
    tone: 'blue',
    permissions: [
      'catalog.product.view',
      'catalog.category.view',
      'order.view',
      'order.manage',
      'inventory.stock.view',
      'customer.view',
      'review.view',
    ],
  },
};

export function RoleAssignmentDrawer({ user, open, onClose }: RoleAssignmentDrawerProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [branchSearch, setBranchSearch] = useState('');
  const [debouncedBranchSearch] = useDebounce(branchSearch.trim(), 300);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = useForm<AssignmentFormValues>({
    resolver: yupResolver(schema),
    defaultValues: { roleCode: 'STAFF', branchId: '' },
  });

  const selectedRole = useWatch({ control, name: 'roleCode' });

  const branchesQuery = useSearchActiveAdminBranches(
    { search: debouncedBranchSearch || undefined, page: 1, limit: 20 },
    { query: { enabled: open } },
  );

  const assignment = useAssignAdminUserRole({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
        void message.success('Đã gán vai trò cho người dùng thành công.');
        reset();
        onClose();
      },
      onError: (error) => {
        const fields = getApiFieldErrors(error);
        Object.entries(fields).forEach(([field, fieldMessage]) => {
          if (field in schema.fields) {
            setError(field as keyof AssignmentFormValues, { message: fieldMessage });
          }
        });
        void message.error(getApiErrorMessage(error, 'Không thể gán vai trò.'));
      },
    },
  });

  useEffect(() => {
    if (!open) {
      reset({ roleCode: 'STAFF', branchId: '' });
      setBranchSearch('');
    }
  }, [open, reset]);

  const submit = handleSubmit((values) => {
    if (!user) return;
    assignment.mutate({
      userId: user.id,
      data: toAssignUserRoleDto(values),
    });
  });

  return (
    <Drawer
      open={open}
      width={560}
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <SafetyCertificateOutlined />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900">Gán vai trò người dùng</div>
            <div className="text-xs text-slate-500 font-normal">
              Phân bổ vai trò và chi nhánh hoạt động cho nhân sự
            </div>
          </div>
        </div>
      }
      onClose={onClose}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} className="!rounded-xl">
            Hủy
          </Button>
          <Button
            type="primary"
            loading={assignment.isPending}
            onClick={() => void submit()}
            className="!rounded-xl !bg-emerald-600 hover:!bg-emerald-500 !font-semibold !px-5"
          >
            {assignment.isPending ? 'Đang lưu...' : 'Gán vai trò'}
          </Button>
        </div>
      }
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
            <div className="mt-1 flex flex-wrap gap-1">
              {user.assignments?.map((a) => (
                <Tag key={a.id} className="!mr-0 !text-[10px] !bg-white !border-slate-200">
                  {a.roleCode} ({a.scopeType})
                </Tag>
              ))}
            </div>
          </div>
        </div>
      )}

      <Form layout="vertical">
        {/* ── Checkbox Role Selection ───────────────────────────── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700">
              Chọn vai trò cần gán <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Dạng thẻ Checkbox chọn vai trò</span>
          </div>

          <div className="space-y-2.5">
            {/* BRANCH_MANAGER */}
            <div
              onClick={() => setValue('roleCode', AssignUserRoleDtoRoleCode.BRANCH_MANAGER, { shouldValidate: true })}
              className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                selectedRole === AssignUserRoleDtoRoleCode.BRANCH_MANAGER
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500/30'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    checked={selectedRole === AssignUserRoleDtoRoleCode.BRANCH_MANAGER}
                    className="dctd-role-checkbox"
                  />
                  <span className="text-sm font-bold text-slate-900">Quản lý chi nhánh</span>
                </div>
                <Tag color="emerald" className="!mr-0 !text-[10px] !font-medium">
                  BRANCH_MANAGER
                </Tag>
              </div>
              <p className="text-xs text-slate-500 pl-7 m-0">
                {ROLE_PREVIEWS.BRANCH_MANAGER.desc}
              </p>
            </div>

            {/* STAFF */}
            <div
              onClick={() => setValue('roleCode', AssignUserRoleDtoRoleCode.STAFF, { shouldValidate: true })}
              className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                selectedRole === AssignUserRoleDtoRoleCode.STAFF
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500/30'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    checked={selectedRole === AssignUserRoleDtoRoleCode.STAFF}
                    className="dctd-role-checkbox"
                  />
                  <span className="text-sm font-bold text-slate-900">Nhân viên vận hành</span>
                </div>
                <Tag color="blue" className="!mr-0 !text-[10px] !font-medium">
                  STAFF
                </Tag>
              </div>
              <p className="text-xs text-slate-500 pl-7 m-0">
                {ROLE_PREVIEWS.STAFF.desc}
              </p>
            </div>
          </div>
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
              <Select
                {...field}
                showSearch
                filterOption={false}
                onSearch={setBranchSearch}
                loading={branchesQuery.isFetching}
                options={(branchesQuery.data?.items ?? []).map((item) => ({
                  value: item.id,
                  label: `${item.code} — ${item.label}`,
                }))}
                placeholder="Tìm và chọn chi nhánh hoạt động"
                className="w-full"
                suffixIcon={<ShopOutlined className="text-slate-400" />}
              />
            )}
          />
        </Form.Item>

        {/* ── Included Permissions Preview (Checkbox Tags) ─────── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <SafetyCertificateOutlined className="text-emerald-600" />
              Quyền hạn đi kèm vai trò ({ROLE_PREVIEWS[selectedRole]?.permissions.length ?? 0})
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">Tự động kích hoạt</span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {(ROLE_PREVIEWS[selectedRole]?.permissions ?? []).map((perm) => (
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
    </Drawer>
  );
}
