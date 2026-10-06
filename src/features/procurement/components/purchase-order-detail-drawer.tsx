import { App, Button, Descriptions, Drawer, Space, Tag, Tooltip } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/auth/auth-context';
import { PermissionGate } from '@/core/auth/permissions';
import type { ColumnsType } from 'antd/es/table';
import { AdminTable, col } from '@/foundation/table';
import {
  approvePurchaseOrder,
  approvePurchaseOrderFinance,
  cancelPurchaseOrder,
  closePurchaseOrder,
  getGetPurchaseOrderQueryKey,
  getListPurchaseOrdersQueryKey,
  submitPurchaseOrder,
  useGetPurchaseOrder,
} from '@/generated/api/procurement/procurement';
import { PurchaseOrderApprovalLevel, type PurchaseOrderDetailDto, type PurchaseOrderUserDto } from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { formatDate, formatDateTime } from '@/lib/format/datetime';
import { formatMoney } from '@/lib/format/money';
import { actorAt, partyLabel, statusLabel } from '../constants/procurement.constants';
import { purchaseOrderActions, purchaseOrderApprovalBlockedReason, type ProcurementAction } from '../model/procurement-actions.policy';
import { DRAWER_WIDTH } from '@/foundation/overlay';

const actionLabel: Record<Exclude<ProcurementAction, 'edit' | 'post' | 'ship'>, string> = {
  submit: 'Nộp duyệt', approve: 'Duyệt', approveFinance: 'Duyệt tài chính', close: 'Đóng PO', cancel: 'Huỷ PO',
};

type PoItem = PurchaseOrderDetailDto['items'][number];

const PO_ITEM_COLUMNS: ColumnsType<PoItem> = [
  { title: 'SKU', dataIndex: 'sku', width: 150 },
  { title: 'Sản phẩm', dataIndex: 'productName', width: 240 },
  col.number<PoItem>('orderedQty', 'Số đặt', { width: 100 }),
  col.number<PoItem>('receivedQty', 'Đã nhận', { width: 100 }),
  col.money<PoItem>('unitCost', 'Đơn giá', { width: 150 }),
  col.money<PoItem>('lineTotal', 'Thành tiền', { width: 160 }),
];

