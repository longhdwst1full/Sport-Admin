import { MoreOutlined } from '@ant-design/icons';
import { App, Button, Dropdown, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { col } from '@/foundation/table';
import { getPurchaseOrder, useListPurchaseOrders } from '@/generated/api/procurement/procurement';
import {
  PurchaseOrderStatus,
  type PurchaseOrderApprovalLevel,
  type PurchaseOrderDetailDto,
  type PurchaseOrderSummaryDto,
} from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import {
  approvalLevelLabels,
  enumLabel,
  partyLabel,
  purchaseOrderStatusOptions,
  purchaseOrderStatusPresentation,
} from '../constants/procurement.constants';
import { useProcurementListState } from '../hooks/use-procurement-list-state';
import { purchaseOrderActions } from '../model/procurement-actions.policy';
import { ProcurementListPanel } from './procurement-list-panel';
import { PurchaseOrderDetailDrawer } from './purchase-order-detail-drawer';
import { PurchaseOrderFormDrawer } from './purchase-order-form-drawer';

const PURCHASE_ORDER_DATA_COLUMNS: ColumnsType<PurchaseOrderSummaryDto> = [
  col.text<PurchaseOrderSummaryDto>('poNo', 'Số PO', { width: 180 }),
  { title: 'Nhà cung cấp', width: 240, render: (_, row) => <div><div className="font-medium">{row.supplier.name}</div><div className="text-xs text-slate-500">{row.supplier.code}</div></div> },
  { title: 'Kho nhận', width: 210, render: (_, row) => partyLabel(row.warehouse) },
  col.status<PurchaseOrderSummaryDto, PurchaseOrderStatus>('status', 'Trạng thái', purchaseOrderStatusPresentation),
  { title: 'Cấp duyệt', dataIndex: 'approvalLevel', width: 150, render: (value?: PurchaseOrderApprovalLevel | null) => enumLabel(approvalLevelLabels, value, 'Chưa chốt') },
  col.money<PurchaseOrderSummaryDto>('grandTotal', 'Tổng tiền', { width: 160 }),
  col.dateTime<PurchaseOrderSummaryDto>('createdAt', 'Ngày tạo', { width: 170 }),
];

export function PurchaseOrderPanel() {
  const { message } = App.useApp();
  const list = useProcurementListState<PurchaseOrderDetailDto>();
  const { openDetail, openEdit } = list;
  const status = list.url.getEnum('status', PurchaseOrderStatus);
  const query = useListPurchaseOrders({ page: list.page, limit: list.pageSize, search: list.q, status });

  const columns = useMemo<ColumnsType<PurchaseOrderSummaryDto>>(() => {
    // Danh sách chỉ có summary; form sửa cần detail (dòng hàng, version) nên tải trước khi mở.
    const editById = async (id: string) => {
      try {
        openEdit(await getPurchaseOrder(id));
      } catch (error) {
        void message.error(getApiErrorMessage(error));
      }
    };
    return [
      ...PURCHASE_ORDER_DATA_COLUMNS,
      col.actions<PurchaseOrderSummaryDto>(
        (row) => (
          <Dropdown
            menu={{
              items: [{ key: 'view', label: 'Xem chi tiết' }, ...(purchaseOrderActions(row).includes('edit') ? [{ key: 'edit', label: 'Sửa bản nháp' }] : [])],
              onClick: ({ key }) => (key === 'view' ? openDetail(row.id) : void editById(row.id)),
            }}
            trigger={['click']}
          >
            <Button type="text" aria-label={`Thao tác ${row.poNo}`} icon={<MoreOutlined />} />
          </Dropdown>
        ),
        { title: '', width: 70, onCell: () => ({ onClick: (event) => event.stopPropagation() }) },
      ),
    ];
  }, [message, openDetail, openEdit]);

  return (
    <ProcurementListPanel<PurchaseOrderSummaryDto>
      query={query}
      rows={query.data?.items ?? []}
      columns={columns}
      emptyEntity="đơn mua hàng"
      pagination={list.pagination(query.data?.meta.total ?? 0, 'đơn mua hàng')}
      searchValue={list.searchValue}
      onSearch={list.onSearch}
      searchPlaceholder="Tìm số PO"
      filters={<Select allowClear className="!w-48" value={status} onChange={(value?: string) => list.setFilter('status', value)} placeholder="Trạng thái" options={purchaseOrderStatusOptions} />}
      create={{ permission: 'purchase.order.create', label: 'Tạo đơn mua hàng', onClick: list.openCreate }}
      onOpen={openDetail}
    >
      <PurchaseOrderDetailDrawer id={list.selectedId} onClose={list.closeDetail} onEdit={openEdit} />
      <PurchaseOrderFormDrawer open={list.formOpen} editing={list.editing} onClose={list.closeForm} />
    </ProcurementListPanel>
  );
}
