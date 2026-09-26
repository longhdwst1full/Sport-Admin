import { SearchOutlined } from '@ant-design/icons';
import { Card, Input, Select, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { AdminTable , CursorPagination } from '@/foundation/table';
import { useListInventoryMovements } from '@/generated/api/inventory/inventory';
import { InventoryMovementType } from '@/generated/api/inventory/inventory.schemas';
import { useSearchActiveAdminWarehouses } from '@/generated/api/organization/organization';

// Khai theo enum sinh từ contract: backend thêm loại movement mà quên nhãn thì compile báo lỗi.
const movementLabels: Record<InventoryMovementType, { label: string; color: string }> = {
  ADJUST: { label: 'Điều chỉnh', color: 'blue' },
  RECEIVE: { label: 'Nhập kho', color: 'green' },
  TRANSFER_OUT: { label: 'Chuyển đi', color: 'orange' },
  TRANSFER_IN: { label: 'Chuyển đến', color: 'green' },
  SALE_SHIP: { label: 'Xuất bán', color: 'purple' },
  DELIVERY_RETURN_RESTOCK: { label: 'Nhập lại hàng giao thất bại', color: 'gold' },
  RETURN_RESTOCK: { label: 'Nhập lại hàng khách trả', color: 'cyan' },
};

export function InventoryMovementPanel() {
  const [cursor, setCursor] = useState<string>();
  const [history, setHistory] = useState<string[]>([]);
  const [sku, setSku] = useState('');
  const [warehouseCode, setWarehouseCode] = useState<string>();
  const [movementType, setMovementType] = useState<InventoryMovementType>();
  const [debouncedSku] = useDebounce(sku.trim(), 350);
  const warehouses = useSearchActiveAdminWarehouses({ page: 1, limit: 50 });
  const query = useListInventoryMovements({
    limit: 25,
    ...(cursor ? { cursor } : {}),
    ...(debouncedSku ? { sku: debouncedSku } : {}),
    ...(warehouseCode ? { warehouseCode } : {}),
    ...(movementType ? { movementType } : {}),
  });

  useEffect(() => {
    setCursor(undefined);
    setHistory([]);
  }, [debouncedSku, movementType, warehouseCode]);

  return (
    <Card variant="borderless">
      <div className="mb-4 flex flex-wrap gap-3">
        <Input allowClear prefix={<SearchOutlined />} placeholder="Lọc theo SKU" value={sku} className="max-w-xs" onChange={(event) => setSku(event.target.value)} />
        <Select allowClear showSearch optionFilterProp="label" placeholder="Tất cả kho" className="min-w-60" loading={warehouses.isPending} options={(warehouses.data?.items ?? []).map((item) => ({ value: item.code, label: `${item.code} — ${item.label}` }))} onChange={setWarehouseCode} />
        <Select allowClear placeholder="Loại biến động" className="min-w-44" options={Object.values(InventoryMovementType).map((value) => ({ value, label: movementLabels[value].label }))} onChange={setMovementType} />
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
        columns={[
          { title: 'Thời điểm', dataIndex: 'occurredAt', width: 180, render: (value) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) },
          { title: 'SKU', dataIndex: 'sku', width: 180, render: (value, row) => <div><strong>{value}</strong><div className="text-xs text-slate-500">{row.productName}</div></div> },
          { title: 'Kho', dataIndex: 'warehouseCode', width: 150 },
          { title: 'Loại', dataIndex: 'movementType', width: 130, render: (value: InventoryMovementType) => <Tag color={movementLabels[value]?.color}>{movementLabels[value]?.label ?? value}</Tag> },
          { title: 'Thay đổi', dataIndex: 'quantityDelta', align: 'right', width: 100, render: (value: number) => <Typography.Text type={value < 0 ? 'danger' : 'success'} strong>{value > 0 ? `+${value}` : value}</Typography.Text> },
          { title: 'Tồn sau', dataIndex: 'balanceAfter', align: 'right', width: 100 },
          { title: 'Chứng từ', key: 'reference', width: 210, render: (_, row) => <div><Typography.Text code>{row.referenceId}</Typography.Text><div className="text-xs text-slate-500">{row.referenceType}</div></div> },
          { title: 'Lý do / người tạo', key: 'reason', render: (_, row) => <div>{row.reason}<div className="text-xs text-slate-500">{row.createdByDisplayName}</div></div> },
        ]}
      />
      <CursorPagination
        pageIndex={history.length}
        rowCount={query.data?.items.length ?? 0}
        hasPrevious={history.length > 0}
        hasNext={Boolean(query.data?.nextCursor)}
        loading={query.isFetching}
        onFirst={() => {
          setHistory([]);
          setCursor(undefined);
        }}
        onPrevious={() => {
          const previous = [...history];
          setCursor(previous.pop() || undefined);
          setHistory(previous);
        }}
        onNext={() => {
          setHistory((items) => [...items, cursor ?? '']);
          setCursor(query.data?.nextCursor ?? undefined);
        }}
      />
    </Card>
  );
}