export function PurchaseOrderDetailDrawer({ id, onClose, onEdit }: { id?: string; onClose: () => void; onEdit: (detail: PurchaseOrderDetailDto) => void }) {
  const query = useGetPurchaseOrder(id ?? '', { query: { enabled: Boolean(id) } });
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const detail = query.data;
  const actions = detail ? purchaseOrderActions(detail) : [];
  const { currentUser } = useAuth();
  const approvalBlocked = detail ? purchaseOrderApprovalBlockedReason(detail, currentUser?.userId) : null;

  const run = (action: ProcurementAction) => {
    if (!detail || action === 'edit' || action === 'post' || action === 'ship') return;
    const execute = async (reason?: string) => {
      const body = { expectedVersion: detail.version };
      if (action === 'submit') await submitPurchaseOrder(detail.id, body);
      if (action === 'approve') await approvePurchaseOrder(detail.id, body);
      if (action === 'approveFinance') await approvePurchaseOrderFinance(detail.id, body);
      if (action === 'close') await closePurchaseOrder(detail.id, body);
      if (action === 'cancel') await cancelPurchaseOrder(detail.id, { ...body, reason: reason || '' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(detail.id) }),
      ]);
      void message.success(`Đã ${actionLabel[action].toLocaleLowerCase('vi')}.`);
    };
    if (action === 'cancel') {
      let reason = '';
      modal.confirm({
        title: 'Huỷ đơn mua hàng?',
        content: <ModalReason onChange={(value) => { reason = value; }} />,
        okText: 'Huỷ PO', okButtonProps: { danger: true },
        onOk: async () => {
          if (reason.trim().length < 3) throw new Error('Nhập lý do tối thiểu 3 ký tự');
          await execute(reason.trim()).catch((error) => { void message.error(getApiErrorMessage(error)); throw error; });
        },
      });
      return;
    }
    modal.confirm({
      title: `${actionLabel[action]} ${detail.poNo}?`,
      content: action === 'approve' || action === 'approveFinance' ? 'Backend sẽ kiểm tra maker-checker và cấp duyệt.' : 'Thao tác dùng version hiện tại để tránh ghi đè thay đổi mới hơn.',
      okText: actionLabel[action],
      onOk: async () => execute().catch((error) => { void message.error(getApiErrorMessage(error)); throw error; }),
    });
  };

  return (
    <Drawer title={detail ? detail.poNo : 'Chi tiết đơn mua hàng'} width={DRAWER_WIDTH.xl} open={Boolean(id)} onClose={onClose} loading={query.isLoading} extra={detail && <Space wrap>
      {actions.includes('edit') && <PermissionGate permission="purchase.order.create"><Button onClick={() => onEdit(detail)}>Sửa</Button></PermissionGate>}
      {actions.filter((action) => action !== 'edit').map((action) => <PermissionGate key={action} permission={action === 'approveFinance' ? 'purchase.order.approve.finance' : action === 'approve' || action === 'close' ? 'purchase.order.approve' : 'purchase.order.create'}>{(() => {
        const blocked = action === 'approve' || action === 'approveFinance' ? approvalBlocked : null;
        const button = <Button disabled={Boolean(blocked)} danger={action === 'cancel'} type={action === 'submit' || action === 'approve' ? 'primary' : 'default'} onClick={() => run(action)}>{actionLabel[action as keyof typeof actionLabel]}</Button>;
        return blocked ? <Tooltip title={blocked}>{button}</Tooltip> : button;
      })()}</PermissionGate>)}
    </Space>}>
      {query.isError && <div className="text-red-600">{getApiErrorMessage(query.error)}</div>}
      {detail && <div className="space-y-5">
        <Descriptions bordered column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="Trạng thái"><Tag>{statusLabel(detail.status)}</Tag></Descriptions.Item>
          <Descriptions.Item label="Cấp duyệt">{detail.approvalLevel ?? 'Chưa chốt'}</Descriptions.Item>
          <Descriptions.Item label="Nhà cung cấp">{partyLabel(detail.supplier)}</Descriptions.Item>
          <Descriptions.Item label="Kho nhận">{partyLabel(detail.warehouse)}</Descriptions.Item>
          <Descriptions.Item label="Tổng trước VAT">{formatMoney(detail.subtotal)}</Descriptions.Item>
          <Descriptions.Item label="VAT">{formatMoney(detail.taxTotal)}</Descriptions.Item>
          <Descriptions.Item label="Tổng thanh toán">{formatMoney(detail.grandTotal)}</Descriptions.Item>
          <Descriptions.Item label="Ngày dự kiến nhận">{formatDate(detail.expectedAt)}</Descriptions.Item>
          <Descriptions.Item label="Người tạo">{detail.createdBy.displayName}</Descriptions.Item>
          <Descriptions.Item label="Nộp duyệt">{formatDateTime(detail.submittedAt)}</Descriptions.Item>
          <Descriptions.Item label="Người duyệt">{approver(detail.approvals.approvedBy, detail.approvals.approvedAt)}</Descriptions.Item>
          <Descriptions.Item label="Duyệt tài chính">{detail.approvalLevel === PurchaseOrderApprovalLevel.OWNER_FINANCE ? approver(detail.approvals.financeApprovedBy, detail.approvals.financeApprovedAt) : 'Không yêu cầu'}</Descriptions.Item>
          {detail.closedAt ? <Descriptions.Item label="Ngày đóng">{formatDateTime(detail.closedAt)}</Descriptions.Item> : null}
          {detail.cancelledAt ? <Descriptions.Item label="Huỷ bởi">{approver(detail.cancelledBy, detail.cancelledAt)}</Descriptions.Item> : null}
          {detail.cancelReason ? <Descriptions.Item label="Lý do huỷ" span={2}>{detail.cancelReason}</Descriptions.Item> : null}
          {detail.note ? <Descriptions.Item label="Ghi chú" span={2}>{detail.note}</Descriptions.Item> : null}
          <Descriptions.Item label="Phiên bản">{detail.version}</Descriptions.Item>
        </Descriptions>
        <AdminTable surface="embedded" rowKey="id" pagination={false} dataSource={detail.items} columns={PO_ITEM_COLUMNS} />
      </div>}
    </Drawer>
  );
}

const approver = (user?: PurchaseOrderUserDto | null, at?: string | null) =>
  actorAt(user?.displayName, at, 'Chưa duyệt');

function ModalReason({ onChange }: { onChange: (value: string) => void }) {
  return <textarea className="mt-3 min-h-24 w-full rounded-lg border border-slate-300 p-3" placeholder="Lý do huỷ (bắt buộc)" onChange={(event) => onChange(event.target.value)} />;
}
