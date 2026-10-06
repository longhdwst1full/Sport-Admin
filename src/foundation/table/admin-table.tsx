import { Table } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { isValidElement, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
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
import { TABLE_DENSITY_SIZE, useTableDensity } from './table-density';

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
  /**
   * Tên thực thể ở số nhiều, viết thường: "sản phẩm", "đơn hàng", "phiếu nhập".
   *
   * Màn hình trống là lúc người dùng cần biết làm gì tiếp, không phải lúc báo rằng mảng rỗng.
   * Có tên thực thể thì câu trống mới nói đúng việc; bỏ trống sẽ rơi về câu chung.
   */
  emptyEntity?: string;
}

/** Số dòng tối đa một ô hiển thị; dài hơn thì cắt bằng "…". */
const ADMIN_TABLE_CELL_MAX_LINES = 3;

// Inline style để số dòng đi theo hằng số thay vì một class Tailwind viết cứng `line-clamp-3`.
const CELL_CLAMP_STYLE = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: ADMIN_TABLE_CELL_MAX_LINES,
  overflow: 'hidden',
} as const;

function isCellObject(value: unknown): value is { children: ReactNode; props?: object } {
  return Boolean(value) && typeof value === 'object' && !isValidElement(value) && 'children' in (value as object);
}

/**
 * Bọc nội dung mọi ô trong khung giới hạn {@link ADMIN_TABLE_CELL_MAX_LINES} dòng, kể cả column group
 * lồng nhau. Ô chỉ là chữ/số thì có `title` để rê chuột xem đủ; double-click vẫn sao chép toàn văn vì
 * `innerText` của ô không bị cắt. Cột đã tự khai `ellipsis` của antd giữ nguyên hành vi của nó.
 */
function withCellLineClamp<RecordType extends object>(
  columns: ColumnsType<RecordType> | undefined,
): ColumnsType<RecordType> | undefined {
  return columns?.map((column) => {
    if ('children' in column && column.children) {
      return { ...column, children: withCellLineClamp(column.children) };
    }
    if (column.ellipsis) return column;
    const originalRender = column.render;
    return {
      ...column,
      render: (value: unknown, record: RecordType, index: number) => {
        const rendered = originalRender ? originalRender(value, record, index) : (value as ReactNode);
        // Cách render cũ của antd trả `{ children, props }` để đặt rowSpan/colSpan: chỉ bọc phần children.
        const content: ReactNode = isCellObject(rendered) ? rendered.children : (rendered as ReactNode);
        const plain = typeof content === 'string' || typeof content === 'number' ? String(content) : undefined;
        const clamped = (
          <div className="break-words" style={{ ...CELL_CLAMP_STYLE }} title={plain}>
            {content}
          </div>
        );
        return isCellObject(rendered) ? { ...rendered, children: clamped } : clamped;
      },
    };
  });
}

/**
 * Table shell dùng chung cho Admin: width cố định, luôn có horizontal scroll và
 * pagination mặc định 30 dòng. Feature chỉ còn sở hữu column content và server query.
 */
export function AdminTable<RecordType extends object>({
  columns,
  defaultColumnWidth = ADMIN_TABLE_DEFAULT_COLUMN_WIDTH,
  surface,
  emptyEntity,
  pagination,
  scroll,
  tableLayout = 'fixed',
  locale,
  size,
  ...props
}: AdminTableProps<RecordType>) {
  // `size` truyền tay vẫn thắng: vài bảng nhúng trong drawer cần cố định độ cao dòng.
  const density = useTableDensity();
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

  const normalizedColumns = useMemo(
    () => withCellLineClamp(withFixedColumnWidths(columns, defaultColumnWidth)),
    [columns, defaultColumnWidth],
  );

  const copyCellOnDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest('td');
    const value = cell?.innerText.trim();
    if (!value || !navigator.clipboard) return;
    // UX: double-click sao chép nội dung ô; không thêm icon copy làm nhiễu table.
    void navigator.clipboard.writeText(value);
  };

  return (
    <div
      ref={containerRef}
      className={effectiveSurface === 'page' ? 'admin-table-fill' : undefined}
      onDoubleClick={copyCellOnDoubleClick}
    >
      <Table<RecordType>
        size={size ?? TABLE_DENSITY_SIZE[density]}
        {...props}
        columns={normalizedColumns}
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
            <div
              data-testid="admin-table-empty"
              className="py-8 text-center select-none"
            >
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-ba-iron-100 text-ba-iron-400">
                <InboxOutlined className="text-xl" />
              </div>
              <div className="text-xs font-semibold text-ba-iron-700">
                {emptyEntity ? `Chưa có ${emptyEntity} nào` : 'Chưa có dữ liệu'}
              </div>
              <div className="mt-0.5 text-[11px] text-ba-iron-400">
                Thêm mới, hoặc nới bộ lọc nếu bạn đang tìm thứ gì đó.
              </div>
            </div>
          ),
          ...locale,
        }}
      />
    </div>
  );
}
