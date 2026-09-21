import type { ColumnsType } from 'antd/es/table';

export const ADMIN_TABLE_DEFAULT_COLUMN_WIDTH = 160;
export const ADMIN_TABLE_DEFAULT_PAGE_SIZE = 30;
export const ADMIN_TABLE_PAGE_SIZE_OPTIONS = ['20', '30', '50', '100'];

/**
 * Chiều cao phần thân bảng: chiếm hết phần còn lại của màn hình.
 *
 * Không đặt thì bảng cao bằng đúng số dòng của nó: 30 dòng đẩy cả trang dài ra, tiêu đề cột trôi
 * lên mất và người dùng phải cuộn ngược lên mới biết cột nào là cột nào. Đặt chiều cao cố định thì
 * tiêu đề đứng yên và chỉ phần thân cuộn.
 *
 * Phần trừ đi là chỗ của header ứng dụng, tiêu đề màn, thẻ số liệu, bộ lọc và thanh phân trang.
 * Màn nào có bố cục khác thì đặt lại `--admin-table-offset` trên vùng bao ngoài bảng.
 */
export const ADMIN_TABLE_BODY_HEIGHT = 'calc(100vh - var(--admin-table-offset, 340px))';

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
