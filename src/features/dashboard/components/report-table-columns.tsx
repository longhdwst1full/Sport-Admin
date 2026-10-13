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

/** Cột bảng doanh thu theo chi nhánh trên dashboard. */
export const BRANCH_REVENUE_COLUMNS: ColumnsType<BranchRevenueDto> = [
  col.text<BranchRevenueDto>('branchName', 'Chi nhánh'),
  moneyColumn<BranchRevenueDto>('completedRevenue', 'Đã hoàn tất'),
  col.number<BranchRevenueDto>('completedOrderCount', 'Số đơn', { width: 90 }),
  moneyColumn<BranchRevenueDto>('expectedRevenue', 'Dự thu', () => 'text-slate-500'),
  moneyColumn<BranchRevenueDto>('refundedAmount', 'Đã hoàn tiền', (value) =>
    Number(value) > 0 ? 'text-rose-600' : 'text-slate-400',
  ),
  moneyColumn<BranchRevenueDto>('netRevenue', 'Thuần', () => 'font-semibold text-slate-900'),
];

/** Cột bảng khách mua nhiều nhất. */
export const TOP_CUSTOMER_COLUMNS: ColumnsType<TopCustomerDto> = [
  {
    title: 'Khách hàng',
    dataIndex: 'name',
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
  col.text<TopProductDto>('sku', 'SKU', { width: 130 }),
  { title: 'Sản phẩm', dataIndex: 'productName', ellipsis: true },
  col.number<TopProductDto>('quantitySold', 'SL bán', { width: 80 }),
  moneyColumn<TopProductDto>('revenue', 'Doanh thu', () => 'font-semibold text-slate-900', 140),
];
