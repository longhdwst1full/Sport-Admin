import { EyeOutlined } from '@ant-design/icons';
import { Card, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { ADMIN_TABLE_DEFAULT_PAGE_SIZE, AdminTable, CursorPagination, TableActionButton, col } from '@/foundation/table';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { useListStockAdjustments } from '@/generated/api/inventory/inventory';
import type { StockAdjustmentSummaryDto } from '@/generated/api/inventory/inventory.schemas';
import { adjustmentStatusPresentation, adjustmentTypeText } from '../constants/inventory.constants';
import { useCursorPages } from '../hooks/use-cursor-pages';
import { StockAdjustmentDetailDrawer } from './stock-adjustment-detail-drawer';

const ADJUSTMENT_COLUMNS: ColumnsType<StockAdjustmentSummaryDto> = [
  { title: 'Số phiếu', dataIndex: 'adjustmentNo', width: 250, render: (value) => <Typography.Text code>{value}</Typography.Text> },
  col.text<StockAdjustmentSummaryDto>('warehouseCode', 'Kho', { width: 150 }),
  { title: 'Loại phiếu', dataIndex: 'adjustmentType', width: 140, render: (value: string) => adjustmentTypeText(value) },
  col.text<StockAdjustmentSummaryDto>('externalReference', 'Chứng từ nguồn', { width: 170 }),
  col.status<StockAdjustmentSummaryDto, string>('status', 'Trạng thái', adjustmentStatusPresentation, { width: 120 }),
  col.number<StockAdjustmentSummaryDto>('itemCount', 'Số dòng', { width: 100 }),
  col.text<StockAdjustmentSummaryDto>('reason', 'Lý do', { width: undefined }),
  col.text<StockAdjustmentSummaryDto>('createdByDisplayName', 'Người tạo', { width: 170 }),
  col.dateTime<StockAdjustmentSummaryDto>('postedAt', 'Thời điểm', { width: 180 }),
];

export function StockAdjustmentPanel() {
  const pages = useCursorPages();
  const [selectedId, setSelectedId] = useState<string>();
  const query = useListStockAdjustments({ limit: ADMIN_TABLE_DEFAULT_PAGE_SIZE, ...(pages.cursor ? { cursor: pages.cursor } : {}) });
  const columns = useMemo(
    () => [
      ...ADJUSTMENT_COLUMNS,
      col.actions<StockAdjustmentSummaryDto>(
        (row) => <TableActionButton label={`Xem phiếu ${row.adjustmentNo}`} icon={<EyeOutlined />} onClick={() => setSelectedId(row.id)} />,
        { title: '', width: 72, align: undefined },
      ),
    ],
    [],
  );

  return (
    <Card variant="borderless">
      {query.isError && <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />}
      <AdminTable
        rowKey="id"
        loading={query.isPending}
        dataSource={query.data?.items ?? []}
        pagination={false}
        locale={{ emptyText: 'Chưa có phiếu điều chỉnh tồn.' }}
        scroll={{ x: 1380 }}
        columns={columns}
      />
      <CursorPagination
        {...pages.bind(query.data?.nextCursor)}
        rowCount={query.data?.items.length ?? 0}
        totalLabel="phiếu"
        loading={query.isFetching}
      />
      <StockAdjustmentDetailDrawer id={selectedId} onClose={() => setSelectedId(undefined)} />
    </Card>
  );
}
