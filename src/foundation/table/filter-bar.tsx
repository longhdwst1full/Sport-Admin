import type { ReactNode } from 'react';

/**
 * Bố cục chuẩn cho prop `filters` của `ManagementPage`: ô tìm/lọc bên trái, hành động (làm mới, tuỳ
 * chỉnh cột, tạo mới) luôn bám mép phải đối diện ô tìm — kể cả khi hàng lọc xuống dòng trên màn hẹp.
 * `RefreshButton` thuộc về `actions`, không đặt chung với ô lọc.
 */
export function FilterBar({ children, actions }: { children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{children}</div>
      {actions && <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
