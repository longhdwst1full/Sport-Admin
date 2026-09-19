import { Table } from 'antd';
import type { MouseEvent } from 'react';
import type { TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ADMIN_TABLE_DEFAULT_COLUMN_WIDTH,
  ADMIN_TABLE_PAGE_SIZE_OPTIONS,
  withFixedColumnWidths,
} from './table-config';

export interface AdminTableProps<RecordType extends object>
  extends Omit<TableProps<RecordType>, 'columns'> {
  columns?: ColumnsType<RecordType>;
  defaultColumnWidth?: number;
}

/**
 * Table shell dùng chung cho Admin: width cố định, luôn có horizontal scroll và
 * pagination 20/50/100. Feature chỉ còn sở hữu column content và server query.
 */
export function AdminTable<RecordType extends object>({
  columns,
  defaultColumnWidth = ADMIN_TABLE_DEFAULT_COLUMN_WIDTH,
  pagination,
  scroll,
  tableLayout = 'fixed',
  locale,
  ...props
}: AdminTableProps<RecordType>) {
  const normalizedPagination =
    pagination === false
      ? false
      : {
          defaultPageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ADMIN_TABLE_PAGE_SIZE_OPTIONS,
          responsive: true,
          ...pagination,
        };

  const copyCellOnDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest('td');
    const value = cell?.innerText.trim();
    if (!value || !navigator.clipboard) return;
    // UX: double-click sao chép nội dung ô; không thêm icon copy làm nhiễu table.
    void navigator.clipboard.writeText(value);
  };

  return (
    <div onDoubleClick={copyCellOnDoubleClick}>
      <Table<RecordType>
        {...props}
        columns={withFixedColumnWidths(columns, defaultColumnWidth)}
        tableLayout={tableLayout}
        scroll={{ ...scroll, x: scroll?.x ?? 'max-content' }}
        pagination={normalizedPagination}
        locale={{ emptyText: 'Không có dữ liệu.', ...locale }}
      />
    </div>
  );
}
