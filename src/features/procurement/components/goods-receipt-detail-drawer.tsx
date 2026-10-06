import { App, Button, Descriptions, Drawer, Space, Tag } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { PermissionGate } from '@/core/auth/permissions';
import type { ColumnsType } from 'antd/es/table';
import { AdminTable, col } from '@/foundation/table';
import {
  cancelGoodsReceipt,
  getGetGoodsReceiptQueryKey,
  getListGoodsReceiptsQueryKey,
  postGoodsReceipt,
  useGetGoodsReceipt,
} from '@/generated/api/procurement/procurement';
import type { GoodsReceiptDetailDto } from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage, isStaleWriteError, STALE_WRITE_RELOADED_MESSAGE } from '@/lib/api/error';
import { formatMoney } from '@/lib/format/money';
import { actorAt, costAllocationOptions, directReceiptReasonOptions, goodsReceiptTypeOptions, optionLabel, partyLabel, receiptCostTypeOptions, statusLabel } from '../constants/procurement.constants';
import { goodsReceiptActions } from '../model/procurement-actions.policy';
import { DRAWER_WIDTH } from '@/foundation/overlay';

type ReceiptItem = GoodsReceiptDetailDto['items'][number];
type ReceiptCost = GoodsReceiptDetailDto['costs'][number];

const RECEIPT_ITEM_COLUMNS: ColumnsType<ReceiptItem> = [
  { title: 'SKU', dataIndex: 'sku', width: 150 },
  { title: 'Biến thể', dataIndex: 'variantName', width: 220 },
  col.number<ReceiptItem>('quantity', 'Số nhận', { width: 100 }),
  col.money<ReceiptItem>('unitCost', 'Đơn giá', { width: 150 }),
  { title: 'Giá vốn sau phân bổ', dataIndex: 'landedUnitCost', width: 180, align: 'right', render: (value) => value ? formatMoney(value) : 'Chưa ghi sổ' },
];

const RECEIPT_COST_COLUMNS: ColumnsType<ReceiptCost> = [
  { title: 'Loại chi phí', dataIndex: 'costType', width: 180, render: (value) => optionLabel(receiptCostTypeOptions, value) },
  col.money<ReceiptCost>('amount', 'Số tiền', { width: 160 }),
  col.text<ReceiptCost>('note', 'Ghi chú'),
];

export function GoodsReceiptDetailDrawer({ id, onClose, onEdit }: { id?: string; onClose: () => void; onEdit: (detail: GoodsReceiptDetailDto) => void }) {
  const query = useGetGoodsReceipt(id ?? '', { query: { enabled: Boolean(id) } });
  const detail = query.data;
  const actions = detail ? goodsReceiptActions(detail.status) : [];
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const refresh = async () => {
    if (!detail) return;
    await Promise.all([queryClient.invalidateQueries({ queryKey: getListGoodsReceiptsQueryKey() }), queryClient.invalidateQueries({ queryKey: getGetGoodsReceiptQueryKey(detail.id) })]);
  };
  // CONTRACT: 409 VERSION_STALE/CONCURRENT_UPDATE → tải lại chi tiết để thao tác tiếp trên version mới.
  const fail = (error: unknown) => {
    if (isStaleWriteError(error)) {
      void refresh();
      void message.warning(STALE_WRITE_RELOADED_MESSAGE);
    } else void message.error(getApiErrorMessage(error));
    throw error;
  };
  const post = () => detail && modal.confirm({ title: `Ghi sổ ${detail.receiptNo}?`, content: 'Thao tác sẽ cộng tồn và cập nhật giá vốn bình quân, không thể hoàn tác.', okText: 'Ghi sổ', onOk: async () => postGoodsReceipt(detail.id, { expectedVersion: detail.version }).then(refresh).catch(fail) });
  const cancel = () => {
    if (!detail) return;
    let reason = '';
    modal.confirm({ title: `Huỷ ${detail.receiptNo}?`, content: <textarea className="mt-3 min-h-24 w-full rounded-lg border border-slate-300 p-3" placeholder="Lý do huỷ" onChange={(event) => { reason = event.target.value; }} />, okText: 'Huỷ phiếu', okButtonProps: { danger: true }, onOk: async () => {
      if (reason.trim().length < 3) throw new Error('Nhập lý do tối thiểu 3 ký tự');
      await cancelGoodsReceipt(detail.id, { expectedVersion: detail.version, reason: reason.trim() }).then(refresh).catch(fail);
    } });
  };
  return <Drawer title={detail?.receiptNo ?? 'Chi tiết phiếu nhập'} width={DRAWER_WIDTH.xl} open={Boolean(id)} loading={query.isLoading} onClose={onClose} extra={detail && <Space>
    {actions.includes('edit') && <PermissionGate permission="purchase.receipt.create"><Button onClick={() => onEdit(detail)}>Sửa</Button></PermissionGate>}
    {actions.includes('post') && <PermissionGate permission="purchase.receipt.post"><Button type="primary" onClick={post}>Ghi sổ</Button></PermissionGate>}
    {actions.includes('cancel') && <PermissionGate permission="purchase.receipt.create"><Button danger onClick={cancel}>Huỷ</Button></PermissionGate>}
  </Space>}>
    {query.isError && <div className="text-red-600">{getApiErrorMessage(query.error)}</div>}
    {detail && <div className="space-y-5">
      <Descriptions bordered column={{ xs: 1, md: 2 }}>
        <Descriptions.Item label="Trạng thái"><Tag>{statusLabel(detail.status)}</Tag></Descriptions.Item><Descriptions.Item label="Loại phiếu">{optionLabel(goodsReceiptTypeOptions, detail.receiptType)}</Descriptions.Item>
        <Descriptions.Item label="Nhà cung cấp">{partyLabel(detail.supplier)}</Descriptions.Item><Descriptions.Item label="Kho nhận">{partyLabel(detail.warehouse)}</Descriptions.Item>
        <Descriptions.Item label="PO">{detail.purchaseOrder?.poNo ?? 'Nhập trực tiếp'}</Descriptions.Item><Descriptions.Item label="Hoá đơn NCC">{detail.supplierInvoiceNo ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Giá trị hàng">{formatMoney(detail.totals.goodsValue)}</Descriptions.Item><Descriptions.Item label="Tổng sau chi phí">{formatMoney(detail.totals.landedTotal)}</Descriptions.Item>
        <Descriptions.Item label="Phân bổ chi phí">{optionLabel(costAllocationOptions, detail.costAllocation)}</Descriptions.Item>
        <Descriptions.Item label="Lý do nhập trực tiếp">{optionLabel(directReceiptReasonOptions, detail.reasonCode)}</Descriptions.Item>
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
  </Drawer>;
}

