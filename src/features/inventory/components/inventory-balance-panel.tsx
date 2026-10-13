import { EditOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Progress, Select } from 'antd';
import { useMemo } from 'react';
import { PermissionGate } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { SearchInput } from '@/foundation/inputs/search-input';
import type { ColumnsType } from 'antd/es/table';
import {
  ADMIN_TABLE_DEFAULT_PAGE_SIZE,
  AdminTable,
  ColumnSettingsModal,
  TableActionButton,
  col,
  useColumnVisibility,
} from '@/foundation/table';
import { useListInventoryBalances } from '@/generated/api/inventory/inventory';
import {
  ListInventoryBalancesStatus,
  type InventoryBalanceDto,
} from '@/generated/api/inventory/inventory.schemas';
import {
  BALANCE_COLUMN_ITEMS,
  inventoryBalanceStatusOptions,
  inventoryBalanceStatusPresentation,
} from '../constants/inventory.constants';
import { useTabUrlFilters } from '../hooks/use-tab-url-filters';
import { useWarehouseOptions } from '../hooks/use-warehouse-options';

/** Màu thanh tỷ lệ có thể bán; class Tailwind thay mã hex để theo bảng màu chung. */
function availabilityBarClass(ratio: number) {
  if (ratio > 50) return '[&_.ant-progress-bg]:!bg-emerald-500';
  if (ratio > 20) return '[&_.ant-progress-bg]:!bg-amber-500';
  return '[&_.ant-progress-bg]:!bg-rose-500';
}

const DATA_COLUMNS: ColumnsType<InventoryBalanceDto> = [
  {
    title: 'Sản phẩm / SKU',
    key: 'sku',
    // Cột fixed BẮT BUỘC có width: thiếu thì antd không đo được cột dính và
    // header lệch khỏi body, đúng hiện tượng bảng bị vỡ.
    fixed: 'left',
    width: 260,
    render: (_, row) => (
      <div className="min-w-0">
        <div className="font-mono text-xs font-bold text-slate-800">{row.sku}</div>
        <div className="truncate text-xs font-medium text-slate-500" title={row.productName}>
          {row.productName}
        </div>
      </div>
    ),
  },
  {
    title: 'Kho lưu trữ',
    key: 'warehouse',
    dataIndex: 'warehouseCode',
    width: 160,
    render: (code: string) => (
      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">{code}</span>
    ),
  },
  col.number<InventoryBalanceDto>('onHand', 'Tồn vật lý', { width: 110, className: 'font-semibold text-slate-800' }),
  col.number<InventoryBalanceDto>('reserved', 'Đang giữ', { width: 100, className: 'text-slate-500 text-xs' }),
  {
    title: 'Có thể bán',
    key: 'available',
    dataIndex: 'available',
    align: 'right',
    width: 170,
    render: (value: number, row) => {
      const ratio = row.onHand ? Math.round((value / row.onHand) * 100) : 0;
      return (
        <div className="min-w-28 text-right">
          <div className="font-bold text-slate-800 text-xs">{value}</div>
          <Progress percent={ratio} className={availabilityBarClass(ratio)} showInfo={false} size="small" />
        </div>
      );
    },
  },
  col.number<InventoryBalanceDto>('reorderPoint', 'Mức đặt lại', { width: 110, className: 'text-slate-400 text-xs' }),
  col.status<InventoryBalanceDto, InventoryBalanceDto['status']>(
    'status',
    'Trạng thái',
    inventoryBalanceStatusPresentation,
    { width: 140 },
  ),
];

export function InventoryBalancePanel({ onAdjust }: { onAdjust: (balance: InventoryBalanceDto) => void }) {
  const filters = useTabUrlFilters('balance');
  const { search, page } = filters;
  const debouncedSearch = search.debounced;
  const warehouseCode = filters.get('warehouse');
  // `balance.status` trên URL: thẻ "Tồn dưới ngưỡng" ở bảng điều khiển mở thẳng danh sách SKU sắp hết.
  const status = filters.getEnum('status', ListInventoryBalancesStatus);
  const columnsState = useColumnVisibility(BALANCE_COLUMN_ITEMS);

  const warehouses = useWarehouseOptions();
  const query = useListInventoryBalances({
    page,
    limit: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(warehouseCode ? { warehouseCode } : {}),
    ...(status ? { status } : {}),
  });
  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);

  const { visibility } = columnsState;
  const columns = useMemo(
    () =>
      [
        ...DATA_COLUMNS,
        col.actions<InventoryBalanceDto>(
          (row) => (
            <PermissionGate permission="inventory.stock.adjust">
              <TableActionButton
                label={`Điều chỉnh tồn SKU ${row.sku}`}
                icon={<EditOutlined />}
                onClick={() => onAdjust(row)}
                className="text-emerald-600 font-medium"
              />
            </PermissionGate>
          ),
          { title: '', align: undefined },
        ),
      ].filter((column) => visibility[String(column.key)] !== false),
    [visibility, onAdjust],
  );

  return (
    <Card variant="borderless" className="rounded-2xl shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            placeholder="Tìm SKU hoặc tên sản phẩm..."
            value={search.value}
            className="w-72"
            onChange={search.setValue}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Tất cả kho hàng"
            className="w-56"
            loading={warehouses.query.isPending}
            options={warehouses.options}
            value={warehouseCode}
            onChange={(value?: string) => filters.setFilter('warehouse', value)}
          />
          <Select
            allowClear
            placeholder="Tất cả trạng thái"
            className="w-48"
            options={inventoryBalanceStatusOptions}
            value={status}
            onChange={(value?: string) => filters.setFilter('status', value)}
          />
        </div>

        <Button
          icon={<SettingOutlined />}
          onClick={columnsState.open}
          className="text-slate-600"
        >
          Tuỳ chỉnh cột
        </Button>
      </div>

      {query.isError && <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />}

      <AdminTable
        className="mt-3"
        rowKey="id"
        loading={query.isPending}
        dataSource={items}
        locale={{ emptyText: 'Chưa có dòng tồn kho nào phù hợp bộ lọc.' }}
        scroll={{ x: 1160 }}
        pagination={{
          current: page,
          pageSize: query.data?.limit ?? ADMIN_TABLE_DEFAULT_PAGE_SIZE,
          total: query.data?.total ?? 0,
          showSizeChanger: false,
          showTotal: (total) => `Tổng ${total} dòng tồn`,
          onChange: filters.setPage,
        }}
        columns={columns}
      />

      <ColumnSettingsModal {...columnsState.modalProps} columns={BALANCE_COLUMN_ITEMS} />
    </Card>
  );
}
