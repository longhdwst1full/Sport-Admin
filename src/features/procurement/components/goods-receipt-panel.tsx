import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Select, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { PermissionGate } from '@/core/auth/permissions';
import { AdminTable } from '@/foundation/table';
import { useListGoodsReceipts } from '@/generated/api/procurement/procurement';
import type { GoodsReceiptDetailDto, GoodsReceiptSummaryDto } from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { PROCUREMENT_PAGE_SIZE, formatDateTime, goodsReceiptStatusOptions, goodsReceiptTypeOptions, moneyFormatter, partyLabel, statusLabel } from '../constants/procurement.constants';
import { GoodsReceiptDetailDrawer } from './goods-receipt-detail-drawer';
import { GoodsReceiptFormDrawer } from './goods-receipt-form-drawer';

export function GoodsReceiptPanel() {
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(PROCUREMENT_PAGE_SIZE);
  const [search, setSearch] = useState(''); const [status, setStatus] = useState<string>(); const [receiptType, setReceiptType] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>(); const [editing, setEditing] = useState<GoodsReceiptDetailDto>(); const [createOpen, setCreateOpen] = useState(false);
  const [debouncedSearch] = useDebounce(search.trim(), 350); useEffect(() => setPage(1), [debouncedSearch, status, receiptType, pageSize]);
  const query = useListGoodsReceipts({ page, limit: pageSize, search: debouncedSearch || undefined, status: status as never, receiptType: receiptType as never });
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-3"><Input.Search allowClear className="!w-80" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm số phiếu / hoá đơn NCC" /><Select allowClear className="!w-44" placeholder="Loại phiếu" options={goodsReceiptTypeOptions} value={receiptType} onChange={setReceiptType} /><Select allowClear className="!w-44" placeholder="Trạng thái" options={goodsReceiptStatusOptions} value={status} onChange={setStatus} /><PermissionGate permission="purchase.receipt.create"><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Tạo phiếu nhập</Button></PermissionGate></div>
    {query.isError && <Alert type="error" showIcon message="Không tải được phiếu nhập" description={getApiErrorMessage(query.error)} />}
    <AdminTable<GoodsReceiptSummaryDto> rowKey="id" emptyEntity="phiếu nhập" loading={query.isLoading || query.isFetching} dataSource={query.data?.items ?? []} onRow={(row) => ({ onClick: () => setSelectedId(row.id), style: { cursor: 'pointer' } })} columns={[
      { title: 'Số phiếu', dataIndex: 'receiptNo', width: 190 }, { title: 'Loại', dataIndex: 'receiptType', width: 140, render: (value) => value === 'WITH_PO' ? 'Theo PO' : 'Trực tiếp' },
      { title: 'Nhà cung cấp', width: 240, render: (_, row) => partyLabel(row.supplier) }, { title: 'Kho', width: 210, render: (_, row) => partyLabel(row.warehouse) },
      { title: 'Trạng thái', dataIndex: 'status', width: 140, render: (value) => <Tag color={value === 'POSTED' ? 'green' : value === 'CANCELLED' ? 'red' : 'blue'}>{statusLabel(value)}</Tag> },
      { title: 'Số dòng', dataIndex: 'itemCount', width: 90, align: 'right' }, { title: 'Tổng giá vốn', width: 160, align: 'right', render: (_, row) => moneyFormatter.format(Number(row.totals.landedTotal)) }, { title: 'Ngày tạo', dataIndex: 'createdAt', width: 170, render: (value) => formatDateTime(value) },
    ]} pagination={{ current: page, pageSize, total: query.data?.total ?? 0, onChange: (next, size) => { setPage(next); setPageSize(size); }, showTotal: (total) => `${total} phiếu nhập` }} />
    <GoodsReceiptDetailDrawer id={selectedId} onClose={() => setSelectedId(undefined)} onEdit={(value) => { setEditing(value); setSelectedId(undefined); }} />
    <GoodsReceiptFormDrawer open={createOpen || Boolean(editing)} editing={editing} onClose={() => { setCreateOpen(false); setEditing(undefined); }} />
  </div>;
}
