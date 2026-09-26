import { EyeOutlined } from '@ant-design/icons';
import { Button, Tag, Typography } from 'antd';
import { AdminTable } from '@/foundation/table';
import type { AdminPaymentSummaryDto } from '@/generated/api/payments/payments.schemas';
import { moneyFormatter, PAYMENT_PAGE_SIZE, paymentMethodLabels, paymentStatusPresentation } from '../constants/payment.constants';

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
      columns={[
        { title: 'Mã thanh toán', dataIndex: 'paymentRef', fixed: 'left', width: 190, render: (value) => <Typography.Text strong>{value}</Typography.Text> },
        { title: 'Đơn hàng', dataIndex: 'orderNo', width: 180, render: (value) => <Typography.Text>{value}</Typography.Text> },
        { title: 'Người nhận', key: 'recipient', width: 220, render: (_, row) => <div><strong>{row.recipientName}</strong><div className="text-xs text-slate-500">{row.recipientPhone}</div></div> },
        { title: 'Phương thức', dataIndex: 'method', width: 130, render: (value) => paymentMethodLabels[value] ?? value },
        { title: 'Phải thu', dataIndex: 'expectedAmount', align: 'right', width: 150, render: (value) => <strong>{moneyFormatter.format(Number(value))}</strong> },
        { title: 'Đã nhận', dataIndex: 'receivedAmount', align: 'right', width: 150, render: (value) => moneyFormatter.format(Number(value)) },
        { title: 'Trạng thái', dataIndex: 'status', width: 150, render: (value) => { const item = paymentStatusPresentation[value] ?? { label: value, color: 'default' }; return <Tag color={item.color}>{item.label}</Tag>; } },
        { title: '', key: 'actions', fixed: 'right', width: 64, render: (_, row) => <Button type="text" aria-label={`Xem thanh toán ${row.paymentRef}`} icon={<EyeOutlined />} onClick={() => onOpen(row.id)} /> },
      ]}
    />
  );
}
