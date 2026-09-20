import { Table } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { MouseEvent } from 'react';
import type { TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ADMIN_TABLE_DEFAULT_COLUMN_WIDTH,
  ADMIN_TABLE_DEFAULT_PAGE_SIZE,
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
 * pagination mặc định 30 dòng. Feature chỉ còn sở hữu column content và server query.
 */
export function AdminTable<RecordType extends object>({
  columns,
  defaultColumnWidth = ADMIN_TABLE_DEFAULT_COLUMN_WIDTH,
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
        size={size}
        {...props}
        columns={withFixedColumnWidths(columns, defaultColumnWidth)}
        tableLayout={tableLayout}
        scroll={{ ...scroll, x: scroll?.x ?? 'max-content' }}
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
