import { EyeOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { StatusTag } from '@/foundation/management';
import { AdminTable, TableActionButton } from '@/foundation/table';
import type { ReturnSummaryDto } from '@/generated/api/returns/models';
import { RETURN_PAGE_SIZE, returnReasonLabels, returnStatusPresentation } from '../constants/return.constants';

export function ReturnTable({
  rows,
  loading,
  page,
  total,
  onPageChange,
  onOpen,
}: {
  rows: ReturnSummaryDto[];
  loading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onOpen: (returnId: string) => void;
}) {
  return (
    <AdminTable
      rowKey="id"
      dataSource={rows}
      loading={loading}
      tableLayout="fixed"
      scroll={{ x: 1060 }}
      locale={{ emptyText: 'Không có phiếu trả phù hợp bộ lọc.' }}
      onRow={(row) => ({ onDoubleClick: () => onOpen(row.id) })}
      pagination={{
        current: page,
        pageSize: RETURN_PAGE_SIZE,
        total,
        showSizeChanger: false,
        showTotal: (value) => `${value} phiếu trả`,
        onChange: onPageChange,
      }}
      columns={[
        {
          title: 'Mã phiếu',
          dataIndex: 'returnNo',
          fixed: 'left',
          width: 200,
          render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
        },
        { title: 'Đơn hàng', dataIndex: 'orderNo', width: 180 },
        { title: 'Khách', dataIndex: 'recipientName', width: 180 },
        {
          title: 'Lý do',
          dataIndex: 'reasonCode',
          width: 150,
          render: (value: ReturnSummaryDto['reasonCode']) => returnReasonLabels[value],
        },
        { title: 'Số dòng', dataIndex: 'itemCount', width: 90 },
        {
          title: 'Trạng thái',
          dataIndex: 'status',
          width: 150,
          render: (value: ReturnSummaryDto['status']) => <StatusTag status={value} presentations={returnStatusPresentation} />,
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
          width: 72,
          render: (_, row) => (
            <TableActionButton label={`Xem phiếu ${row.returnNo}`} icon={<EyeOutlined />} onClick={() => onOpen(row.id)} />
          ),
        },
      ]}
    />
  );
}
