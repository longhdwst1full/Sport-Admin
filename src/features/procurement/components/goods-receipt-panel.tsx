import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Select, Tag } from 'antd';
import { useState } from 'react';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { SearchInput } from '@/foundation/inputs/search-input';
import { PermissionGate } from '@/core/auth/permissions';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import type { ColumnsType } from 'antd/es/table';
import { AdminTable, col } from '@/foundation/table';
import { useListGoodsReceipts } from '@/generated/api/procurement/procurement';
import type { GoodsReceiptDetailDto, GoodsReceiptSummaryDto } from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { formatMoney } from '@/lib/format/money';
import { PROCUREMENT_PAGE_SIZE, goodsReceiptStatusOptions, goodsReceiptTypeOptions, partyLabel, statusLabel } from '../constants/procurement.constants';
import { GoodsReceiptDetailDrawer } from './goods-receipt-detail-drawer';
import { GoodsReceiptFormDrawer } from './goods-receipt-form-drawer';

const GOODS_RECEIPT_COLUMNS: ColumnsType<GoodsReceiptSummaryDto> = [
  { title: 'Số phiếu', dataIndex: 'receiptNo', width: 190 },
  { title: 'Loại', dataIndex: 'receiptType', width: 140, render: (value) => value === 'WITH_PO' ? 'Theo PO' : 'Trực tiếp' },
  { title: 'Nhà cung cấp', width: 240, render: (_, row) => partyLabel(row.supplier) },
  { title: 'Kho', width: 210, render: (_, row) => partyLabel(row.warehouse) },
  { title: 'Trạng thái', dataIndex: 'status', width: 140, render: (value) => <Tag color={value === 'POSTED' ? 'green' : value === 'CANCELLED' ? 'red' : 'blue'}>{statusLabel(value)}</Tag> },
  col.number<GoodsReceiptSummaryDto>('itemCount', 'Số dòng', { width: 90 }),
  { title: 'Tổng giá vốn', width: 160, align: 'right', render: (_, row) => formatMoney(row.totals.landedTotal) },
  col.dateTime<GoodsReceiptSummaryDto>('createdAt', 'Ngày tạo', { width: 170 }),
];

export function GoodsReceiptPanel() {
  const [pageSize, setPageSize] = useState(PROCUREMENT_PAGE_SIZE);
  const search = useSearchState(); const [status, setStatus] = useState<string>(); const [receiptType, setReceiptType] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>(); const [editing, setEditing] = useState<GoodsReceiptDetailDto>(); const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useListPageReset([search.debounced, status, receiptType, pageSize]);
  const query = useListGoodsReceipts({ page, limit: pageSize, search: search.debounced, status: status as never, receiptType: receiptType as never });
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-3"><SearchInput value={search.value} onChange={search.setValue} placeholder="Tìm số phiếu / hoá đơn NCC" /><Select allowClear className="!w-44" placeholder="Loại phiếu" options={goodsReceiptTypeOptions} value={receiptType} onChange={setReceiptType} /><Select allowClear className="!w-44" placeholder="Trạng thái" options={goodsReceiptStatusOptions} value={status} onChange={setStatus} /><PermissionGate permission="purchase.receipt.create"><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Tạo phiếu nhập</Button></PermissionGate></div>
    {query.isError && <Alert type="error" showIcon message="Không tải được phiếu nhập" description={getApiErrorMessage(query.error)} />}
    <AdminTable<GoodsReceiptSummaryDto> rowKey="id" emptyEntity="phiếu nhập" loading={query.isLoading || query.isFetching} dataSource={query.data?.items ?? []} onRow={(row) => ({ onClick: () => setSelectedId(row.id), style: { cursor: 'pointer' } })} columns={GOODS_RECEIPT_COLUMNS} pagination={{ current: page, pageSize, total: query.data?.total ?? 0, onChange: (next, size) => { setPage(next); setPageSize(size); }, showTotal: (total) => `${total} phiếu nhập` }} />
    <GoodsReceiptDetailDrawer id={selectedId} onClose={() => setSelectedId(undefined)} onEdit={(value) => { setEditing(value); setSelectedId(undefined); }} />
    <GoodsReceiptFormDrawer open={createOpen || Boolean(editing)} editing={editing} onClose={() => { setCreateOpen(false); setEditing(undefined); }} />
  </div>;
}
