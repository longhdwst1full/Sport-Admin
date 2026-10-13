import { EyeOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { StatusTag } from '@/foundation/management';
import { AdminTable, TableActionButton, col } from '@/foundation/table';
import { orderStatusPresentation, paymentStatusPresentation } from '../constants/order.constants';
import type { OrderRow } from '../model/order.mapper';

interface OrderTableProps {
  rows: OrderRow[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  colVisibility?: Record<string, boolean>;
  onPageChange: (page: number, pageSize: number) => void;
  onOpen: (id: string) => void;
}

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

function getRecipientGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

// Mọi cột có `key` trùng `id` trong `ORDER_COLUMN_ITEMS` để ẩn/hiện theo cài đặt cột.
const DATA_COLUMNS: ColumnsType<OrderRow> = [
  {
    title: 'Mã đơn hàng',
    key: 'order',
    fixed: 'left',
    width: 200,
    render: (_, row) => (
      <div>
        <span className="font-mono font-bold text-slate-800 text-sm">{row.orderNo}</span>
        <div className="mt-0.5 text-xs text-slate-400">{row.placedAtLabel}</div>
      </div>
    ),
  },
  {
    title: 'Khách nhận hàng',
    key: 'recipient',
    width: 240,
    render: (_, row) => (
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${getRecipientGradient(row.recipientName)} text-white font-semibold text-xs shadow-xs`}
        >
          {row.recipientInitial}
        </div>
        <div className="min-w-0">
          <Typography.Text strong className="block truncate text-slate-800 text-xs">
            {row.recipientName}
          </Typography.Text>
          <div className="text-[11px] font-mono text-slate-400">{row.recipientPhone}</div>
        </div>
      </div>
    ),
  },
  {
    title: 'Chi nhánh xuất',
    key: 'branch',
    width: 190,
    render: (_, row) => (
      <div>
        <div className="text-xs font-medium text-slate-700">{row.branchName}</div>
        <div className="text-[11px] text-slate-400 truncate">{row.warehouseName}</div>
      </div>
    ),
  },
  col.number<OrderRow>('itemCount', 'SL', {
    align: 'center',
    width: 80,
    render: (value: number) => (
      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
        {value}
      </span>
    ),
  }),
  col.money<OrderRow>('grandTotal', 'Tổng tiền', {
    width: 150,
    className: 'font-semibold text-slate-800',
  }),
  {
    title: 'Thanh toán',
    key: 'payment',
    width: 170,
    render: (_, row) => (
      <div className="space-y-1">
        <StatusTag status={row.paymentStatus} presentations={paymentStatusPresentation} />
        <div className="text-[10px] text-slate-400">{row.paymentMethodLabel}</div>
      </div>
    ),
  },
  col.status<OrderRow, OrderRow['status']>('status', 'Trạng thái', orderStatusPresentation, { width: 160 }),
];

export function OrderTable({
  rows,
  loading,
  page,
  pageSize,
  total,
  colVisibility = {},
  onPageChange,
  onOpen,
}: OrderTableProps) {
  const columns = useMemo(
    () =>
      [
        ...DATA_COLUMNS,
        col.actions<OrderRow>(
          (row) => (
            <TableActionButton
              label={`Xem đơn ${row.orderNo}`}
              icon={<EyeOutlined className="text-slate-500 hover:text-emerald-600" />}
              onClick={() => onOpen(row.id)}
            />
          ),
          { title: '', width: 60, align: undefined },
        ),
      ].filter((column) => colVisibility[String(column.key)] !== false),
    [colVisibility, onOpen],
  );

  return (
    <AdminTable
      rowKey="id"
      dataSource={rows}
      loading={loading}
      tableLayout="fixed"
      scroll={{ x: 1180 }}
      locale={{ emptyText: 'Không có đơn hàng phù hợp bộ lọc.' }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        responsive: true,
        showTotal: (value) => `Tổng ${value} đơn hàng`,
        onChange: onPageChange,
      }}
      columns={columns}
    />
  );
}
