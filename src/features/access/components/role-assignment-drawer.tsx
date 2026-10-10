import { CheckOutlined, SafetyCertificateOutlined, ShopOutlined } from '@ant-design/icons';
import { Alert, Avatar, Button, Form, Input, Tag } from 'antd';
import { Controller } from 'react-hook-form';
import type { UserDto, UserRoleAssignmentDto } from '@/generated/api/iam/iam.schemas';
import { BranchSelect } from '@/features/organization';
import { StatusTag } from '@/foundation/management';
import { FormDrawer } from '@/foundation/overlay';
import { roleCodeLabel, USER_STATUS_PRESENTATION } from '../constants/access.constants';
import { useRoleAssignmentEditor } from '../hooks/use-role-assignment-editor';
import { AssignableRoleCards } from './assignable-role-cards';
import { CurrentAssignmentList } from './current-assignment-list';

interface RoleAssignmentDrawerProps {
  user?: UserDto;
  open: boolean;
  onClose: () => void;
  /** Thu hồi đi qua modal xác nhận có lý do của trang (`RoleAssignmentRevokeModal`). */
  onRevoke: (assignment: UserRoleAssignmentDto) => void;
}

export function RoleAssignmentDrawer({ user, open, onClose, onRevoke }: RoleAssignmentDrawerProps) {
  const editor = useRoleAssignmentEditor({ user, open, onClose });
  const { editing, saving } = editor;
  const {
    control,
    setValue,
    formState: { errors, isDirty },
  } = editor.form;

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
              Thêm, sửa, thu hồi vai trò và chi nhánh hoạt động
            </div>
          </div>
        </div>
      }
      onClose={editor.close}
      onSubmit={() => void editor.submit()}
      submitting={saving}
      submitText={saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Gán vai trò'}
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
              <StatusTag status={user.status} presentations={USER_STATUS_PRESENTATION} />
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
            <Button type="link" size="small" className="!text-xs" onClick={editor.startAdd}>
              + Gán vai trò mới
            </Button>
          )}
        </div>
        <CurrentAssignmentList
          assignments={editor.assignments}
          editingId={editing?.id}
          disabled={saving}
          roleName={editor.roleName}
          branchLabel={editor.branchLabel}
          onEdit={editor.startEdit}
          onRevoke={onRevoke}
        />
      </div>

      <Form layout="vertical">
        {editing && (
          <Alert
            className="mb-4 !rounded-xl"
            type="info"
            showIcon
            message={`Đang sửa ${roleCodeLabel(editing.roleCode)} tại ${editor.branchLabel(editing.branchId)}`}
            description="Hệ thống gán vai trò/chi nhánh mới trước rồi mới thu hồi phân quyền cũ (giữ bản đã thu hồi để đối soát)."
          />
        )}

        {/* ── Checkbox Role Selection ─────────────── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700">
              {editing ? 'Vai trò mới' : 'Chọn vai trò cần gán'} <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Dạng thẻ Checkbox</span>
          </div>

          <AssignableRoleCards
            layout="list"
            roles={editor.assignableRoles}
            selected={editor.selectedRole}
            onSelect={(code) => setValue('roleCode', code, { shouldValidate: true })}
            loading={editor.rolesQuery.isPending}
            loadError={editor.rolesQuery.isError}
          />
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
                seedLabel={field.value ? editor.branchLabel(field.value) : undefined}
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

        {/* ── Xem trước quyền của vai trò ────────────── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <SafetyCertificateOutlined className="text-emerald-600" />
              Quyền hạn theo vai trò ({editor.selectedRoleDto?.permissionCodes?.length ?? 0})
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">Theo vai trò API</span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
            {(editor.selectedRoleDto?.permissionCodes ?? []).map((perm) => (
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
