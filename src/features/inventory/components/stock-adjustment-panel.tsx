import { EyeOutlined } from '@ant-design/icons';
import { Card, DatePicker, Select, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { ADMIN_TABLE_DEFAULT_PAGE_SIZE, AdminTable, CursorPagination, TableActionButton, col } from '@/foundation/table';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { useListStockAdjustments } from '@/generated/api/inventory/inventory';
import type { StockAdjustmentSummaryDto } from '@/generated/api/inventory/inventory.schemas';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { adjustmentStatusPresentation, adjustmentTypeText } from '../constants/inventory.constants';
import { useCursorPages } from '../hooks/use-cursor-pages';
import { useTabUrlFilters } from '../hooks/use-tab-url-filters';
import { useWarehouseOptions } from '../hooks/use-warehouse-options';
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
  // Bộ lọc nằm trên URL (`adjustment.*`); ngày lưu YYYY-MM-DD, gửi API trọn ngày theo giờ máy.
  const filters = useTabUrlFilters('adjustment');
  const warehouseCode = filters.get('warehouse');
  const from = filters.get('from');
  const to = filters.get('to');
  const warehouses = useWarehouseOptions();
  useListPageReset([warehouseCode, from, to], { onReset: pages.reset });
  const query = useListStockAdjustments({
    limit: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
    ...(warehouseCode ? { warehouseCode } : {}),
    ...(from ? { from: dayjs(from).startOf('day').toISOString() } : {}),
    ...(to ? { to: dayjs(to).endOf('day').toISOString() } : {}),
  });
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
      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          allowClear
          showSearch
          filterOption={false}
          className="min-w-64"
          placeholder="Tất cả kho"
          value={warehouseCode}
          onSearch={warehouses.onSearch}
          onChange={(value?: string) => filters.setFilter('warehouse', value)}
          loading={warehouses.query.isFetching}
          options={warehouses.options}
        />
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          allowEmpty={[true, true]}
          placeholder={['Từ ngày', 'Đến ngày']}
          value={[from ? dayjs(from) : null, to ? dayjs(to) : null]}
          onChange={(dates) =>
            filters.setFilters({
              from: dates?.[0]?.format('YYYY-MM-DD'),
              to: dates?.[1]?.format('YYYY-MM-DD'),
            })
          }
        />
      </div>
      {query.isError && <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />}
      <AdminTable
        rowKey="id"
        loading={query.isPending}
        dataSource={query.data?.items ?? []}
        pagination={false}
        locale={{ emptyText: 'Chưa có phiếu điều chỉnh phù hợp bộ lọc.' }}
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
