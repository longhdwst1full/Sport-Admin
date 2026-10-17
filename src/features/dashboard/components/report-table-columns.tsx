import { Avatar } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { col } from '@/foundation/table';
import type {
  BranchRevenueDto,
  TopCustomerDto,
  TopProductDto,
} from '@/generated/api/reporting/reporting.schemas';
import { formatMoney } from '@/lib/format/money';

/** Cột tiền căn phải, chữ số cùng bề rộng; `tone` đổi màu theo giá trị (hoàn tiền > 0 tô đỏ...). */
function moneyColumn<T>(
  dataIndex: Extract<keyof T, string>,
  title: string,
  tone: (value: string) => string = () => 'text-slate-700',
  width?: number,
): ColumnType<T> {
  return {
    key: dataIndex,
    dataIndex,
    title,
    width,
    align: 'right',
    className: 'tabular-nums whitespace-nowrap',
    render: (value: string) => <span className={tone(value)}>{formatMoney(value)}</span>,
  };
}

/**
 * Bề rộng bảng trong thẻ dashboard: lấp đầy thẻ khi thẻ rộng, cuộn ngang khi thẻ hẹp hơn tổng cột.
 * AdminTable gán width cố định cho mọi cột nên `max-content` để lại khoảng trống bên phải thẻ rộng.
 */
export function fillTableWidth<T>(columns: ColumnsType<T>, extra = 0): string {
  const total = columns.reduce((sum, column) => sum + (Number(column.width) || 160), extra);
  return `max(100%, ${total}px)`;
}

/** Cột bảng doanh thu theo chi nhánh trên dashboard. */
export const BRANCH_REVENUE_COLUMNS: ColumnsType<BranchRevenueDto> = [
  { title: 'Chi nhánh', dataIndex: 'branchName', width: 150, ellipsis: true },
  moneyColumn<BranchRevenueDto>('completedRevenue', 'Đã hoàn tất', undefined, 130),
  col.number<BranchRevenueDto>('completedOrderCount', 'Số đơn', { width: 72 }),
  moneyColumn<BranchRevenueDto>('expectedRevenue', 'Dự thu', () => 'text-slate-500', 130),
  moneyColumn<BranchRevenueDto>('refundedAmount', 'Hoàn tiền', (value) =>
    Number(value) > 0 ? 'text-rose-600' : 'text-slate-400',
  130),
  moneyColumn<BranchRevenueDto>('netRevenue', 'Thuần', () => 'font-semibold text-slate-900', 130),
];

/** Cột bảng khách mua nhiều nhất. */
export const TOP_CUSTOMER_COLUMNS: ColumnsType<TopCustomerDto> = [
  {
    title: 'Khách hàng',
    dataIndex: 'name',
    width: 180,
    ellipsis: true,
    render: (value: string, row) => (
      <div className="min-w-0">
        <div className="truncate font-semibold text-slate-800">{value}</div>
        <div className="font-mono text-xs text-slate-500">{row.customerNo}</div>
      </div>
    ),
  },
  col.number<TopCustomerDto>('orderCount', 'Số đơn', { width: 80 }),
  moneyColumn<TopCustomerDto>('revenue', 'Giá trị đơn', () => 'font-semibold text-admin-700', 140),
];

/** Cột bảng sản phẩm bán chạy. */
export const TOP_PRODUCT_COLUMNS: ColumnsType<TopProductDto> = [
  {
    title: 'Sản phẩm',
    dataIndex: 'productName',
    width: 300,
    ellipsis: true,
    // Ảnh nhỏ giúp nhận ra sản phẩm nhanh hơn đọc SKU; chưa có ảnh thì hiện chữ cái đầu.
    render: (value: string, row) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar
          shape="square"
          size={40}
          src={row.imageUrl && <img src={row.imageUrl} alt={value} width={40} height={40} loading="lazy" decoding="async" />}
          className="!shrink-0 !rounded-lg !border !border-slate-100"
        >
          {value.slice(0, 1)}
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-800">{value}</div>
          <div className="truncate font-mono text-xs text-slate-500">{row.sku}</div>
        </div>
      </div>
    ),
  },
  col.number<TopProductDto>('quantitySold', 'SL bán', { width: 80 }),
  moneyColumn<TopProductDto>('revenue', 'Doanh thu', () => 'font-semibold text-slate-900', 140),
];
