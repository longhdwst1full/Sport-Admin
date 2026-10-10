import { App, Button, Descriptions, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PermissionGate } from '@/core/auth/permissions';
import { StatusTag } from '@/foundation/management/status-tag';
import { DetailDrawer, useConfirmWithReason } from '@/foundation/overlay';
import { AdminTable, col } from '@/foundation/table';
import {
  cancelGoodsReceipt,
  getGetGoodsReceiptQueryKey,
  getListGoodsReceiptsQueryKey,
  postGoodsReceipt,
  useGetGoodsReceipt,
} from '@/generated/api/procurement/procurement';
import type { GoodsReceiptCostType, GoodsReceiptDetailDto } from '@/generated/api/procurement/procurement.schemas';
import { formatMoney } from '@/lib/format/money';
import {
  actorAt,
  CANCEL_REASON_MIN_LENGTH,
  costAllocationLabels,
  directReceiptReasonLabels,
  enumLabel,
  goodsReceiptStatusPresentation,
  goodsReceiptTypeLabels,
  partyLabel,
  receiptCostTypeLabels,
} from '../constants/procurement.constants';
import { useDocumentCommand } from '../hooks/use-procurement-mutations';
import { goodsReceiptActions } from '../model/procurement-actions.policy';

type ReceiptItem = GoodsReceiptDetailDto['items'][number];
type ReceiptCost = GoodsReceiptDetailDto['costs'][number];

const RECEIPT_ITEM_COLUMNS: ColumnsType<ReceiptItem> = [
  col.text<ReceiptItem>('sku', 'SKU', { width: 150 }),
  col.text<ReceiptItem>('variantName', 'Biến thể', { width: 220 }),
  col.number<ReceiptItem>('quantity', 'Số nhận', { width: 100 }),
  col.money<ReceiptItem>('unitCost', 'Đơn giá', { width: 150 }),
  { title: 'Giá vốn sau phân bổ', dataIndex: 'landedUnitCost', width: 180, align: 'right', render: (value?: string | null) => value ? formatMoney(value) : 'Chưa ghi sổ' },
];

const RECEIPT_COST_COLUMNS: ColumnsType<ReceiptCost> = [
  { title: 'Loại chi phí', dataIndex: 'costType', width: 180, render: (value: GoodsReceiptCostType) => enumLabel(receiptCostTypeLabels, value) },
  col.money<ReceiptCost>('amount', 'Số tiền', { width: 160 }),
  col.text<ReceiptCost>('note', 'Ghi chú'),
];

const RECEIPT_KEYS = { list: getListGoodsReceiptsQueryKey(), detail: getGetGoodsReceiptQueryKey };

export function GoodsReceiptDetailDrawer({ id, onClose, onEdit }: { id?: string; onClose: () => void; onEdit: (detail: GoodsReceiptDetailDto) => void }) {
  const query = useGetGoodsReceipt(id ?? '', { query: { enabled: Boolean(id) } });
  const detail = query.data;
  const actions = detail ? goodsReceiptActions(detail.status) : [];
  const { modal } = App.useApp();
  const confirmWithReason = useConfirmWithReason();
  const command = useDocumentCommand(RECEIPT_KEYS);

  const post = (current: GoodsReceiptDetailDto) => modal.confirm({
    title: `Ghi sổ ${current.receiptNo}?`,
    content: 'Thao tác sẽ cộng tồn và cập nhật giá vốn bình quân, không thể hoàn tác.',
    okText: 'Ghi sổ',
    onOk: () => command(current.id, () => postGoodsReceipt(current.id, { expectedVersion: current.version }), 'Đã ghi sổ phiếu nhập.'),
  });
  const cancel = (current: GoodsReceiptDetailDto) => confirmWithReason({
    title: `Huỷ ${current.receiptNo}?`,
    consequence: 'Phiếu nháp sẽ bị huỷ và không thể ghi sổ.',
    okText: 'Huỷ phiếu',
    placeholder: 'Lý do huỷ',
    minLength: CANCEL_REASON_MIN_LENGTH,
    onOk: (reason) => command(current.id, () => cancelGoodsReceipt(current.id, { expectedVersion: current.version, reason }), 'Đã huỷ phiếu nhập.'),
  });

  return <DetailDrawer
    title={detail?.receiptNo ?? 'Chi tiết phiếu nhập'}
    status={detail && <StatusTag status={detail.status} presentations={goodsReceiptStatusPresentation} />}
    size="xl"
    open={Boolean(id)}
    onClose={onClose}
    loading={query.isLoading}
    error={query.isError ? query.error : undefined}
    onRetry={() => void query.refetch()}
    actions={detail && <Space>
      {actions.includes('edit') && <PermissionGate permission="purchase.receipt.create"><Button onClick={() => onEdit(detail)}>Sửa</Button></PermissionGate>}
      {actions.includes('post') && <PermissionGate permission="purchase.receipt.post"><Button type="primary" onClick={() => post(detail)}>Ghi sổ</Button></PermissionGate>}
      {actions.includes('cancel') && <PermissionGate permission="purchase.receipt.create"><Button danger onClick={() => cancel(detail)}>Huỷ</Button></PermissionGate>}
    </Space>}
  >
    {detail && <div className="space-y-5">
      <Descriptions bordered column={{ xs: 1, md: 2 }}>
        <Descriptions.Item label="Loại phiếu">{enumLabel(goodsReceiptTypeLabels, detail.receiptType)}</Descriptions.Item>
        <Descriptions.Item label="PO">{detail.purchaseOrder?.poNo ?? 'Nhập trực tiếp'}</Descriptions.Item>
        <Descriptions.Item label="Nhà cung cấp">{partyLabel(detail.supplier)}</Descriptions.Item><Descriptions.Item label="Kho nhận">{partyLabel(detail.warehouse)}</Descriptions.Item>
        <Descriptions.Item label="Hoá đơn NCC">{detail.supplierInvoiceNo ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Phân bổ chi phí">{enumLabel(costAllocationLabels, detail.costAllocation)}</Descriptions.Item>
        <Descriptions.Item label="Giá trị hàng">{formatMoney(detail.totals.goodsValue)}</Descriptions.Item><Descriptions.Item label="Tổng sau chi phí">{formatMoney(detail.totals.landedTotal)}</Descriptions.Item>
        <Descriptions.Item label="Lý do nhập trực tiếp">{enumLabel(directReceiptReasonLabels, detail.reasonCode)}</Descriptions.Item>
        <Descriptions.Item label="Người tạo">{detail.createdByDisplayName}</Descriptions.Item>
        <Descriptions.Item label="Ghi sổ bởi">{actorAt(detail.postedByDisplayName, detail.postedAt, 'Chưa ghi sổ')}</Descriptions.Item>
        {detail.note ? <Descriptions.Item label="Ghi chú" span={2}>{detail.note}</Descriptions.Item> : null}
      </Descriptions>
      <AdminTable surface="embedded" rowKey="id" pagination={false} dataSource={detail.items} columns={RECEIPT_ITEM_COLUMNS} />
      {detail.costs.length > 0 && <div className="space-y-2">
        <div className="font-semibold text-slate-800">Chi phí nhập</div>
        <AdminTable surface="embedded" rowKey="id" pagination={false} dataSource={detail.costs} columns={RECEIPT_COST_COLUMNS} />
      </div>}
    </div>}
  </DetailDrawer>;
}
