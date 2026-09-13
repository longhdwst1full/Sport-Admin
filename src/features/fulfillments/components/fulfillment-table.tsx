import { EyeOutlined } from '@ant-design/icons';
import { Button, Table, Tag, Typography } from 'antd';
import type { FulfillmentSummaryDto } from '@/generated/api/fulfillments/models';
import { FULFILLMENT_PAGE_SIZE, fulfillmentStatusPresentation } from '../constants/fulfillment.constants';

export function FulfillmentTable({
  rows,
  loading,
  page,
  total,
  onPageChange,
  onOpenOrder,
}: {
  rows: FulfillmentSummaryDto[];
  loading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onOpenOrder: (orderId: string) => void;
}) {
  return (
    <Table
      rowKey="id"
      dataSource={rows}
      loading={loading}
      scroll={{ x: 1180 }}
      locale={{ emptyText: 'Không có phiếu giao vận phù hợp bộ lọc.' }}
      pagination={{
        current: page,
        pageSize: FULFILLMENT_PAGE_SIZE,
        total,
        showSizeChanger: false,
        showTotal: (value) => `${value} phiếu giao vận`,
        onChange: onPageChange,
      }}
      columns={[
        {
          title: 'Mã giao vận',
          dataIndex: 'fulfillmentNo',
          fixed: 'left',
          width: 190,
          render: (value: string) => <Typography.Text strong copyable>{value}</Typography.Text>,
        },
        {
          title: 'Đơn hàng',
          dataIndex: 'orderNo',
          width: 180,
          render: (value: string) => <Typography.Text copyable>{value}</Typography.Text>,
        },
        {
          title: 'Kho xuất',
          dataIndex: 'warehouseName',
          width: 180,
        },
        {
          title: 'Người nhận',
          key: 'recipient',
          width: 230,
          render: (_, row) => (
            <div>
              <strong>{row.recipientName}</strong>
              <div className="text-xs text-slate-500">{row.recipientPhone}</div>
              {row.recipientEmail ? <div className="text-xs text-slate-400">{row.recipientEmail}</div> : null}
            </div>
          ),
        },
        {
          title: 'Vận chuyển',
          key: 'carrier',
          width: 190,
          render: (_, row) =>
            row.carrierCode || row.trackingNo ? (
              <div>
                <div>{row.carrierCode ?? '—'}</div>
                {row.trackingNo ? (
                  <Typography.Text className="text-xs" copyable>{row.trackingNo}</Typography.Text>
                ) : null}
              </div>
            ) : (
              <span className="text-slate-400">Chưa bàn giao</span>
            ),
        },
        {
          title: 'Trạng thái',
          dataIndex: 'status',
          width: 160,
          render: (value: string) => {
            const presentation = fulfillmentStatusPresentation[value];
            return <Tag color={presentation?.color ?? 'default'}>{presentation?.label ?? value}</Tag>;
          },
        },
        {
          title: 'Tạo lúc',
          dataIndex: 'createdAt',
          width: 170,
          render: (value: string) => new Date(value).toLocaleString('vi-VN'),
        },
        {
          title: '',
          key: 'action',
          fixed: 'right',
          width: 110,
          render: (_, row) => (
            <Button size="small" icon={<EyeOutlined />} onClick={() => onOpenOrder(row.orderId)}>
              Xử lý
            </Button>
          ),
        },
      ]}
    />
  );
}
