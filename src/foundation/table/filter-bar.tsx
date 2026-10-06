import type { ReactNode } from 'react';

/**
 * Bố cục chuẩn cho prop `filters` của `ManagementPage`: ô lọc bên trái (tự xuống dòng), hành động
 * (làm mới, tuỳ chỉnh cột, tạo mới) bên phải; xếp dọc trên màn hẹp.
 */
export function FilterBar({ children, actions }: { children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">{children}</div>
      {actions && <div className="flex flex-wrap items-center gap-2 xl:justify-end">{actions}</div>}
    </div>
  );
}
