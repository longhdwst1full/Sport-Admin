import { EditOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Progress, Select } from 'antd';
import { useEffect, useMemo, useState } from 'react';
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
import {
  useListInventoryBalances,
  useSummarizeInventoryBalances,
} from '@/generated/api/inventory/inventory';
import type { InventoryBalanceDto } from '@/generated/api/inventory/inventory.schemas';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { BALANCE_COLUMN_ITEMS, inventoryBalanceStatusPresentation } from '../constants/inventory.constants';
import { useWarehouseOptions } from '../hooks/use-warehouse-options';

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
      const strokeColor = ratio > 50 ? '#10b981' : ratio > 20 ? '#f59e0b' : '#ef4444';
      return (
        <div className="min-w-28 text-right">
          <div className="font-bold text-slate-800 text-xs">{value}</div>
          <Progress percent={ratio} strokeColor={strokeColor} showInfo={false} size="small" />
        </div>
      );
    },
  },
  col.number<InventoryBalanceDto>('reorderPoint', 'Mức đặt lại', { width: 110, className: 'text-slate-400 text-xs' }),
  col.status<InventoryBalanceDto, keyof typeof inventoryBalanceStatusPresentation>(
    'status',
    'Trạng thái',
    inventoryBalanceStatusPresentation,
    { width: 140 },
  ),
];

export function InventoryBalancePanel({
  onAdjust,
  onMetricsChange,
}: {
  onAdjust: (balance: InventoryBalanceDto) => void;
  onMetricsChange: (metrics: { total: number; low: number; out: number; available: number }) => void;
}) {
  const search = useSearchState();
  const debouncedSearch = search.debounced;
  const [warehouseCode, setWarehouseCode] = useState<string>();
  const [page, setPage] = useListPageReset([debouncedSearch, warehouseCode]);
  const columnsState = useColumnVisibility(BALANCE_COLUMN_ITEMS);

  const warehouses = useWarehouseOptions();
  const query = useListInventoryBalances({
    page,
    limit: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(warehouseCode ? { warehouseCode } : {}),
  });
  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);

  /**
   * Thẻ số liệu hỏi riêng một endpoint tổng hợp.
   *
   * Trước đây ba thẻ đếm trên `items` của trang đang xem, nên "sắp hết hàng: 12" thực
   * chất là "12 trong số dòng đang hiện" và đổi trang là số đổi theo. `page`/`limit` KHÔNG truyền
   * vào đây — chỉ bộ lọc, để đổi trang không phải tính lại tổng.
   */
  const summary = useSummarizeInventoryBalances({
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(warehouseCode ? { warehouseCode } : {}),
  });

  useEffect(() => {
    if (!summary.data) return;
    onMetricsChange({
      total: summary.data.trackedBalances,
      low: summary.data.lowStock,
      out: summary.data.outOfStock,
      available: summary.data.totalAvailable,
    });
  }, [onMetricsChange, summary.data]);

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
            onChange={setWarehouseCode}
          />
        </div>

        <Button
          icon={<SettingOutlined />}
          onClick={columnsState.open}
          className="text-slate-600"
        >
          Tùy chỉnh cột
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
          onChange: setPage,
        }}
        columns={columns}
      />

      <ColumnSettingsModal {...columnsState.modalProps} columns={BALANCE_COLUMN_ITEMS} />
    </Card>
  );
}
