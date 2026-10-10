import { SafetyCertificateOutlined } from '@ant-design/icons';
import { Button, Checkbox, Spin, Tag } from 'antd';
import { useState } from 'react';
import type { PermissionGroup } from '../model/permission-groups';

interface StaffPermissionMatrixProps {
  groups: readonly PermissionGroup[];
  granted: ReadonlySet<string>;
  totalPossible: number;
  /** Tóm tắt phạm vi đang chọn ở góc phải tiêu đề. */
  scopeSummary: string;
  loading: boolean;
}

/** Ma trận quyền chỉ đọc: quyền hiệu lực = hợp các vai trò đã chọn, đọc từ API. */
export function StaffPermissionMatrix({
  groups,
  granted,
  totalPossible,
  scopeSummary,
  loading,
}: StaffPermissionMatrixProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden mb-2">
      <div
        onClick={() => setExpanded((value) => !value)}
        className="flex items-center justify-between px-4 py-3 bg-slate-100/70 cursor-pointer hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <SafetyCertificateOutlined className="text-emerald-600" />
          <span>
            Ma trận quyền hạn theo hợp đồng API ({granted.size}/{totalPossible})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-700 font-semibold">{scopeSummary}</span>
          <Button type="text" size="small" className="!text-xs !text-slate-500">
            {expanded ? 'Thu gọn ▲' : 'Xem chi tiết ▼'}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-3.5 space-y-3.5 max-h-[340px] overflow-y-auto">
          {loading ? (
            <div className="py-6 text-center">
              <Spin size="small" />
            </div>
          ) : (
            groups.map((group) => {
              const grantedInGroup = group.permissions.filter((p) => granted.has(p.code)).length;
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
                    {group.permissions.map((permission) => {
                      const isGranted = granted.has(permission.code);
                      return (
                        <div
                          key={permission.code}
                          className={`flex items-start gap-2 py-1 px-2 rounded-md text-xs transition-colors ${
                            isGranted ? 'bg-emerald-50/50 text-slate-800 font-medium' : 'opacity-40 text-slate-400'
                          }`}
                        >
                          <Checkbox checked={isGranted} disabled className="mt-0.5" />
                          <div className="min-w-0 flex-1 flex flex-wrap items-center justify-between gap-1">
                            <span className="font-mono text-xs">{permission.code}</span>
                            {permission.sensitive && (
                              <Tag color="volcano" className="!mr-0 !text-[10px] !py-0 !px-1">
                                Nhạy cảm
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
  );
}
