import type { ColumnsType } from 'antd/es/table';
import { col } from '@/foundation/table';
import type { BranchRevenueDto, TopCustomerDto, TopProductDto } from '@/generated/api/reporting/reporting.schemas';
import { formatMoney } from '@/lib/format/money';

/** Cột bảng doanh thu theo chi nhánh trên dashboard. */
export const BRANCH_REVENUE_COLUMNS: ColumnsType<BranchRevenueDto> = [
  col.text<BranchRevenueDto>('branchName', 'Chi nhánh'),
  col.money<BranchRevenueDto>('completedRevenue', 'Đã hoàn tất', { width: undefined }),
  col.number<BranchRevenueDto>('completedOrderCount', 'Số đơn', { width: 90 }),
  {
    title: 'Dự thu',
    dataIndex: 'expectedRevenue',
    align: 'right',
    render: (value: string) => <span className="text-slate-500">{formatMoney(value)}</span>,
  },
  {
    title: 'Đã hoàn tiền',
    dataIndex: 'refundedAmount',
    align: 'right',
    render: (value: string) => (
      <span className={Number(value) > 0 ? 'text-rose-600' : 'text-slate-400'}>{formatMoney(value)}</span>
    ),
  },
  {
    title: 'Thuần',
    dataIndex: 'netRevenue',
    align: 'right',
    render: (value: string) => <span className="font-semibold">{formatMoney(value)}</span>,
  },
];

/** Cột bảng khách mua nhiều nhất. */
export const TOP_CUSTOMER_COLUMNS: ColumnsType<TopCustomerDto> = [
  {
    title: 'Khách hàng',
    dataIndex: 'name',
    ellipsis: true,
    render: (value: string, row) => (
      <div>
        <div className="font-semibold text-slate-800">{value}</div>
        <div className="font-mono text-xs text-slate-500">{row.customerNo}</div>
      </div>
    ),
  },
  col.number<TopCustomerDto>('orderCount', 'Số đơn', { width: 80 }),
  {
    title: 'Đã chi',
    dataIndex: 'revenue',
    width: 140,
    align: 'right',
    render: (value: string) => <span className="font-semibold text-emerald-700">{formatMoney(value)}</span>,
  },
];

/** Cột bảng sản phẩm bán chạy. */
export const TOP_PRODUCT_COLUMNS: ColumnsType<TopProductDto> = [
  col.text<TopProductDto>('sku', 'SKU', { width: 130 }),
  { title: 'Sản phẩm', dataIndex: 'productName', ellipsis: true },
  col.number<TopProductDto>('quantitySold', 'SL', { width: 70 }),
  col.money<TopProductDto>('revenue', 'Doanh thu', { width: 130 }),
];
