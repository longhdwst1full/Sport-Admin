import { EditOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, Input, Progress, Select, Table, Tag } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { PermissionGate } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { useListInventoryBalances } from '@/generated/api/inventory/inventory';
import type { InventoryBalanceDto } from '@/generated/api/inventory/models';
import { useSearchActiveAdminWarehouses } from '@/generated/api/organization/organization';

const status = {
  IN_STOCK: { color: 'green', label: 'Còn hàng' },
  LOW_STOCK: { color: 'orange', label: 'Sắp hết' },
  OUT_OF_STOCK: { color: 'red', label: 'Hết hàng' },
} as const;

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

  return (
    <Card bordered={false}>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm SKU hoặc tên sản phẩm"
          value={search}
          className="max-w-sm"
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Tất cả kho"
          className="min-w-60"
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
      {query.isError && <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />}
      <Table
        className="mt-4"
        rowKey="id"
        loading={query.isPending}
        dataSource={items}
        locale={{ emptyText: 'Chưa có tồn kho phù hợp bộ lọc.' }}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize: query.data?.limit ?? 25,
          total: query.data?.total ?? 0,
          showSizeChanger: false,
          showTotal: (total) => `${total} dòng tồn`,
          onChange: setPage,
        }}
        columns={[
          {
            title: 'Sản phẩm / SKU',
            dataIndex: 'sku',
            render: (value, row) => <div><strong>{value}</strong><div className="text-xs text-slate-500">{row.productName}</div></div>,
          },
          { title: 'Kho', dataIndex: 'warehouseCode', width: 160 },
          { title: 'Tồn vật lý', dataIndex: 'onHand', align: 'right', width: 120 },
          { title: 'Đang giữ', dataIndex: 'reserved', align: 'right', width: 110 },
          {
            title: 'Có thể bán',
            dataIndex: 'available',
            align: 'right',
            width: 160,
            render: (value, row) => (
              <div className="min-w-28"><strong>{value}</strong><Progress percent={row.onHand ? Math.round((value / row.onHand) * 100) : 0} showInfo={false} size="small" /></div>
            ),
          },
          { title: 'Điểm đặt lại', dataIndex: 'reorderPoint', align: 'right', width: 120 },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 120,
            render: (value: keyof typeof status) => <Tag color={status[value].color}>{status[value].label}</Tag>,
          },
          {
            title: 'Thao tác',
            key: 'actions',
            fixed: 'right',
            width: 120,
            render: (_, row) => (
              <PermissionGate permission="inventory.stock.adjust">
                <Button type="link" icon={<EditOutlined />} onClick={() => onAdjust(row)}>Điều chỉnh</Button>
              </PermissionGate>
            ),
          },
        ]}
      />
    </Card>
  );
}
