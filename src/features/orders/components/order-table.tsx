import { EyeOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import type { AdminOrderSummaryDto } from '@/generated/api/orders/models';
import { StatusTag } from '@/foundation/management';
import { AdminTable, TableActionButton } from '@/foundation/table';
import { CurrencyAmount } from '@/foundation/typography/currency-amount';
import {
  orderStatusPresentation,
  paymentStatusPresentation,
} from '../constants/order.constants';

interface OrderTableProps {
  rows: AdminOrderSummaryDto[];
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
  const allColumns = [
    ...(colVisibility.order !== false
      ? [
          {
            title: 'Mã đơn hàng',
            key: 'order',
            fixed: 'left' as const,
            width: 200,
            render: (_: unknown, row: AdminOrderSummaryDto) => (
              <div>
                <span className="font-mono font-bold text-slate-800 text-sm">{row.orderNo}</span>
                <div className="mt-0.5 text-xs text-slate-400">
                  {new Date(row.placedAt).toLocaleString('vi-VN')}
                </div>
              </div>
            ),
          },
        ]
      : []),
    ...(colVisibility.recipient !== false
      ? [
          {
            title: 'Khách nhận hàng',
            key: 'recipient',
            width: 240,
            render: (_: unknown, row: AdminOrderSummaryDto) => {
              const gradient = getRecipientGradient(row.recipient.name);
              const initial = row.recipient.name.slice(0, 1).toUpperCase();
              return (
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white font-semibold text-xs shadow-xs`}
                  >
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <Typography.Text strong className="block truncate text-slate-800 text-xs">
                      {row.recipient.name}
                    </Typography.Text>
                    <div className="text-[11px] font-mono text-slate-400">
                      {row.recipient.phone}
                    </div>
                  </div>
                </div>
              );
            },
          },
        ]
      : []),
    ...(colVisibility.branch !== false
      ? [
          {
            title: 'Chi nhánh xuất',
            key: 'branch',
            width: 190,
            render: (_: unknown, row: AdminOrderSummaryDto) => (
              <div>
                <div className="text-xs font-medium text-slate-700">{row.branchName}</div>
                <div className="text-[11px] text-slate-400 truncate">{row.warehouseName}</div>
              </div>
            ),
          },
        ]
      : []),
    ...(colVisibility.itemCount !== false
      ? [
          {
            title: 'SL',
            dataIndex: 'itemCount',
            align: 'center' as const,
            width: 80,
            render: (value: number) => (
              <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {value}
              </span>
            ),
          },
        ]
      : []),
    ...(colVisibility.grandTotal !== false
      ? [
          {
            title: 'Tổng tiền',
            dataIndex: 'grandTotal',
            align: 'right' as const,
            width: 150,
            render: (value: string | number) => (
              <div className="font-semibold text-slate-800">
                <CurrencyAmount amount={value} />
              </div>
            ),
          },
        ]
      : []),
    ...(colVisibility.payment !== false
      ? [
          {
            title: 'Thanh toán',
            key: 'payment',
            width: 170,
            render: (_: unknown, row: AdminOrderSummaryDto) => {
              const state = paymentStatusPresentation[row.paymentStatus] ?? {
                label: row.paymentStatus,
                color: 'default',
              };
              return (
                <div className="space-y-1">
                  <Tag color={state.color} className="m-0 text-[11px] font-medium">
                    {state.label}
                  </Tag>
                  <div className="text-[10px] text-slate-400">
                    {row.paymentMethod === 'COD' ? 'Tiền mặt khi nhận (COD)' : 'Chuyển khoản'}
                  </div>
                </div>
              );
            },
          },
        ]
      : []),
    ...(colVisibility.status !== false
      ? [
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 160,
            render: (value: string) => (
              <StatusTag
                status={value}
                presentations={orderStatusPresentation as Record<string, { label: string; color: string }>}
              />
            ),
          },
        ]
      : []),
    ...(colVisibility.actions !== false
      ? [
          {
            title: '',
            key: 'actions',
            fixed: 'right' as const,
            width: 60,
            render: (_: unknown, row: AdminOrderSummaryDto) => (
              <TableActionButton
                label={`Xem đơn ${row.orderNo}`}
                icon={<EyeOutlined className="text-slate-500 hover:text-emerald-600" />}
                onClick={() => onOpen(row.id)}
              />
            ),
          },
        ]
      : []),
  ];

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
        pageSizeOptions: ['20', '50', '100'],
        responsive: true,
        showTotal: (value) => `Tổng ${value} đơn hàng`,
        onChange: onPageChange,
      }}
      columns={allColumns}
    />
  );
}
