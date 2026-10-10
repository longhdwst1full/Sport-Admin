import { SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, Checkbox, Spin, Tag } from 'antd';
import type { AssignableStaffRoleCode } from '@/generated/api/iam/iam.schemas';
import { ASSIGNABLE_ROLE_PRESENTATION } from '../constants/access.constants';
import type { AssignableRole } from '../model/role-assignment.mapper';

interface AssignableRoleCardsProps {
  roles: readonly AssignableRole[];
  selected: string;
  onSelect: (code: AssignableStaffRoleCode) => void;
  loading: boolean;
  loadError: boolean;
  /** `grid` (tạo nhân viên) có chân thẻ đếm số quyền; `list` (phân quyền) gọn một cột. */
  layout: 'grid' | 'list';
}

/** Chọn một vai trò gán được dưới dạng thẻ checkbox; tên/mô tả/số quyền luôn đọc từ `listAdminRoles`. */
export function AssignableRoleCards({
  roles,
  selected,
  onSelect,
  loading,
  loadError,
  layout,
}: AssignableRoleCardsProps) {
  if (loading) {
    return (
      <div className="py-6 text-center">
        <Spin size="small" />
      </div>
    );
  }

  const isGrid = layout === 'grid';
  return (
    <div className={isGrid ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-2.5'}>
      {roles.map((role) => {
        const isSelected = selected === role.code;
        const presentation = ASSIGNABLE_ROLE_PRESENTATION[role.code];
        return (
          <div
            key={role.code}
            onClick={() => onSelect(role.code)}
            className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
              isGrid ? 'relative flex flex-col justify-between duration-200' : ''
            } ${
              isSelected
                ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500/30'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div>
              <div className={`flex items-center justify-between ${isGrid ? 'mb-1.5' : 'mb-1'}`}>
                <div className={`flex items-center ${isGrid ? 'gap-2' : 'gap-2.5'}`}>
                  <Checkbox checked={isSelected} className="dctd-role-checkbox" />
                  <span className="text-sm font-bold text-slate-900">{role.name}</span>
                </div>
                <Tag color={presentation.color} className="!mr-0 !rounded-md !text-[10px] !font-medium">
                  {presentation.tag}
                </Tag>
              </div>
              <p className={`text-xs text-slate-500 m-0 ${isGrid ? 'line-clamp-2' : 'pl-7'}`}>
                {role.description || presentation.fallbackDescription}
              </p>
            </div>

            {isGrid && (
              <div
                className={`mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium ${presentation.accentClass}`}
              >
                <span className="flex items-center gap-1">
                  <SafetyCertificateOutlined /> {role.permissionCodes.length} quyền
                </span>
                <span className="font-mono text-[10px] text-slate-400">{role.code}</span>
              </div>
            )}
          </div>
        );
      })}
      {roles.length === 0 && (
        <Alert
          className={isGrid ? 'sm:col-span-2' : undefined}
          type="warning"
          showIcon
          message={loadError ? 'Không tải được danh sách vai trò' : 'Chưa có vai trò gán được'}
        />
      )}
    </div>
  );
}
