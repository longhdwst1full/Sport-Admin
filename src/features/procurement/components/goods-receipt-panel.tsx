import { Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { col } from '@/foundation/table';
import { useListGoodsReceipts } from '@/generated/api/procurement/procurement';
import {
  GoodsReceiptStatus,
  GoodsReceiptType,
  type GoodsReceiptDetailDto,
  type GoodsReceiptSummaryDto,
} from '@/generated/api/procurement/procurement.schemas';
import { formatMoney } from '@/lib/format/money';
import {
  goodsReceiptStatusOptions,
  goodsReceiptStatusPresentation,
  goodsReceiptTypeLabels,
  goodsReceiptTypeOptions,
  partyLabel,
} from '../constants/procurement.constants';
import { useProcurementListState } from '../hooks/use-procurement-list-state';
import { GoodsReceiptDetailDrawer } from './goods-receipt-detail-drawer';
import { GoodsReceiptFormDrawer } from './goods-receipt-form-drawer';
import { ProcurementListPanel } from './procurement-list-panel';

const GOODS_RECEIPT_COLUMNS: ColumnsType<GoodsReceiptSummaryDto> = [
  col.text<GoodsReceiptSummaryDto>('receiptNo', 'Số phiếu', { width: 190 }),
  { title: 'Loại', dataIndex: 'receiptType', width: 140, render: (value: GoodsReceiptType) => goodsReceiptTypeLabels[value] ?? value },
  { title: 'Nhà cung cấp', width: 240, render: (_, row) => partyLabel(row.supplier) },
  { title: 'Kho', width: 210, render: (_, row) => partyLabel(row.warehouse) },
  col.status<GoodsReceiptSummaryDto, GoodsReceiptStatus>('status', 'Trạng thái', goodsReceiptStatusPresentation, { width: 140 }),
  col.number<GoodsReceiptSummaryDto>('itemCount', 'Số dòng', { width: 90 }),
  { title: 'Tổng giá vốn', width: 160, align: 'right', render: (_, row) => formatMoney(row.totals.landedTotal) },
  col.dateTime<GoodsReceiptSummaryDto>('createdAt', 'Ngày tạo', { width: 170 }),
];

export function GoodsReceiptPanel() {
  const list = useProcurementListState<GoodsReceiptDetailDto>();
  const status = list.url.getEnum('status', GoodsReceiptStatus);
  const receiptType = list.url.getEnum('type', GoodsReceiptType);
  const query = useListGoodsReceipts({ page: list.page, limit: list.pageSize, search: list.q, status, receiptType });

  return (
    <ProcurementListPanel<GoodsReceiptSummaryDto>
      query={query}
      rows={query.data?.items ?? []}
      columns={GOODS_RECEIPT_COLUMNS}
      emptyEntity="phiếu nhập"
      pagination={list.pagination(query.data?.total ?? 0, 'phiếu nhập')}
      searchValue={list.searchValue}
      onSearch={list.onSearch}
      searchPlaceholder="Tìm số phiếu / hoá đơn NCC"
      filters={
        <>
          <Select allowClear className="!w-44" placeholder="Loại phiếu" options={goodsReceiptTypeOptions} value={receiptType} onChange={(value?: string) => list.setFilter('type', value)} />
          <Select allowClear className="!w-44" placeholder="Trạng thái" options={goodsReceiptStatusOptions} value={status} onChange={(value?: string) => list.setFilter('status', value)} />
        </>
      }
      create={{ permission: 'purchase.receipt.create', label: 'Tạo phiếu nhập', onClick: list.openCreate }}
      onOpen={list.openDetail}
    >
      <GoodsReceiptDetailDrawer id={list.selectedId} onClose={list.closeDetail} onEdit={list.openEdit} />
      <GoodsReceiptFormDrawer open={list.formOpen} editing={list.editing} onClose={list.closeForm} />
    </ProcurementListPanel>
  );
}
