import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, Input, Select, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useDebounce } from 'use-debounce';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { useListStockTransfers } from '@/generated/api/inventory/inventory';
import { ListStockTransfersStatus } from '@/generated/api/inventory/models';
import { useSearchActiveAdminWarehouses } from '@/generated/api/organization/organization';
import { StockTransferDetailDrawer } from './stock-transfer-detail-drawer';

const statusMeta = {
  DRAFT: { label: 'Nháp', color: 'default' },
  SUBMITTED: { label: 'Chờ xuất', color: 'blue' },
  SHIPPED: { label: 'Đang vận chuyển', color: 'orange' },
  RECEIVED: { label: 'Đã nhận', color: 'green' },
} as const;

const formatTime = (value?: string | null) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : '—';

export function StockTransferPanel({
  selectedId,
  onSelectedIdChange,
}: {
  selectedId?: string;
  onSelectedIdChange: (id?: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [warehouseCode, setWarehouseCode] = useState<string>();
  const [status, setStatus] = useState<ListStockTransfersStatus>();
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [debouncedSearch] = useDebounce(search.trim(), 300);
  const [debouncedWarehouseSearch] = useDebounce(warehouseSearch.trim(), 300);
  const query = useListStockTransfers({
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
          placeholder="Tìm số phiếu, kho hoặc lý do"
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
          placeholder="Tất cả kho liên quan"
          options={(warehouses.data?.items ?? []).map((item) => ({ value: item.code, label: `${item.code} — ${item.label}` }))}
        />
        <Select
          className="min-w-44"
          allowClear
          value={status}
          onChange={(value) => { setStatus(value); setPage(1); }}
          placeholder="Tất cả trạng thái"
          options={Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }))}
        />
      </div>
      {query.isError && <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />}
      <Table
        rowKey="id"
        loading={query.isPending}
        dataSource={query.data?.items ?? []}
        locale={{ emptyText: 'Chưa có phiếu chuyển kho phù hợp bộ lọc.' }}
        scroll={{ x: 1180 }}
        pagination={{
          current: page,
          pageSize: 25,
          total: query.data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
        columns={[
          { title: 'Số phiếu', dataIndex: 'transferNo', width: 250, render: (value) => <Typography.Text code>{value}</Typography.Text> },
          { title: 'Kho xuất', dataIndex: 'fromWarehouseCode', width: 130 },
          { title: 'Kho nhận', dataIndex: 'toWarehouseCode', width: 130 },
          { title: 'Trạng thái', dataIndex: 'status', width: 150, render: (value: keyof typeof statusMeta) => <Tag color={statusMeta[value].color}>{statusMeta[value].label}</Tag> },
          { title: 'Số SKU', dataIndex: 'itemCount', width: 90, align: 'right' },
          { title: 'Lý do', dataIndex: 'reason', ellipsis: true },
          { title: 'Người tạo', dataIndex: 'createdByDisplayName', width: 160 },
          { title: 'Cập nhật nghiệp vụ', width: 170, render: (_, row) => formatTime(row.receivedAt ?? row.shippedAt ?? row.submittedAt ?? row.createdAt) },
          { title: 'Thao tác', width: 100, fixed: 'right', render: (_, row) => <Button type="link" icon={<EyeOutlined />} onClick={() => onSelectedIdChange(row.id)}>Xem</Button> },
        ]}
      />
      <StockTransferDetailDrawer id={selectedId} onClose={() => onSelectedIdChange(undefined)} />
    </Card>
  );
}
