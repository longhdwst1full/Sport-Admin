import type { ColumnsType } from 'antd/es/table';

export const ADMIN_TABLE_DEFAULT_COLUMN_WIDTH = 160;
export const ADMIN_TABLE_PAGE_SIZE_OPTIONS = ['20', '50', '100'];

/** Bổ sung width cho cột chưa khai báo, kể cả column group lồng nhau. */
export function withFixedColumnWidths<RecordType extends object>(
  columns: ColumnsType<RecordType> | undefined,
  defaultWidth = ADMIN_TABLE_DEFAULT_COLUMN_WIDTH,
): ColumnsType<RecordType> | undefined {
  return columns?.map((column) => {
    if ('children' in column && column.children) {
      return {
        ...column,
        children: withFixedColumnWidths(column.children, defaultWidth),
      };
    }
    return { ...column, width: column.width ?? defaultWidth };
  });
}
