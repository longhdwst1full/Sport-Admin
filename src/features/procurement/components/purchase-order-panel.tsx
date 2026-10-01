import { MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, App, Button, Dropdown, Input, Select, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { PermissionGate } from '@/core/auth/permissions';
import { AdminTable } from '@/foundation/table';
import { getPurchaseOrder, useListPurchaseOrders } from '@/generated/api/procurement/procurement';
import type { PurchaseOrderDetailDto, PurchaseOrderSummaryDto } from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { PROCUREMENT_PAGE_SIZE, formatDateTime, moneyFormatter, partyLabel, purchaseOrderStatusOptions, statusLabel } from '../constants/procurement.constants';
import { purchaseOrderActions } from '../model/procurement-actions.policy';
import { PurchaseOrderDetailDrawer } from './purchase-order-detail-drawer';
import { PurchaseOrderFormDrawer } from './purchase-order-form-drawer';

export function PurchaseOrderPanel() {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PROCUREMENT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();
  const [editing, setEditing] = useState<PurchaseOrderDetailDto>();
  const [createOpen, setCreateOpen] = useState(false);
  const [debouncedSearch] = useDebounce(search.trim(), 350);
  useEffect(() => setPage(1), [debouncedSearch, status, pageSize]);
  const query = useListPurchaseOrders({ page, limit: pageSize, search: debouncedSearch || undefined, status: status as never });

  return <div className="space-y-4">
    <div className="flex flex-wrap gap-3">
      <Input.Search allowClear className="!w-80" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm số PO" />
      <Select allowClear className="!w-48" value={status} onChange={setStatus} placeholder="Trạng thái" options={purchaseOrderStatusOptions} />
      <PermissionGate permission="purchase.order.create"><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Tạo đơn mua hàng</Button></PermissionGate>
    </div>
    {query.isError && <Alert type="error" showIcon message="Không tải được đơn mua hàng" description={getApiErrorMessage(query.error)} />}
    <AdminTable<PurchaseOrderSummaryDto>
      rowKey="id" emptyEntity="đơn mua hàng" loading={query.isLoading || query.isFetching} dataSource={query.data?.items ?? []}
      onRow={(row) => ({ onClick: () => setSelectedId(row.id), style: { cursor: 'pointer' } })}
      columns={[
        { title: 'Số PO', dataIndex: 'poNo', width: 180 },
        { title: 'Nhà cung cấp', width: 240, render: (_, row) => <div><div className="font-medium">{row.supplier.name}</div><div className="text-xs text-slate-500">{row.supplier.code}</div></div> },
        { title: 'Kho nhận', width: 210, render: (_, row) => partyLabel(row.warehouse) },
        { title: 'Trạng thái', dataIndex: 'status', width: 150, render: (value) => <Tag color={value === 'CANCELLED' ? 'red' : value === 'CLOSED' || value === 'RECEIVED' ? 'green' : 'blue'}>{statusLabel(value)}</Tag> },
        { title: 'Cấp duyệt', dataIndex: 'approvalLevel', width: 150, render: (value) => value || 'Chưa chốt' },
        { title: 'Tổng tiền', dataIndex: 'grandTotal', width: 160, align: 'right', render: (value) => moneyFormatter.format(Number(value)) },
        { title: 'Ngày tạo', dataIndex: 'createdAt', width: 170, render: (value) => formatDateTime(value) },
        { title: '', key: 'actions', width: 70, fixed: 'right', align: 'right', render: (_, row) => <div onClick={(event) => event.stopPropagation()}><Dropdown menu={{ items: [{ key: 'view', label: 'Xem chi tiết' }, ...(purchaseOrderActions(row).includes('edit') ? [{ key: 'edit', label: 'Sửa bản nháp' }] : [])], onClick: async ({ key }) => {
          if (key === 'view') {
            setSelectedId(row.id);
            return;
          }
          try {
            setEditing(await getPurchaseOrder(row.id));
          } catch (error) {
            message.error(getApiErrorMessage(error));
          }
        } }} trigger={['click']}><Button type="text" aria-label={`Thao tác ${row.poNo}`} icon={<MoreOutlined />} /></Dropdown></div> },
      ]}
      pagination={{ current: page, pageSize, total: query.data?.meta.total ?? 0, onChange: (next, size) => { setPage(next); setPageSize(size); }, showTotal: (total) => `${total} đơn mua hàng` }}
    />
    <PurchaseOrderDetailDrawer id={selectedId} onClose={() => setSelectedId(undefined)} onEdit={(current) => {
      setEditing(current);
      setSelectedId(undefined);
    }} />
    <PurchaseOrderFormDrawer open={createOpen || Boolean(editing)} editing={editing} onClose={() => { setCreateOpen(false); setEditing(undefined); }} />
  </div>;
}
