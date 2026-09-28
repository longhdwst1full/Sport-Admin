import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { Card, Input, Progress, Select, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useDebounce } from 'use-debounce';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { AdminTable, TableActionButton } from '@/foundation/table';
import { useListStocktakes } from '@/generated/api/inventory/inventory';
import type { StocktakeStatus } from '@/generated/api/inventory/inventory.schemas';
import { useSearchActiveAdminWarehouses } from '@/generated/api/organization/organization';
import { formatStocktakeTime, stocktakeScopeLabel, stocktakeStatusMeta } from '../model/stocktake-display';
import { StocktakeDetailDrawer } from './stocktake-detail-drawer';

export function StocktakePanel({
  selectedId,
  onSelectedIdChange,
}: {
  selectedId?: string;
  onSelectedIdChange: (id?: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [warehouseCode, setWarehouseCode] = useState<string>();
  const [status, setStatus] = useState<StocktakeStatus>();
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [debouncedSearch] = useDebounce(search.trim(), 300);
  const [debouncedWarehouseSearch] = useDebounce(warehouseSearch.trim(), 300);
  const query = useListStocktakes({
    page,
    limit: 25,
    search: debouncedSearch || undefined,
    warehouseCode,
    status,
  });
  const warehouses = useSearchActiveAdminWarehouses({
    page: 1,
    limit: 50,
    search: debouncedWarehouseSearch || undefined,
  });

  return (
    <Card variant="borderless">
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          className="max-w-sm"
          allowClear
          prefix={<SearchOutlined />}
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          placeholder="Tìm số phiếu kiểm kê"
        />
        <Select
          className="min-w-64"
          allowClear
          showSearch
          filterOption={false}
          value={warehouseCode}
          onSearch={setWarehouseSearch}
          onChange={(value) => { setWarehouseCode(value); setPage(1); }}
          loading={warehouses.isFetching}
          placeholder="Tất cả kho"
          options={(warehouses.data?.items ?? []).map((item) => ({ value: item.code, label: `${item.code} — ${item.label}` }))}
        />
        <Select
          className="min-w-44"
          allowClear
          value={status}
          onChange={(value) => { setStatus(value); setPage(1); }}
          placeholder="Tất cả trạng thái"
          options={Object.entries(stocktakeStatusMeta).map(([value, meta]) => ({ value, label: meta.label }))}
        />
      </div>
      {query.isError && <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />}
      <AdminTable
        rowKey="id"
        loading={query.isPending}
        dataSource={query.data?.items ?? []}
        locale={{ emptyText: 'Chưa có phiếu kiểm kê phù hợp bộ lọc.' }}
        scroll={{ x: 1120 }}
        pagination={{
          current: page,
          pageSize: 25,
          total: query.data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
        columns={[
          { title: 'Số phiếu', dataIndex: 'stocktakeNo', width: 250, render: (value) => <Typography.Text code>{value}</Typography.Text> },
          { title: 'Kho', dataIndex: 'warehouseCode', width: 130 },
          { title: 'Phạm vi', dataIndex: 'scopeType', width: 110, render: (value: keyof typeof stocktakeScopeLabel) => stocktakeScopeLabel[value] },
          { title: 'Trạng thái', dataIndex: 'status', width: 130, render: (value: keyof typeof stocktakeStatusMeta) => <Tag color={stocktakeStatusMeta[value].color}>{stocktakeStatusMeta[value].label}</Tag> },
          {
            title: 'Tiến độ đếm',
            width: 170,
            render: (_, row) => (
              <Progress
                percent={row.itemCount === 0 ? 0 : Math.round((row.countedCount / row.itemCount) * 100)}
                size="small"
                format={() => `${row.countedCount}/${row.itemCount}`}
              />
            ),
          },
          { title: 'Người tạo', dataIndex: 'createdByDisplayName', width: 160 },
          { title: 'Chụp tồn lúc', width: 150, render: (_, row) => formatStocktakeTime(row.snapshotAt) },
          { title: 'Cập nhật nghiệp vụ', width: 165, render: (_, row) => formatStocktakeTime(row.cancelledAt ?? row.postedAt ?? row.submittedAt ?? row.createdAt) },
          { title: '', width: 72, fixed: 'right', render: (_, row) => <TableActionButton label={`Xem phiếu ${row.stocktakeNo}`} icon={<EyeOutlined />} onClick={() => onSelectedIdChange(row.id)} /> },
        ]}
      />
      <StocktakeDetailDrawer id={selectedId} onClose={() => onSelectedIdChange(undefined)} />
    </Card>
  );
}
