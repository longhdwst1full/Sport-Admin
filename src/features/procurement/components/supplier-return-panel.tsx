import { Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { col } from '@/foundation/table';
import { useListSupplierReturns } from '@/generated/api/procurement/procurement';
import {
  SupplierReturnStatus,
  type SupplierReturnDetailDto,
  type SupplierReturnSummaryDto,
} from '@/generated/api/procurement/procurement.schemas';
import { partyLabel, supplierReturnStatusOptions, supplierReturnStatusPresentation } from '../constants/procurement.constants';
import { useProcurementListState } from '../hooks/use-procurement-list-state';
import { ProcurementListPanel } from './procurement-list-panel';
import { SupplierReturnDetailDrawer } from './supplier-return-detail-drawer';
import { SupplierReturnFormDrawer } from './supplier-return-form-drawer';

const SUPPLIER_RETURN_COLUMNS: ColumnsType<SupplierReturnSummaryDto> = [
  col.text<SupplierReturnSummaryDto>('returnNo', 'Số phiếu', { width: 190 }),
  { title: 'Nhà cung cấp', width: 240, render: (_, row) => partyLabel(row.supplier) },
  { title: 'Kho', width: 210, render: (_, row) => partyLabel(row.warehouse) },
  { title: 'Phiếu nhập', width: 170, render: (_, row) => row.goodsReceipt?.receiptNo ?? 'Không gắn' },
  col.status<SupplierReturnSummaryDto, SupplierReturnStatus>('status', 'Trạng thái', supplierReturnStatusPresentation, { width: 140 }),
  col.text<SupplierReturnSummaryDto>('reason', 'Lý do', { width: 260, ellipsis: true }),
  col.dateTime<SupplierReturnSummaryDto>('createdAt', 'Ngày tạo', { width: 170 }),
];

export function SupplierReturnPanel() {
  const list = useProcurementListState<SupplierReturnDetailDto>();
  const status = list.url.getEnum('status', SupplierReturnStatus);
  const query = useListSupplierReturns({ page: list.page, limit: list.pageSize, search: list.q, status });

  return (
    <ProcurementListPanel<SupplierReturnSummaryDto>
      query={query}
      rows={query.data?.items ?? []}
      columns={SUPPLIER_RETURN_COLUMNS}
      emptyEntity="phiếu trả nhà cung cấp"
      pagination={list.pagination(query.data?.total ?? 0, 'phiếu trả')}
      searchValue={list.searchValue}
      onSearch={list.onSearch}
      searchPlaceholder="Tìm mã phiếu trả"
      filters={<Select allowClear className="!w-48" value={status} onChange={(value?: string) => list.setFilter('status', value)} placeholder="Trạng thái" options={supplierReturnStatusOptions} />}
      create={{ permission: 'purchase.return.manage', label: 'Tạo phiếu trả NCC', onClick: list.openCreate }}
      onOpen={list.openDetail}
    >
      <SupplierReturnDetailDrawer id={list.selectedId} onClose={list.closeDetail} onEdit={list.openEdit} />
      <SupplierReturnFormDrawer open={list.formOpen} editing={list.editing} onClose={list.closeForm} />
    </ProcurementListPanel>
  );
}
