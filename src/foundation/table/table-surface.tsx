/* eslint-disable react-refresh/only-export-components -- context, provider và hook của cùng một
   khái niệm nằm chung một file; tách hook sang file khác chỉ để chiều fast refresh sẽ làm khó đọc. */
import { createContext, useContext, type ReactNode } from 'react';

export type TableSurface = 'page' | 'embedded';

/**
 * Bảng đang nằm ở đâu.
 *
 * `embedded` là mặc định an toàn: bảng trong drawer, modal hay thẻ chi tiết chỉ có vài dòng, ép cao
 * theo viewport sẽ để lại khoảng trống lớn dưới dòng cuối. `ManagementPage` — vỏ của mọi màn danh
 * sách — tự khai `page` cho phần nội dung của nó, nên bảng chính của màn không phải khai gì cả.
 *
 * Khai một lần ở vỏ trang thay vì truyền `surface="page"` ở ba chục chỗ gọi: thêm màn mới là tự
 * đúng, và đổi quy ước chỉ phải sửa ở đây.
 */
const TableSurfaceContext = createContext<TableSurface>('embedded');

export function TableSurfaceProvider({
  value,
  children,
}: {
  value: TableSurface;
  children: ReactNode;
}) {
  return <TableSurfaceContext.Provider value={value}>{children}</TableSurfaceContext.Provider>;
}

export function useTableSurface(): TableSurface {
  return useContext(TableSurfaceContext);
}
