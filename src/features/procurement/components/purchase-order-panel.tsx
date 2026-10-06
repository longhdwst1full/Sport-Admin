import { MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, App, Button, Dropdown, Select, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { SearchInput } from '@/foundation/inputs/search-input';
import { PermissionGate } from '@/core/auth/permissions';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import type { ColumnsType } from 'antd/es/table';
import { AdminTable, col } from '@/foundation/table';
import { getPurchaseOrder, useListPurchaseOrders } from '@/generated/api/procurement/procurement';
import type { PurchaseOrderDetailDto, PurchaseOrderSummaryDto } from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { PROCUREMENT_PAGE_SIZE, partyLabel, purchaseOrderStatusOptions, statusLabel } from '../constants/procurement.constants';
import { purchaseOrderActions } from '../model/procurement-actions.policy';
import { PurchaseOrderDetailDrawer } from './purchase-order-detail-drawer';
import { PurchaseOrderFormDrawer } from './purchase-order-form-drawer';

const PURCHASE_ORDER_DATA_COLUMNS: ColumnsType<PurchaseOrderSummaryDto> = [
  { title: 'Số PO', dataIndex: 'poNo', width: 180 },
  { title: 'Nhà cung cấp', width: 240, render: (_, row) => <div><div className="font-medium">{row.supplier.name}</div><div className="text-xs text-slate-500">{row.supplier.code}</div></div> },
  { title: 'Kho nhận', width: 210, render: (_, row) => partyLabel(row.warehouse) },
  { title: 'Trạng thái', dataIndex: 'status', width: 150, render: (value) => <Tag color={value === 'CANCELLED' ? 'red' : value === 'CLOSED' || value === 'RECEIVED' ? 'green' : 'blue'}>{statusLabel(value)}</Tag> },
  { title: 'Cấp duyệt', dataIndex: 'approvalLevel', width: 150, render: (value) => value || 'Chưa chốt' },
  col.money<PurchaseOrderSummaryDto>('grandTotal', 'Tổng tiền', { width: 160 }),
  col.dateTime<PurchaseOrderSummaryDto>('createdAt', 'Ngày tạo', { width: 170 }),
];

export function PurchaseOrderPanel() {
  const { message } = App.useApp();
  const [pageSize, setPageSize] = useState(PROCUREMENT_PAGE_SIZE);
  const [status, setStatus] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();
  const [editing, setEditing] = useState<PurchaseOrderDetailDto>();
  const [createOpen, setCreateOpen] = useState(false);
  const search = useSearchState();
  const [page, setPage] = useListPageReset([search.debounced, status, pageSize]);
  const columns = useMemo<ColumnsType<PurchaseOrderSummaryDto>>(() => {
    const openEdit = async (id: string) => {
      try {
        setEditing(await getPurchaseOrder(id));
      } catch (error) {
        message.error(getApiErrorMessage(error));
      }
    };
    return [
      ...PURCHASE_ORDER_DATA_COLUMNS,
      col.actions<PurchaseOrderSummaryDto>(
        (row) => (
          <Dropdown
            menu={{
              items: [{ key: 'view', label: 'Xem chi tiết' }, ...(purchaseOrderActions(row).includes('edit') ? [{ key: 'edit', label: 'Sửa bản nháp' }] : [])],
              onClick: ({ key }) => (key === 'view' ? setSelectedId(row.id) : void openEdit(row.id)),
            }}
            trigger={['click']}
          >
            <Button type="text" aria-label={`Thao tác ${row.poNo}`} icon={<MoreOutlined />} />
          </Dropdown>
        ),
        { title: '', width: 70, onCell: () => ({ onClick: (event) => event.stopPropagation() }) },
      ),
    ];
  }, [message]);
  const query = useListPurchaseOrders({ page, limit: pageSize, search: search.debounced, status: status as never });

  return <div className="space-y-4">
    <div className="flex flex-wrap gap-3">
      <SearchInput value={search.value} onChange={search.setValue} placeholder="Tìm số PO" />
      <Select allowClear className="!w-48" value={status} onChange={setStatus} placeholder="Trạng thái" options={purchaseOrderStatusOptions} />
      <PermissionGate permission="purchase.order.create"><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Tạo đơn mua hàng</Button></PermissionGate>
    </div>
    {query.isError && <Alert type="error" showIcon message="Không tải được đơn mua hàng" description={getApiErrorMessage(query.error)} />}
    <AdminTable<PurchaseOrderSummaryDto>
      rowKey="id" emptyEntity="đơn mua hàng" loading={query.isLoading || query.isFetching} dataSource={query.data?.items ?? []}
      onRow={(row) => ({ onClick: () => setSelectedId(row.id), style: { cursor: 'pointer' } })}
      columns={columns}
      pagination={{ current: page, pageSize, total: query.data?.meta.total ?? 0, onChange: (next, size) => { setPage(next); setPageSize(size); }, showTotal: (total) => `${total} đơn mua hàng` }}
    />
    <PurchaseOrderDetailDrawer id={selectedId} onClose={() => setSelectedId(undefined)} onEdit={(current) => {
      setEditing(current);
      setSelectedId(undefined);
    }} />
    <PurchaseOrderFormDrawer open={createOpen || Boolean(editing)} editing={editing} onClose={() => { setCreateOpen(false); setEditing(undefined); }} />
  </div>;
}
