import { ShopOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Form, Input, Select } from 'antd';
import { Controller } from 'react-hook-form';
import { CreateStaffUserDtoRoleCode, type MfaProvisioningDto } from '@/generated/api/iam/iam.schemas';
import { FormDrawer } from '@/foundation/overlay';
import { useStaffCreationForm } from '../hooks/use-staff-creation-form';
import { AssignableRoleCards } from './assignable-role-cards';
import { ExtraAssignmentRows } from './extra-assignment-rows';
import { StaffPermissionMatrix } from './staff-permission-matrix';

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
  const staff = useStaffCreationForm({ open, onClose, onMfaProvisioned });
  const {
    control,
    setValue,
    formState: { errors, isDirty },
  } = staff.form;

  const totalGranted = staff.grantedCodes.size;
  const totalPossible = staff.totalPossible;
  const scopeSummary =
    staff.extraRows.fields.length > 0
      ? `${staff.extraRows.fields.length + 1} phạm vi`
      : staff.selectedRole === CreateStaffUserDtoRoleCode.BRANCH_MANAGER
        ? 'Vai trò Quản lý'
        : 'Vai trò Nhân viên';

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
      onClose={staff.close}
      onSubmit={() => void staff.submit()}
      submitting={staff.submitting}
      submitText={staff.submitting ? 'Đang khởi tạo...' : 'Tạo nhân viên'}
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
                onSearch={staff.setBranchSearch}
                loading={staff.branchesQuery.isFetching}
                options={staff.branchOptions}
                placeholder="Chọn chi nhánh đang hoạt động"
                notFoundContent={staff.branchesQuery.isError ? 'Không tải được chi nhánh' : undefined}
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

          <AssignableRoleCards
            layout="grid"
            roles={staff.assignableRoles}
            selected={staff.selectedRole}
            onSelect={(code) => setValue('roleCode', code, { shouldValidate: true })}
            loading={staff.rolesQuery.isPending}
            loadError={staff.rolesQuery.isError}
          />
        </div>

        <ExtraAssignmentRows
          control={control}
          errors={errors.extraAssignments}
          rows={staff.extraRows}
          roleOptions={staff.assignableRoleOptions}
        />

        <StaffPermissionMatrix
          groups={staff.permissionGroups}
          granted={staff.grantedCodes}
          totalPossible={totalPossible}
          scopeSummary={scopeSummary}
          loading={staff.permissionsQuery.isLoading}
        />
      </Form>
    </FormDrawer>
  );
}
