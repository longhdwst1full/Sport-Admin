import { EditOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Input, Progress, Select, Table, Tooltip } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { PermissionGate } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { StatusTag } from '@/foundation/management';
import { ColumnSettingsModal, type ColumnItem } from '@/foundation/table/column-settings-modal';
import { useListInventoryBalances } from '@/generated/api/inventory/inventory';
import type { InventoryBalanceDto } from '@/generated/api/inventory/models';
import { useSearchActiveAdminWarehouses } from '@/generated/api/organization/organization';

const INVENTORY_STATUSES = {
  IN_STOCK: { color: 'green', label: 'Còn hàng' },
  LOW_STOCK: { color: 'orange', label: 'Sắp hết hàng' },
  OUT_OF_STOCK: { color: 'red', label: 'Hết hàng' },
};

const BALANCE_COLUMNS: ColumnItem[] = [
  { id: 'sku', label: 'Sản phẩm / SKU', fixed: true },
  { id: 'warehouse', label: 'Kho hàng' },
  { id: 'onHand', label: 'Tồn vật lý' },
  { id: 'reserved', label: 'Đang giữ chỗ' },
  { id: 'available', label: 'Có thể bán' },
  { id: 'reorderPoint', label: 'Điểm đặt lại' },
  { id: 'status', label: 'Trạng thái' },
  { id: 'actions', label: 'Thao tác', fixed: true },
];

export function InventoryBalancePanel({
  onAdjust,
  onMetricsChange,
}: {
  onAdjust: (balance: InventoryBalanceDto) => void;
  onMetricsChange: (metrics: { total: number; low: number; out: number; available: number }) => void;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [warehouseCode, setWarehouseCode] = useState<string>();
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [colVisibility, setColVisibility] = useState<Record<string, boolean>>({
    sku: true,
    warehouse: true,
    onHand: true,
    reserved: true,
    available: true,
    reorderPoint: true,
    status: true,
    actions: true,
  });

  const [debouncedSearch] = useDebounce(search.trim(), 350);
  const warehouses = useSearchActiveAdminWarehouses({ page: 1, limit: 50 });
  const query = useListInventoryBalances({
    page,
    limit: 25,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(warehouseCode ? { warehouseCode } : {}),
  });
  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);

  useEffect(() => {
    onMetricsChange({
      total: query.data?.total ?? 0,
      low: items.filter((item) => item.status === 'LOW_STOCK').length,
      out: items.filter((item) => item.status === 'OUT_OF_STOCK').length,
      available: items.reduce((sum, item) => sum + item.available, 0),
    });
  }, [items, onMetricsChange, query.data?.total]);

  const columns = [
    ...(colVisibility.sku !== false
      ? [
          {
            title: 'Sản phẩm / SKU',
            key: 'sku',
            fixed: 'left' as const,
            render: (_: unknown, row: InventoryBalanceDto) => (
              <div>
                <div className="font-mono font-bold text-slate-800 text-xs">{row.sku}</div>
                <div className="text-xs text-slate-500 font-medium truncate max-w-xs">
                  {row.productName}
                </div>
              </div>
            ),
          },
        ]
      : []),
    ...(colVisibility.warehouse !== false
      ? [
          {
            title: 'Kho lưu trữ',
            dataIndex: 'warehouseCode',
            width: 160,
            render: (code: string) => (
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                {code}
              </span>
            ),
          },
        ]
      : []),
    ...(colVisibility.onHand !== false
      ? [
          {
            title: 'Tồn vật lý',
            dataIndex: 'onHand',
            align: 'right' as const,
            width: 110,
            render: (val: number) => (
              <span className="font-semibold text-slate-800">{val}</span>
            ),
          },
        ]
      : []),
    ...(colVisibility.reserved !== false
      ? [
          {
            title: 'Đang giữ',
            dataIndex: 'reserved',
            align: 'right' as const,
            width: 100,
            render: (val: number) => (
              <span className="text-slate-500 text-xs">{val}</span>
            ),
          },
        ]
      : []),
    ...(colVisibility.available !== false
      ? [
          {
            title: 'Có thể bán',
            dataIndex: 'available',
            align: 'right' as const,
            width: 170,
            render: (value: number, row: InventoryBalanceDto) => {
              const ratio = row.onHand ? Math.round((value / row.onHand) * 100) : 0;
              const strokeColor =
                ratio > 50 ? '#10b981' : ratio > 20 ? '#f59e0b' : '#ef4444';
              return (
                <div className="min-w-28 text-right">
                  <div className="font-bold text-slate-800 text-xs">{value}</div>
                  <Progress
                    percent={ratio}
                    strokeColor={strokeColor}
                    showInfo={false}
                    size="small"
                  />
                </div>
              );
            },
          },
        ]
      : []),
    ...(colVisibility.reorderPoint !== false
      ? [
          {
            title: 'Mức đặt lại',
            dataIndex: 'reorderPoint',
            align: 'right' as const,
            width: 110,
            render: (val: number) => (
              <span className="text-slate-400 text-xs">{val}</span>
            ),
          },
        ]
      : []),
    ...(colVisibility.status !== false
      ? [
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 140,
            render: (value: keyof typeof INVENTORY_STATUSES) => (
              <StatusTag status={value} presentations={INVENTORY_STATUSES} />
            ),
          },
        ]
      : []),
    ...(colVisibility.actions !== false
      ? [
          {
            title: 'Thao tác',
            key: 'actions',
            fixed: 'right' as const,
            width: 120,
            render: (_: unknown, row: InventoryBalanceDto) => (
              <PermissionGate permission="inventory.stock.adjust">
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onAdjust(row)}
                  className="text-emerald-600 font-medium"
                >
                  Điều chỉnh
                </Button>
              </PermissionGate>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card bordered={false} className="shadow-xs rounded-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            allowClear
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Tìm SKU hoặc tên sản phẩm..."
            value={search}
            className="w-72"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Tất cả kho hàng"
            className="w-56"
            loading={warehouses.isPending}
            options={(warehouses.data?.items ?? []).map((item) => ({
              value: item.code,
              label: `${item.code} — ${item.label}`,
            }))}
            onChange={(value) => {
              setWarehouseCode(value);
              setPage(1);
            }}
          />
        </div>

        <Button
          icon={<SettingOutlined />}
          onClick={() => setColumnModalOpen(true)}
          className="text-slate-600"
        >
          Tùy chỉnh cột
        </Button>
      </div>

      {query.isError && <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />}

      <Table
        className="mt-3"
        rowKey="id"
        loading={query.isPending}
        dataSource={items}
        locale={{ emptyText: 'Chưa có dòng tồn kho nào phù hợp bộ lọc.' }}
        scroll={{ x: 960 }}
        pagination={{
          current: page,
          pageSize: query.data?.limit ?? 25,
          total: query.data?.total ?? 0,
          showSizeChanger: false,
          showTotal: (total) => `Tổng ${total} dòng tồn`,
          onChange: setPage,
        }}
        columns={columns}
      />

      <ColumnSettingsModal
        isOpen={columnModalOpen}
        onClose={() => setColumnModalOpen(false)}
        columns={BALANCE_COLUMNS}
        visibility={colVisibility}
        onChange={setColVisibility}
        onReset={() =>
          setColVisibility({
            sku: true,
            warehouse: true,
            onHand: true,
            reserved: true,
            available: true,
            reorderPoint: true,
            status: true,
            actions: true,
          })
        }
      />
    </Card>
  );
}
