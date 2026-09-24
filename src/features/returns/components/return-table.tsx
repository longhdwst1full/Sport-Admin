import { EyeOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { StatusTag } from '@/foundation/management';
import { AdminTable, TableActionButton } from '@/foundation/table';
import type { ReturnSummaryDto } from '@/generated/api/returns/models';
import { RETURN_PAGE_SIZE, returnReasonLabels, returnStatusPresentation } from '../constants/return.constants';
import { RETURN_LIST_TABLE_COLUMNS, type ReturnListColumnId } from '../constants/return-table-columns';
import { buildTableColumns } from '../model/build-table-columns';

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
  const columns = buildTableColumns<ReturnSummaryDto, ReturnListColumnId>(RETURN_LIST_TABLE_COLUMNS, {
    returnNo: (row) => <Typography.Text strong>{row.returnNo}</Typography.Text>,
    reasonCode: (row) => returnReasonLabels[row.reasonCode],
    status: (row) => <StatusTag status={row.status} presentations={returnStatusPresentation} />,
    createdAt: (row) => new Date(row.createdAt).toLocaleString('vi-VN'),
    action: (row) => (
      <TableActionButton label={`Xem phiếu ${row.returnNo}`} icon={<EyeOutlined />} onClick={() => onOpen(row.id)} />
    ),
  });

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
      columns={columns}
    />
  );
}
