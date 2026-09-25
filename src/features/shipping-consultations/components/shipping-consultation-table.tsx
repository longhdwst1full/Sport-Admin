import { EyeOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import { AdminTable, TableActionButton } from '@/foundation/table';
import type { AdminShippingConsultationDto } from '@/generated/api/checkout/models';
import {
  consultationReasonLabel,
  moneyFormatter,
  SHIPPING_CONSULTATION_PAGE_SIZE,
  shippingConsultationStatus,
} from '../constants/shipping-consultation.constants';

interface ShippingConsultationTableProps {
  rows: AdminShippingConsultationDto[];
  loading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onOpen: (row: AdminShippingConsultationDto) => void;
}

export function ShippingConsultationTable({
  rows,
  loading,
  page,
  total,
  onPageChange,
  onOpen,
}: ShippingConsultationTableProps) {
  return (
    <AdminTable
      rowKey="checkoutToken"
      dataSource={rows}
      loading={loading}
      scroll={{ x: 1050 }}
      locale={{ emptyText: 'Không có checkout nào ở trạng thái đã chọn.' }}
      pagination={{
        current: page,
        pageSize: SHIPPING_CONSULTATION_PAGE_SIZE,
        total,
        showSizeChanger: false,
        onChange: onPageChange,
      }}
      columns={[
        {
          title: 'Khách hàng',
          key: 'customer',
          fixed: 'left',
          width: 220,
          render: (_, row) => (
            <div>
              <Typography.Text strong>{row.recipient.recipient}</Typography.Text>
              <div className="text-xs text-slate-500">{row.recipient.phone}</div>
            </div>
          ),
        },
        {
          title: 'Chi nhánh',
          key: 'branch',
          width: 180,
          render: (_, row) => (
            <div>
              <div>{row.branchName}</div>
              {row.consultationReason && (
                <Tag color={consultationReasonLabel[row.consultationReason].color} className="!mt-1">
                  {consultationReasonLabel[row.consultationReason].label}
                </Tag>
              )}
            </div>
          ),
        },
        {
          title: 'Sản phẩm',
          key: 'items',
          width: 260,
          render: (_, row) => (
            <div>
              <strong>{row.items[0]?.name ?? 'Không có sản phẩm'}</strong>
              <div className="text-xs text-slate-500">
                {row.items.length} dòng · {row.items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm
              </div>
            </div>
          ),
        },
        {
          title: 'Tạm tính',
          dataIndex: 'itemSubtotal',
          align: 'right',
          width: 150,
          render: (value) => <strong>{moneyFormatter.format(Number(value))}</strong>,
        },
        {
          title: 'Thanh toán',
          dataIndex: 'paymentMethod',
          width: 130,
          render: (value) => <Tag>{value === 'COD' ? 'Thu hộ COD' : 'Chuyển khoản'}</Tag>,
        },
        {
          title: 'Trạng thái',
          dataIndex: 'status',
          width: 130,
          render: (value) => {
            const item = shippingConsultationStatus[value as keyof typeof shippingConsultationStatus];
            return <Tag color={item.color}>{item.label}</Tag>;
          },
        },
        {
          title: 'Tạo lúc',
          dataIndex: 'createdAt',
          width: 170,
          render: (value) => new Date(value).toLocaleString('vi-VN'),
        },
        {
          title: '',
          key: 'actions',
          fixed: 'right',
          width: 72,
          render: (_, row) => (
            <TableActionButton
              label={`Xem yêu cầu của ${row.recipient.recipient}`}
              icon={<EyeOutlined />}
              onClick={() => onOpen(row)}
            />
          ),
        },
      ]}
    />
  );
}
