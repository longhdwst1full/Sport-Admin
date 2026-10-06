import { App, Button, Descriptions, Drawer, Space, Tag } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { PermissionGate } from '@/core/auth/permissions';
import type { ColumnsType } from 'antd/es/table';
import { AdminTable, col } from '@/foundation/table';
import {
  approveSupplierReturn, cancelSupplierReturn, closeSupplierReturn,
  getGetSupplierReturnQueryKey, getListSupplierReturnsQueryKey,
  shipSupplierReturn, useGetSupplierReturn,
} from '@/generated/api/procurement/procurement';
import type { SupplierReturnDetailDto } from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage, isStaleWriteError, STALE_WRITE_RELOADED_MESSAGE } from '@/lib/api/error';
import { formatDateTime } from '@/lib/format/datetime';
import { formatMoney } from '@/lib/format/money';
import { actorAt, partyLabel, statusLabel } from '../constants/procurement.constants';
import { supplierReturnActions, type ProcurementAction } from '../model/procurement-actions.policy';
import { DRAWER_WIDTH } from '@/foundation/overlay';

type ReturnItem = SupplierReturnDetailDto['items'][number];

const RETURN_ITEM_COLUMNS: ColumnsType<ReturnItem> = [
  { title: 'SKU', dataIndex: 'sku', width: 150 },
  { title: 'Sản phẩm', dataIndex: 'productName', width: 240 },
  col.number<ReturnItem>('quantity', 'Số trả', { width: 100 }),
  col.money<ReturnItem>('invoiceUnitCost', 'Giá hoá đơn', { width: 150 }),
  { title: 'Giá vốn xuất', dataIndex: 'issuedUnitCost', width: 150, align: 'right', render: (value) => value ? formatMoney(value) : 'Chưa xuất' },
];

export function SupplierReturnDetailDrawer({ id, onClose, onEdit }: { id?: string; onClose: () => void; onEdit: (detail: SupplierReturnDetailDto) => void }) {
  const query = useGetSupplierReturn(id ?? '', { query: { enabled: Boolean(id) } }); const detail = query.data;
  const queryClient = useQueryClient(); const { message, modal } = App.useApp();
  const refresh = async () => detail && Promise.all([queryClient.invalidateQueries({ queryKey: getListSupplierReturnsQueryKey() }), queryClient.invalidateQueries({ queryKey: getGetSupplierReturnQueryKey(detail.id) })]);
  // CONTRACT: 409 VERSION_STALE/CONCURRENT_UPDATE → tải lại chi tiết để thao tác tiếp trên version mới.
  const fail = (error: unknown) => {
    if (isStaleWriteError(error)) {
      void refresh();
      void message.warning(STALE_WRITE_RELOADED_MESSAGE);
    } else void message.error(getApiErrorMessage(error));
    throw error;
  };
  const run = (action: ProcurementAction) => {
    if (!detail || action === 'edit' || action === 'post' || action === 'submit' || action === 'approveFinance') return;
    let reason = '';
    const labels = { approve: 'Duyệt phiếu trả', ship: 'Xuất kho trả NCC', close: 'Đóng phiếu trả', cancel: 'Huỷ phiếu trả' } as const;
    modal.confirm({ title: `${labels[action as keyof typeof labels]} ${detail.returnNo}?`, content: action === 'ship' ? 'Thao tác sẽ trừ tồn và ghi sổ kho, không thể hoàn tác.' : action === 'cancel' ? <textarea className="mt-3 min-h-24 w-full rounded-lg border border-slate-300 p-3" placeholder="Lý do huỷ" onChange={(event) => { reason = event.target.value; }} /> : 'Backend sẽ kiểm tra maker-checker, scope và version.', okText: labels[action as keyof typeof labels], okButtonProps: { danger: action === 'cancel' }, onOk: async () => {
      if (action === 'cancel' && reason.trim().length < 3) throw new Error('Nhập lý do tối thiểu 3 ký tự');
      const body = { expectedVersion: detail.version };
      const task = action === 'approve' ? approveSupplierReturn(detail.id, body) : action === 'ship' ? shipSupplierReturn(detail.id, body) : action === 'close' ? closeSupplierReturn(detail.id, body) : cancelSupplierReturn(detail.id, { ...body, reason: reason.trim() });
      await task.then(refresh).catch(fail);
    } });
  };
  const actions = detail ? supplierReturnActions(detail.status) : [];
  return <Drawer title={detail?.returnNo ?? 'Chi tiết phiếu trả'} width={DRAWER_WIDTH.xl} open={Boolean(id)} loading={query.isLoading} onClose={onClose} extra={detail && <Space>
    {actions.includes('edit') && <PermissionGate permission="purchase.return.manage"><Button onClick={() => onEdit(detail)}>Sửa</Button></PermissionGate>}
    {actions.filter((action) => action !== 'edit').map((action) => <PermissionGate key={action} permission="purchase.return.manage"><Button type={action === 'approve' || action === 'ship' ? 'primary' : 'default'} danger={action === 'cancel'} onClick={() => run(action)}>{action === 'approve' ? 'Duyệt' : action === 'ship' ? 'Xuất trả' : action === 'close' ? 'Đóng' : 'Huỷ'}</Button></PermissionGate>)}
  </Space>}>
    {query.isError && <div className="text-red-600">{getApiErrorMessage(query.error)}</div>}
    {detail && <div className="space-y-5"><Descriptions bordered column={{ xs: 1, md: 2 }}>
      <Descriptions.Item label="Trạng thái"><Tag>{statusLabel(detail.status)}</Tag></Descriptions.Item><Descriptions.Item label="Phiếu nhập gốc">{detail.goodsReceipt?.receiptNo ?? 'Không gắn'}</Descriptions.Item>
      <Descriptions.Item label="Nhà cung cấp">{partyLabel(detail.supplier)}</Descriptions.Item><Descriptions.Item label="Kho xuất">{partyLabel(detail.warehouse)}</Descriptions.Item>
      <Descriptions.Item label="Người tạo">{detail.createdByDisplayName}</Descriptions.Item>
      <Descriptions.Item label="Người duyệt">{actorAt(detail.approvedByDisplayName, detail.approvedAt, 'Chưa duyệt')}</Descriptions.Item>
      <Descriptions.Item label="Người xuất trả">{actorAt(detail.shippedByDisplayName, detail.shippedAt, 'Chưa xuất')}</Descriptions.Item>
      <Descriptions.Item label="Ngày đóng">{formatDateTime(detail.closedAt)}</Descriptions.Item>
      <Descriptions.Item label="Lý do" span={2}>{detail.reason}</Descriptions.Item>
      {detail.cancelReason ? <Descriptions.Item label="Lý do huỷ" span={2}>{detail.cancelReason}</Descriptions.Item> : null}
    </Descriptions><AdminTable surface="embedded" rowKey="id" pagination={false} dataSource={detail.items} columns={RETURN_ITEM_COLUMNS} /></div>}
  </Drawer>;
}

