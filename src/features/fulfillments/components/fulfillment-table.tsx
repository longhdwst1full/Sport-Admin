import { EyeOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { AdminTable, TableActionButton, col } from '@/foundation/table';
import type { FulfillmentStatus, FulfillmentSummaryDto } from '@/generated/api/fulfillments/fulfillments.schemas';
import { FULFILLMENT_PAGE_SIZE, fulfillmentStatusPresentation } from '../constants/fulfillment.constants';
import { CarrierShipmentStatusTag } from './carrier-shipment-status-tag';

const COLUMNS: ColumnsType<FulfillmentSummaryDto> = [
  {
    title: 'Mã giao vận',
    dataIndex: 'fulfillmentNo',
    fixed: 'left',
    width: 190,
    render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
  },
  col.text<FulfillmentSummaryDto>('orderNo', 'Đơn hàng', { width: 180 }),
  col.text<FulfillmentSummaryDto>('warehouseName', 'Kho xuất', { width: 180 }),
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
    render: (_, row) => (
      <div>
        {row.carrierCode || row.trackingNo ? (
          <>
            <div>{row.carrierCode ?? '—'}</div>
            {row.trackingNo ? (
              <Typography.Text className="text-xs">{row.trackingNo}</Typography.Text>
            ) : null}
          </>
        ) : (
          <span className="text-slate-400">Chưa bàn giao</span>
        )}
        <div className="mt-1">
          <CarrierShipmentStatusTag status={row.carrierShipmentStatus} error={row.carrierShipmentError} />
        </div>
      </div>
    ),
  },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    width: 160,
    render: (value: FulfillmentStatus) => {
      const presentation = fulfillmentStatusPresentation[value];
      return <Tag color={presentation?.color ?? 'default'}>{presentation?.label ?? value}</Tag>;
    },
  },
  col.dateTime<FulfillmentSummaryDto>('createdAt', 'Tạo lúc', { width: 170 }),
];

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
  const columns = useMemo(
    () => [
      ...COLUMNS,
      col.actions<FulfillmentSummaryDto>(
        (row) => <TableActionButton label={`Xử lý đơn ${row.orderNo}`} icon={<EyeOutlined />} onClick={() => onOpenOrder(row.orderId)} />,
        { title: '', width: 72, align: undefined },
      ),
    ],
    [onOpenOrder],
  );

  return (
    <AdminTable
      rowKey="id"
      dataSource={rows}
      loading={loading}
      tableLayout="fixed"
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
      columns={columns}
    />
  );
}
