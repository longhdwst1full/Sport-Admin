import { Table } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import type { TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTableSurface, type TableSurface } from './table-surface';
import {
  ADMIN_TABLE_BODY_HEIGHT,
  ADMIN_TABLE_DEFAULT_COLUMN_WIDTH,
  ADMIN_TABLE_DEFAULT_PAGE_SIZE,
  ADMIN_TABLE_PAGE_SIZE_OPTIONS,
  withFixedColumnWidths,
} from './table-config';

export interface AdminTableProps<RecordType extends object>
  extends Omit<TableProps<RecordType>, 'columns'> {
  columns?: ColumnsType<RecordType>;
  defaultColumnWidth?: number;
  /**
   * Bảng đang nằm ở đâu, chứ không phải nó phải trông thế nào.
   *
   * - `page`: bảng danh sách chính của một màn. Thân bảng cao hết phần còn lại của màn hình và tiêu
   *   đề cột đứng yên, vì 30 dòng đẩy cả trang dài ra làm tiêu đề trôi mất.
   * - `embedded`: bảng trong drawer, modal hoặc thẻ chi tiết. Ở đó bảng chỉ có vài dòng; ép cao
   *   theo viewport sẽ để lại một khoảng trống lớn dưới dòng cuối.
   *
   * Bỏ trống thì suy từ ngữ cảnh: `ManagementPage` khai `page` cho phần nội dung của nó, còn bảng
   * nằm trong drawer/modal luôn là `embedded`. Chỉ truyền tay khi một bảng cần khác với chỗ nó đứng.
   */
  surface?: TableSurface;
}

/**
 * Table shell dùng chung cho Admin: width cố định, luôn có horizontal scroll và
 * pagination mặc định 30 dòng. Feature chỉ còn sở hữu column content và server query.
 */
export function AdminTable<RecordType extends object>({
  columns,
  defaultColumnWidth = ADMIN_TABLE_DEFAULT_COLUMN_WIDTH,
  surface,
  pagination,
  scroll,
  tableLayout = 'fixed',
  locale,
  size = 'small',
  ...props
}: AdminTableProps<RecordType>) {
  const normalizedPagination =
    pagination === false
      ? false
      : {
          defaultPageSize: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
          showSizeChanger: true,
          pageSizeOptions: ADMIN_TABLE_PAGE_SIZE_OPTIONS,
          responsive: true,
          ...pagination,
        };

  const contextSurface = useTableSurface();
  const containerRef = useRef<HTMLDivElement>(null);
  /**
   * Drawer và modal của antd render qua portal ra `document.body`, nhưng React context vẫn chảy
   * theo cây component — nên một bảng trong drawer mở từ màn danh sách sẽ thừa hưởng `page` và cao
   * bằng cả màn hình. Kiểm tra tổ tiên trong DOM là cách duy nhất phân biệt được hai chỗ này.
   */
  const [insideOverlay, setInsideOverlay] = useState(false);
  useLayoutEffect(() => {
    setInsideOverlay(Boolean(containerRef.current?.closest('.ant-drawer, .ant-modal')));
  }, []);
  const effectiveSurface: TableSurface =
    surface ?? (insideOverlay ? 'embedded' : contextSurface);

  const copyCellOnDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest('td');
    const value = cell?.innerText.trim();
    if (!value || !navigator.clipboard) return;
    // UX: double-click sao chép nội dung ô; không thêm icon copy làm nhiễu table.
    void navigator.clipboard.writeText(value);
  };

  return (
    <div ref={containerRef} onDoubleClick={copyCellOnDoubleClick}>
      <Table<RecordType>
        size={size}
        {...props}
        columns={withFixedColumnWidths(columns, defaultColumnWidth)}
        tableLayout={tableLayout}
        scroll={{
          ...scroll,
          x: scroll?.x ?? 'max-content',
          // `scroll.y` do chỗ gọi truyền vào luôn thắng: vài bảng có chiều cao riêng theo bố cục.
          ...(effectiveSurface === 'page' && scroll?.y === undefined
            ? { y: ADMIN_TABLE_BODY_HEIGHT }
            : {}),
        }}
        pagination={normalizedPagination}
        locale={{
          emptyText: (
            <div className="py-8 text-center select-none">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
                <InboxOutlined className="text-xl" />
              </div>
              <div className="text-xs font-semibold text-slate-600">Không có dữ liệu</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Chưa có bản ghi nào hoặc không khớp với bộ lọc hiện tại.
              </div>
            </div>
          ),
          ...locale,
        }}
      />
    </div>
  );
}
