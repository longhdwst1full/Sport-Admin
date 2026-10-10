import { Card, Select, Typography } from 'antd';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { SearchInput } from '@/foundation/inputs/search-input';
import type { ColumnsType } from 'antd/es/table';
import { ADMIN_TABLE_DEFAULT_PAGE_SIZE, AdminTable, CursorPagination, col } from '@/foundation/table';
import { useListInventoryMovements } from '@/generated/api/inventory/inventory';
import {
  InventoryMovementType,
  type InventoryMovementDto,
} from '@/generated/api/inventory/inventory.schemas';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import {
  movementPresentation,
  movementReferenceLabel,
  movementTypeOptions,
} from '../constants/inventory.constants';
import { useCursorPages } from '../hooks/use-cursor-pages';
import { useTabUrlFilters } from '../hooks/use-tab-url-filters';
import { useWarehouseOptions } from '../hooks/use-warehouse-options';

const MOVEMENT_COLUMNS: ColumnsType<InventoryMovementDto> = [
  col.dateTime<InventoryMovementDto>('occurredAt', 'Thời điểm', { width: 180 }),
  { title: 'SKU', dataIndex: 'sku', width: 180, render: (value, row) => <div><strong>{value}</strong><div className="text-xs text-slate-500">{row.productName}</div></div> },
  col.text<InventoryMovementDto>('warehouseCode', 'Kho', { width: 150 }),
  col.status<InventoryMovementDto, InventoryMovementType>('movementType', 'Loại', movementPresentation, { width: 200 }),
  { title: 'Thay đổi', dataIndex: 'quantityDelta', align: 'right', width: 100, render: (value: number) => <Typography.Text type={value < 0 ? 'danger' : 'success'} strong>{value > 0 ? `+${value}` : value}</Typography.Text> },
  col.number<InventoryMovementDto>('balanceAfter', 'Tồn sau', { width: 100 }),
  { title: 'Chứng từ', key: 'reference', width: 210, render: (_, row) => <div><Typography.Text code>{row.referenceId}</Typography.Text><div className="text-xs text-slate-500">{movementReferenceLabel(row.referenceType)}</div></div> },
  { title: 'Lý do / người tạo', key: 'reason', render: (_, row) => <div>{row.reason}<div className="text-xs text-slate-500">{row.createdByDisplayName}</div></div> },
];

export function InventoryMovementPanel() {
  const pages = useCursorPages();
  // Sổ kho phân trang cursor nên chỉ bộ lọc nằm trên URL; cursor là vị trí đọc tạm thời.
  const filters = useTabUrlFilters('movement');
  const sku = filters.search;
  const debouncedSku = sku.debounced;
  const warehouseCode = filters.get('warehouse');
  const movementType = filters.getEnum('type', InventoryMovementType);
  const warehouses = useWarehouseOptions();
  // Phân trang cursor: đổi bộ lọc thì quay về trang đầu ngay trong render, trước khi query chạy.
  useListPageReset([debouncedSku, movementType, warehouseCode], {
    onReset: pages.reset,
  });
  const query = useListInventoryMovements({
    limit: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
    ...(debouncedSku ? { sku: debouncedSku } : {}),
    ...(warehouseCode ? { warehouseCode } : {}),
    ...(movementType ? { movementType } : {}),
  });

  return (
    <Card variant="borderless">
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput placeholder="Lọc theo SKU" value={sku.value} className="max-w-xs" onChange={sku.setValue} />
        <Select allowClear showSearch optionFilterProp="label" placeholder="Tất cả kho" className="min-w-60" loading={warehouses.query.isPending} options={warehouses.options} value={warehouseCode} onChange={(value?: string) => filters.setFilter('warehouse', value)} />
        <Select allowClear placeholder="Loại biến động" className="min-w-44" options={movementTypeOptions} value={movementType} onChange={(value?: InventoryMovementType) => filters.setFilter('type', value)} />
      </div>
      {query.isError && <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />}
      <AdminTable
        className="mt-4"
        rowKey="id"
        loading={query.isPending}
        dataSource={query.data?.items ?? []}
        pagination={false}
        locale={{ emptyText: 'Chưa có biến động kho phù hợp.' }}
        scroll={{ x: 1290 }}
        columns={MOVEMENT_COLUMNS}
      />
      <CursorPagination
        {...pages.bind(query.data?.nextCursor)}
        rowCount={query.data?.items.length ?? 0}
        loading={query.isFetching}
      />
    </Card>
  );
}
