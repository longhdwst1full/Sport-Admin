import { EyeOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { AdminTable, TableActionButton, col } from '@/foundation/table';
import type { AdminPaymentSummaryDto, PaymentStatus } from '@/generated/api/payments/payments.schemas';
import { PAYMENT_PAGE_SIZE, paymentMethodLabels, paymentStatusPresentation } from '../constants/payment.constants';

const COLUMNS: ColumnsType<AdminPaymentSummaryDto> = [
  { title: 'Mã thanh toán', dataIndex: 'paymentRef', fixed: 'left', width: 190, render: (value) => <Typography.Text strong>{value}</Typography.Text> },
  col.text<AdminPaymentSummaryDto>('orderNo', 'Đơn hàng', { width: 180 }),
  { title: 'Người nhận', key: 'recipient', width: 220, render: (_, row) => <div><strong>{row.recipientName}</strong><div className="text-xs text-slate-500">{row.recipientPhone}</div></div> },
  { title: 'Phương thức', dataIndex: 'method', width: 130, render: (value) => paymentMethodLabels[value] ?? value },
  col.money<AdminPaymentSummaryDto>('expectedAmount', 'Phải thu', { width: 150, className: 'font-bold' }),
  col.money<AdminPaymentSummaryDto>('receivedAmount', 'Đã nhận', { width: 150 }),
  { title: 'Trạng thái', dataIndex: 'status', width: 150, render: (value: PaymentStatus) => { const item = paymentStatusPresentation[value] ?? { label: value, color: 'default' }; return <Tag color={item.color}>{item.label}</Tag>; } },
];

export function PaymentTable({
  rows,
  loading,
  page,
  total,
  onPageChange,
  onOpen,
}: {
  rows: AdminPaymentSummaryDto[];
  loading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onOpen: (id: string) => void;
}) {
  const columns = useMemo(
    () => [
      ...COLUMNS,
      col.actions<AdminPaymentSummaryDto>(
        (row) => <TableActionButton label={`Xem thanh toán ${row.paymentRef}`} icon={<EyeOutlined />} onClick={() => onOpen(row.id)} />,
        { title: '', width: 64, align: undefined },
      ),
    ],
    [onOpen],
  );

  return (
    <AdminTable
      rowKey="id"
      dataSource={rows}
      loading={loading}
      tableLayout="fixed"
      scroll={{ x: 980 }}
      locale={{ emptyText: 'Không có thanh toán phù hợp bộ lọc.' }}
      pagination={{
        current: page,
        pageSize: PAYMENT_PAGE_SIZE,
        total,
        showSizeChanger: false,
        showTotal: (value) => `${value} thanh toán`,
        onChange: onPageChange,
      }}
      columns={columns}
    />
  );
}
