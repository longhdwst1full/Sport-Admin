import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Select, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { PermissionGate } from '@/core/auth/permissions';
import { AdminTable } from '@/foundation/table';
import { useListSupplierReturns } from '@/generated/api/procurement/procurement';
import type { SupplierReturnDetailDto, SupplierReturnSummaryDto } from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { PROCUREMENT_PAGE_SIZE, formatDateTime, partyLabel, statusLabel, supplierReturnStatusOptions } from '../constants/procurement.constants';
import { SupplierReturnDetailDrawer } from './supplier-return-detail-drawer';
import { SupplierReturnFormDrawer } from './supplier-return-form-drawer';

export function SupplierReturnPanel() {
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(PROCUREMENT_PAGE_SIZE); const [search, setSearch] = useState(''); const [status, setStatus] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>(); const [editing, setEditing] = useState<SupplierReturnDetailDto>(); const [createOpen, setCreateOpen] = useState(false);
  const [debouncedSearch] = useDebounce(search.trim(), 350); useEffect(() => setPage(1), [debouncedSearch, status, pageSize]);
  const query = useListSupplierReturns({ page, limit: pageSize, search: debouncedSearch || undefined, status: status as never });
  return <div className="space-y-4"><div className="flex flex-wrap gap-3"><Input.Search allowClear className="!w-80" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã phiếu trả" /><Select allowClear className="!w-48" value={status} onChange={setStatus} placeholder="Trạng thái" options={supplierReturnStatusOptions} /><PermissionGate permission="purchase.return.manage"><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Tạo phiếu trả NCC</Button></PermissionGate></div>
    {query.isError && <Alert type="error" showIcon message="Không tải được phiếu trả" description={getApiErrorMessage(query.error)} />}
    <AdminTable<SupplierReturnSummaryDto> rowKey="id" emptyEntity="phiếu trả nhà cung cấp" loading={query.isLoading || query.isFetching} dataSource={query.data?.items ?? []} onRow={(row) => ({ onClick: () => setSelectedId(row.id), style: { cursor: 'pointer' } })} columns={[
      { title: 'Số phiếu', dataIndex: 'returnNo', width: 190 }, { title: 'Nhà cung cấp', width: 240, render: (_, row) => partyLabel(row.supplier) }, { title: 'Kho', width: 210, render: (_, row) => partyLabel(row.warehouse) },
      { title: 'Phiếu nhập', width: 170, render: (_, row) => row.goodsReceipt?.receiptNo ?? 'Không gắn' }, { title: 'Trạng thái', dataIndex: 'status', width: 140, render: (value) => <Tag color={value === 'CLOSED' ? 'green' : value === 'CANCELLED' ? 'red' : 'blue'}>{statusLabel(value)}</Tag> },
      { title: 'Lý do', dataIndex: 'reason', width: 260, ellipsis: true }, { title: 'Ngày tạo', dataIndex: 'createdAt', width: 170, render: (value) => formatDateTime(value) },
    ]} pagination={{ current: page, pageSize, total: query.data?.total ?? 0, onChange: (next, size) => { setPage(next); setPageSize(size); }, showTotal: (total) => `${total} phiếu trả` }} />
    <SupplierReturnDetailDrawer id={selectedId} onClose={() => setSelectedId(undefined)} onEdit={(value) => { setEditing(value); setSelectedId(undefined); }} /><SupplierReturnFormDrawer open={createOpen || Boolean(editing)} editing={editing} onClose={() => { setCreateOpen(false); setEditing(undefined); }} />
  </div>;
}
