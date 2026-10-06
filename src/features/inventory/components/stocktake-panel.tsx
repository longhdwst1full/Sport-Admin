import { EyeOutlined } from '@ant-design/icons';
import { Card, Progress, Tag, Typography } from 'antd';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { AdminTable, TableActionButton, col } from '@/foundation/table';
import { useListStocktakes } from '@/generated/api/inventory/inventory';
import type { StocktakeStatus, StocktakeSummaryDto } from '@/generated/api/inventory/inventory.schemas';
import { useInventoryDocumentFilters } from '../hooks/use-inventory-document-filters';
import {
  formatStocktakeTime,
  stocktakeScopeLabel,
  stocktakeStatusMeta,
  stocktakeStatusOptions,
} from '../constants/stocktake.constants';
import { InventoryDocumentFilters } from './inventory-document-filters';
import { StocktakeDetailDrawer } from './stocktake-detail-drawer';

const COLUMNS: ColumnsType<StocktakeSummaryDto> = [
  { title: 'Số phiếu', dataIndex: 'stocktakeNo', width: 250, render: (value) => <Typography.Text code>{value}</Typography.Text> },
  col.text<StocktakeSummaryDto>('warehouseCode', 'Kho', { width: 130 }),
  { title: 'Phạm vi', dataIndex: 'scopeType', width: 110, render: (value: keyof typeof stocktakeScopeLabel) => stocktakeScopeLabel[value] },
  { title: 'Trạng thái', dataIndex: 'status', width: 130, render: (value: keyof typeof stocktakeStatusMeta) => <Tag color={stocktakeStatusMeta[value].color}>{stocktakeStatusMeta[value].label}</Tag> },
  {
    title: 'Tiến độ đếm',
    key: 'progress',
    width: 170,
    render: (_, row) => (
      <Progress
        percent={row.itemCount === 0 ? 0 : Math.round((row.countedCount / row.itemCount) * 100)}
        size="small"
        format={() => `${row.countedCount}/${row.itemCount}`}
      />
    ),
  },
  col.text<StocktakeSummaryDto>('createdByDisplayName', 'Người tạo', { width: 160 }),
  col.dateTime<StocktakeSummaryDto>('snapshotAt', 'Chụp tồn lúc', { width: 150 }),
  { title: 'Cập nhật nghiệp vụ', key: 'businessUpdatedAt', width: 165, render: (_, row) => formatStocktakeTime(row.cancelledAt ?? row.postedAt ?? row.submittedAt ?? row.createdAt) },
];

export function StocktakePanel({
  selectedId,
  onSelectedIdChange,
}: {
  selectedId?: string;
  onSelectedIdChange: (id?: string) => void;
}) {
  const filters = useInventoryDocumentFilters<StocktakeStatus>();
  const query = useListStocktakes(filters.params);

  const columns = useMemo(
    () => [
      ...COLUMNS,
      col.actions<StocktakeSummaryDto>(
        (row) => <TableActionButton label={`Xem phiếu ${row.stocktakeNo}`} icon={<EyeOutlined />} onClick={() => onSelectedIdChange(row.id)} />,
        { title: '', width: 72, align: undefined },
      ),
    ],
    [onSelectedIdChange],
  );

  return (
    <Card variant="borderless">
      <InventoryDocumentFilters
        filters={filters}
        searchPlaceholder="Tìm số phiếu kiểm kê"
        warehousePlaceholder="Tất cả kho"
        statusOptions={stocktakeStatusOptions}
      />
      {query.isError && <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />}
      <AdminTable
        rowKey="id"
        loading={query.isPending}
        dataSource={query.data?.items ?? []}
        locale={{ emptyText: 'Chưa có phiếu kiểm kê phù hợp bộ lọc.' }}
        scroll={{ x: 1120 }}
        pagination={filters.pagination(query.data?.total ?? 0)}
        columns={columns}
      />
      <StocktakeDetailDrawer id={selectedId} onClose={() => onSelectedIdChange(undefined)} />
    </Card>
  );
}
