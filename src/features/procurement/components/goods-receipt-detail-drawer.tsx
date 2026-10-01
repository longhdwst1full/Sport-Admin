import { App, Button, Descriptions, Drawer, Space, Tag } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { PermissionGate } from '@/core/auth/permissions';
import { AdminTable } from '@/foundation/table';
import {
  cancelGoodsReceipt,
  getGetGoodsReceiptQueryKey,
  getListGoodsReceiptsQueryKey,
  postGoodsReceipt,
  useGetGoodsReceipt,
} from '@/generated/api/procurement/procurement';
import type { GoodsReceiptDetailDto } from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { actorAt, costAllocationOptions, directReceiptReasonOptions, goodsReceiptTypeOptions, moneyFormatter, optionLabel, partyLabel, receiptCostTypeOptions, statusLabel } from '../constants/procurement.constants';
import { goodsReceiptActions } from '../model/procurement-actions.policy';

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
  const post = () => detail && modal.confirm({ title: `Ghi sổ ${detail.receiptNo}?`, content: 'Thao tác sẽ cộng tồn và cập nhật giá vốn bình quân, không thể hoàn tác.', okText: 'Ghi sổ', onOk: async () => postGoodsReceipt(detail.id, { expectedVersion: detail.version }).then(refresh).catch((error) => { void message.error(getApiErrorMessage(error)); throw error; }) });
  const cancel = () => {
    if (!detail) return;
    let reason = '';
    modal.confirm({ title: `Huỷ ${detail.receiptNo}?`, content: <textarea className="mt-3 min-h-24 w-full rounded-lg border border-slate-300 p-3" placeholder="Lý do huỷ" onChange={(event) => { reason = event.target.value; }} />, okText: 'Huỷ phiếu', okButtonProps: { danger: true }, onOk: async () => {
      if (reason.trim().length < 3) throw new Error('Nhập lý do tối thiểu 3 ký tự');
      await cancelGoodsReceipt(detail.id, { expectedVersion: detail.version, reason: reason.trim() }).then(refresh).catch((error) => { void message.error(getApiErrorMessage(error)); throw error; });
    } });
  };
  return <Drawer title={detail?.receiptNo ?? 'Chi tiết phiếu nhập'} width="min(1050px, 96vw)" open={Boolean(id)} loading={query.isLoading} onClose={onClose} extra={detail && <Space>
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
        <Descriptions.Item label="Giá trị hàng">{moneyFormatter.format(Number(detail.totals.goodsValue))}</Descriptions.Item><Descriptions.Item label="Tổng sau chi phí">{moneyFormatter.format(Number(detail.totals.landedTotal))}</Descriptions.Item>
        <Descriptions.Item label="Phân bổ chi phí">{optionLabel(costAllocationOptions, detail.costAllocation)}</Descriptions.Item>
        <Descriptions.Item label="Lý do nhập trực tiếp">{optionLabel(directReceiptReasonOptions, detail.reasonCode)}</Descriptions.Item>
        <Descriptions.Item label="Người tạo">{detail.createdByDisplayName}</Descriptions.Item>
        <Descriptions.Item label="Ghi sổ bởi">{actorAt(detail.postedByDisplayName, detail.postedAt, 'Chưa ghi sổ')}</Descriptions.Item>
        {detail.note ? <Descriptions.Item label="Ghi chú" span={2}>{detail.note}</Descriptions.Item> : null}
      </Descriptions>
      <AdminTable surface="embedded" rowKey="id" pagination={false} dataSource={detail.items} columns={[
        { title: 'SKU', dataIndex: 'sku', width: 150 }, { title: 'Biến thể', dataIndex: 'variantName', width: 220 }, { title: 'Số nhận', dataIndex: 'quantity', width: 100, align: 'right' },
        { title: 'Đơn giá', dataIndex: 'unitCost', width: 150, align: 'right', render: (value) => moneyFormatter.format(Number(value)) }, { title: 'Giá vốn sau phân bổ', dataIndex: 'landedUnitCost', width: 180, align: 'right', render: (value) => value ? moneyFormatter.format(Number(value)) : 'Chưa ghi sổ' },
      ]} />
      {detail.costs.length > 0 && <div className="space-y-2">
        <div className="font-semibold text-slate-800">Chi phí nhập</div>
        <AdminTable surface="embedded" rowKey="id" pagination={false} dataSource={detail.costs} columns={[
          { title: 'Loại chi phí', dataIndex: 'costType', width: 180, render: (value) => optionLabel(receiptCostTypeOptions, value) },
          { title: 'Số tiền', dataIndex: 'amount', width: 160, align: 'right', render: (value) => moneyFormatter.format(Number(value)) },
          { title: 'Ghi chú', dataIndex: 'note', render: (value) => value ?? '—' },
        ]} />
      </div>}
    </div>}
  </Drawer>;
}

