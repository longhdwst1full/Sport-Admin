import { EyeOutlined } from '@ant-design/icons';
import { Card, Drawer, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { ADMIN_TABLE_DEFAULT_PAGE_SIZE, AdminTable, CursorPagination, TableActionButton, col } from '@/foundation/table';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { useGetStockAdjustment, useListStockAdjustments } from '@/generated/api/inventory/inventory';
import type { StockAdjustmentItemDto, StockAdjustmentSummaryDto } from '@/generated/api/inventory/inventory.schemas';
import { DRAWER_WIDTH } from '@/foundation/overlay';
import { adjustmentTypeLabel } from '../constants/inventory.constants';
import { useCursorPages } from '../hooks/use-cursor-pages';

const ADJUSTMENT_COLUMNS: ColumnsType<StockAdjustmentSummaryDto> = [
  { title: 'Số phiếu', dataIndex: 'adjustmentNo', width: 250, render: (value) => <Typography.Text code>{value}</Typography.Text> },
  col.text<StockAdjustmentSummaryDto>('warehouseCode', 'Kho', { width: 150 }),
  { title: 'Loại phiếu', dataIndex: 'adjustmentType', width: 140, render: (value) => adjustmentTypeLabel[value] ?? value },
  col.text<StockAdjustmentSummaryDto>('externalReference', 'Chứng từ nguồn', { width: 170 }),
  { title: 'Trạng thái', dataIndex: 'status', width: 120, render: (value) => <Tag color="green">{value}</Tag> },
  col.number<StockAdjustmentSummaryDto>('itemCount', 'Số dòng', { width: 100 }),
  col.text<StockAdjustmentSummaryDto>('reason', 'Lý do', { width: undefined }),
  col.text<StockAdjustmentSummaryDto>('createdByDisplayName', 'Người tạo', { width: 170 }),
  col.dateTime<StockAdjustmentSummaryDto>('postedAt', 'Thời điểm', { width: 180 }),
];

const ADJUSTMENT_ITEM_COLUMNS: ColumnsType<StockAdjustmentItemDto> = [
  { title: 'SKU', dataIndex: 'sku', render: (value, row) => <div><strong>{value}</strong><div className="text-xs text-slate-500">{row.productName}</div></div> },
  col.number<StockAdjustmentItemDto>('expectedOnHand', 'Trước', { width: undefined }),
  { title: 'Thay đổi', dataIndex: 'quantityDelta', align: 'right', render: (value: number) => value > 0 ? `+${value}` : value },
  col.number<StockAdjustmentItemDto>('actualOnHand', 'Sau', { width: undefined }),
];

export function StockAdjustmentPanel() {
  const pages = useCursorPages();
  const [selectedId, setSelectedId] = useState<string>();
  const query = useListStockAdjustments({ limit: ADMIN_TABLE_DEFAULT_PAGE_SIZE, ...(pages.cursor ? { cursor: pages.cursor } : {}) });
  const detail = useGetStockAdjustment(selectedId ?? '', { query: { enabled: Boolean(selectedId) } });
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
      <Drawer title={detail.data ? `Phiếu ${detail.data.adjustmentNo}` : 'Chi tiết phiếu'} width={DRAWER_WIDTH.md} open={Boolean(selectedId)} onClose={() => setSelectedId(undefined)} loading={detail.isPending}>
        {detail.isError && <QueryErrorAlert error={detail.error} retry={() => void detail.refetch()} />}
        {detail.data && (
          <div className="space-y-5">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{detail.data.warehouseCode}</strong>
                <Tag>{adjustmentTypeLabel[detail.data.adjustmentType] ?? detail.data.adjustmentType}</Tag>
                <Tag color="blue">{detail.data.reasonCode}</Tag>
              </div>
              <div className="mt-2 text-slate-600">{detail.data.reason}</div>
              {detail.data.externalReference && (
                <div className="mt-2 text-sm text-slate-600">
                  Chứng từ: <Typography.Text code>{detail.data.externalReference}</Typography.Text>
                  {detail.data.sourceName ? ` · ${detail.data.sourceName}` : ''}
                </div>
              )}
              <div className="mt-2 text-xs text-slate-500">Tạo bởi {detail.data.createdByDisplayName}</div>
            </div>
            <AdminTable rowKey="id" size="small" pagination={false} dataSource={detail.data.items} columns={ADJUSTMENT_ITEM_COLUMNS} />
          </div>
        )}
      </Drawer>
    </Card>
  );
}
