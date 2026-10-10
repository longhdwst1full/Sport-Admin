import { EyeOutlined } from '@ant-design/icons';
import { Card, Typography } from 'antd';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { AdminTable, TableActionButton, col } from '@/foundation/table';
import { useListStockTransfers } from '@/generated/api/inventory/inventory';
import { StockTransferStatus, type StockTransferSummaryDto } from '@/generated/api/inventory/inventory.schemas';
import { formatDateTime } from '@/lib/format/datetime';
import { useInventoryDocumentFilters } from '../hooks/use-inventory-document-filters';
import { stockTransferStatusMeta, stockTransferStatusOptions } from '../constants/stock-transfer.constants';
import { InventoryDocumentFilters } from './inventory-document-filters';
import { StockTransferDetailDrawer } from './stock-transfer-detail-drawer';

const COLUMNS: ColumnsType<StockTransferSummaryDto> = [
  { title: 'Số phiếu', dataIndex: 'transferNo', width: 250, render: (value) => <Typography.Text code>{value}</Typography.Text> },
  col.text<StockTransferSummaryDto>('fromWarehouseCode', 'Kho xuất', { width: 130 }),
  col.text<StockTransferSummaryDto>('toWarehouseCode', 'Kho nhận', { width: 130 }),
  col.status<StockTransferSummaryDto, StockTransferStatus>('status', 'Trạng thái', stockTransferStatusMeta),
  col.number<StockTransferSummaryDto>('itemCount', 'Số SKU', { width: 90 }),
  col.text<StockTransferSummaryDto>('reason', 'Lý do', { width: undefined, ellipsis: true }),
  col.text<StockTransferSummaryDto>('createdByDisplayName', 'Người tạo', { width: 160 }),
  // Mốc nghiệp vụ gần nhất của phiếu theo vòng đời nhận → xuất → gửi → tạo.
  { title: 'Cập nhật nghiệp vụ', key: 'businessUpdatedAt', width: 170, render: (_, row) => formatDateTime(row.receivedAt ?? row.shippedAt ?? row.submittedAt ?? row.createdAt) },
];

export function StockTransferPanel({
  selectedId,
  onSelectedIdChange,
}: {
  selectedId?: string;
  onSelectedIdChange: (id?: string) => void;
}) {
  const filters = useInventoryDocumentFilters('transfer', StockTransferStatus);
  const query = useListStockTransfers(filters.params);

  const columns = useMemo(
    () => [
      ...COLUMNS,
      col.actions<StockTransferSummaryDto>(
        (row) => <TableActionButton label={`Xem phiếu ${row.transferNo}`} icon={<EyeOutlined />} onClick={() => onSelectedIdChange(row.id)} />,
        { title: '', width: 72, align: undefined },
      ),
    ],
    [onSelectedIdChange],
  );

  return (
    <Card variant="borderless">
      <InventoryDocumentFilters
        filters={filters}
        searchPlaceholder="Tìm số phiếu, kho hoặc lý do"
        warehousePlaceholder="Tất cả kho liên quan"
        statusOptions={stockTransferStatusOptions}
      />
      {query.isError && <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />}
      <AdminTable
        rowKey="id"
        loading={query.isPending}
        dataSource={query.data?.items ?? []}
        locale={{ emptyText: 'Chưa có phiếu chuyển kho phù hợp bộ lọc.' }}
        scroll={{ x: 1180 }}
        pagination={filters.pagination(query.data?.total ?? 0)}
        columns={columns}
      />
      <StockTransferDetailDrawer id={selectedId} onClose={() => onSelectedIdChange(undefined)} />
    </Card>
  );
}
