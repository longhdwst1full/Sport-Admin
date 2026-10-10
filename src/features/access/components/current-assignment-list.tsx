import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Empty, Tag } from 'antd';
import type { UserRoleAssignmentDto } from '@/generated/api/iam/iam.schemas';
import { roleCodeLabel, SCOPE_TYPE_LABELS } from '../constants/access.constants';
import { isEditableAssignment } from '../model/role-assignment.mapper';

interface CurrentAssignmentListProps {
  assignments: readonly UserRoleAssignmentDto[];
  editingId?: string;
  disabled: boolean;
  roleName: (code: string) => string;
  branchLabel: (branchId?: string) => string;
  onEdit: (assignment: UserRoleAssignmentDto) => void;
  onRevoke: (assignment: UserRoleAssignmentDto) => void;
}

/** Danh sách vai trò + phạm vi hiện có; chỉ assignment BRANCH của vai trò cấp dưới mới sửa/thu hồi được. */
export function CurrentAssignmentList({
  assignments,
  editingId,
  disabled,
  roleName,
  branchLabel,
  onEdit,
  onRevoke,
}: CurrentAssignmentListProps) {
  if (assignments.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có vai trò nào" />;
  }

  return (
    <div className="space-y-2">
      {assignments.map((assignment) => {
        const editable = isEditableAssignment(assignment);
        const isEditing = editingId === assignment.id;
        const roleLabel = roleCodeLabel(assignment.roleCode);
        const branch = branchLabel(assignment.branchId);
        return (
          <div
            key={assignment.id}
            className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 ${
              isEditing ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/30' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">{roleName(assignment.roleCode)}</span>
                <Tag
                  color={assignment.roleCode === 'BRANCH_MANAGER' ? 'green' : 'blue'}
                  className="!mr-0 !text-[10px]"
                >
                  {roleLabel}
                </Tag>
              </div>
              <div className="text-xs text-slate-500 truncate">
                {SCOPE_TYPE_LABELS[assignment.scopeType]} · {branch}
              </div>
            </div>
            {editable && (
              <div className="flex shrink-0 gap-1">
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined />}
                  disabled={disabled}
                  aria-label={`Sửa ${roleLabel} tại ${branch}`}
                  onClick={() => onEdit(assignment)}
                />
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={disabled}
                  aria-label={`Thu hồi ${roleLabel} tại ${branch}`}
                  onClick={() => onRevoke(assignment)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
