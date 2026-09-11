import { EyeOutlined } from '@ant-design/icons';
import { Avatar, Button, Space, Table, Tag, Typography } from 'antd';
import type { AdminOrderSummaryDto } from '@/generated/api/orders/models';
import {
  moneyFormatter,
  ORDER_PAGE_SIZE,
  orderStatusPresentation,
  paymentStatusPresentation,
} from '../constants/order.constants';

interface OrderTableProps {
  rows: AdminOrderSummaryDto[];
  loading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onOpen: (id: string) => void;
}

export function OrderTable({ rows, loading, page, total, onPageChange, onOpen }: OrderTableProps) {
  return (
    <Table
      rowKey="id"
      dataSource={rows}
      loading={loading}
      scroll={{ x: 1180 }}
      locale={{ emptyText: 'Không có đơn hàng phù hợp bộ lọc.' }}
      pagination={{
        current: page,
        pageSize: ORDER_PAGE_SIZE,
        total,
        showSizeChanger: false,
        showTotal: (value) => `${value} đơn hàng`,
        onChange: onPageChange,
      }}
      columns={[
        {
          title: 'Đơn hàng',
          key: 'order',
          fixed: 'left',
          width: 190,
          render: (_, row) => (
            <div>
              <Typography.Text strong copyable>{row.orderNo}</Typography.Text>
              <div className="mt-1 text-xs text-slate-500">
                {new Date(row.placedAt).toLocaleString('vi-VN')}
              </div>
            </div>
          ),
        },
        {
          title: 'Người nhận',
          key: 'recipient',
          width: 240,
          render: (_, row) => (
            <Space>
              <Avatar className="bg-blue-100 text-blue-700">{row.recipient.name.slice(0, 1)}</Avatar>
              <div>
                <Typography.Text strong>{row.recipient.name}</Typography.Text>
                <div className="text-xs text-slate-500">{row.recipient.phone}</div>
              </div>
            </Space>
          ),
        },
        {
          title: 'Chi nhánh',
          key: 'branch',
          width: 190,
          render: (_, row) => (
            <div>
              <div>{row.branchName}</div>
              <div className="text-xs text-slate-500">{row.warehouseName}</div>
            </div>
          ),
        },
        {
          title: 'Số lượng',
          dataIndex: 'itemCount',
          align: 'center',
          width: 90,
          render: (value) => `${value} SP`,
        },
        {
          title: 'Tổng tiền',
          dataIndex: 'grandTotal',
          align: 'right',
          width: 150,
          render: (value) => <strong>{moneyFormatter.format(Number(value))}</strong>,
        },
        {
          title: 'Thanh toán',
          key: 'payment',
          width: 160,
          render: (_, row) => {
            const state = paymentStatusPresentation[row.paymentStatus] ?? {
              label: row.paymentStatus,
              color: 'default',
            };
            return (
              <div>
                <Tag color={state.color}>{state.label}</Tag>
                <div className="mt-1 text-xs text-slate-500">
                  {row.paymentMethod === 'COD' ? 'COD' : 'Chuyển khoản'}
                </div>
              </div>
            );
          },
        },
        {
          title: 'Trạng thái',
          dataIndex: 'status',
          width: 150,
          render: (value) => {
            const state = orderStatusPresentation[value] ?? { label: value, color: 'default' };
            return <Tag color={state.color}>{state.label}</Tag>;
          },
        },
        {
          title: '',
          key: 'actions',
          fixed: 'right',
          width: 72,
          render: (_, row) => (
            <Button
              type="text"
              aria-label={`Xem đơn ${row.orderNo}`}
              icon={<EyeOutlined />}
              onClick={() => onOpen(row.id)}
            />
          ),
        },
      ]}
    />
  );
}

