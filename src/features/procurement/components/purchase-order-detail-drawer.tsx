import { App, Button, Descriptions, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '@/core/auth/auth-context';
import { PermissionGate } from '@/core/auth/permissions';
import { StatusTag } from '@/foundation/management/status-tag';
import { DetailDrawer, useConfirmWithReason } from '@/foundation/overlay';
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
import { formatDate, formatDateTime } from '@/lib/format/datetime';
import { formatMoney } from '@/lib/format/money';
import {
  actorAt,
  approvalLevelLabels,
  CANCEL_REASON_MIN_LENGTH,
  enumLabel,
  partyLabel,
  purchaseOrderStatusPresentation,
} from '../constants/procurement.constants';
import { useDocumentCommand } from '../hooks/use-procurement-mutations';
import { purchaseOrderActions, purchaseOrderApprovalBlockedReason, type ProcurementAction } from '../model/procurement-actions.policy';

type TransitionAction = 'submit' | 'approve' | 'approveFinance' | 'close';
type PoItem = PurchaseOrderDetailDto['items'][number];

const TRANSITIONS: Record<TransitionAction, { label: string; permission: string; consequence: string; run: typeof submitPurchaseOrder }> = {
  submit: { label: 'Nộp duyệt', permission: 'purchase.order.create', consequence: 'Thao tác dùng phiên bản hiện tại để tránh ghi đè thay đổi mới hơn.', run: submitPurchaseOrder },
  approve: { label: 'Duyệt', permission: 'purchase.order.approve', consequence: 'Hệ thống sẽ kiểm tra maker-checker và cấp duyệt.', run: approvePurchaseOrder },
  approveFinance: { label: 'Duyệt tài chính', permission: 'purchase.order.approve.finance', consequence: 'Hệ thống sẽ kiểm tra maker-checker và cấp duyệt.', run: approvePurchaseOrderFinance },
  close: { label: 'Đóng PO', permission: 'purchase.order.approve', consequence: 'Thao tác dùng phiên bản hiện tại để tránh ghi đè thay đổi mới hơn.', run: closePurchaseOrder },
};
const isTransition = (action: ProcurementAction): action is TransitionAction => action in TRANSITIONS;

const PO_ITEM_COLUMNS: ColumnsType<PoItem> = [
  col.text<PoItem>('sku', 'SKU', { width: 150 }),
  col.text<PoItem>('productName', 'Sản phẩm', { width: 240 }),
  col.number<PoItem>('orderedQty', 'Số đặt', { width: 100 }),
  col.number<PoItem>('receivedQty', 'Đã nhận', { width: 100 }),
  col.money<PoItem>('unitCost', 'Đơn giá', { width: 150 }),
  col.money<PoItem>('lineTotal', 'Thành tiền', { width: 160 }),
];

const PO_KEYS = { list: getListPurchaseOrdersQueryKey(), detail: getGetPurchaseOrderQueryKey };

const approver = (user?: PurchaseOrderUserDto | null, at?: string | null) =>
  actorAt(user?.displayName, at, 'Chưa duyệt');

export function PurchaseOrderDetailDrawer({ id, onClose, onEdit }: { id?: string; onClose: () => void; onEdit: (detail: PurchaseOrderDetailDto) => void }) {
  const query = useGetPurchaseOrder(id ?? '', { query: { enabled: Boolean(id) } });
  const detail = query.data;
  const actions = detail ? purchaseOrderActions(detail) : [];
  const { currentUser } = useAuth();
  const approvalBlocked = detail ? purchaseOrderApprovalBlockedReason(detail, currentUser?.userId) : null;
  const { modal } = App.useApp();
  const confirmWithReason = useConfirmWithReason();
  const command = useDocumentCommand(PO_KEYS);

  const transition = (current: PurchaseOrderDetailDto, action: TransitionAction) => {
    const config = TRANSITIONS[action];
    modal.confirm({
      title: `${config.label} ${current.poNo}?`,
      content: config.consequence,
      okText: config.label,
      onOk: () => command(current.id, () => config.run(current.id, { expectedVersion: current.version }), `Đã ${config.label.toLocaleLowerCase('vi')}.`),
    });
  };
  const cancel = (current: PurchaseOrderDetailDto) => confirmWithReason({
    title: `Huỷ đơn mua hàng ${current.poNo}?`,
    consequence: 'Đơn mua hàng sẽ bị huỷ và không thể nhận hàng theo PO này.',
    okText: 'Huỷ PO',
    placeholder: 'Lý do huỷ (bắt buộc)',
    minLength: CANCEL_REASON_MIN_LENGTH,
    onOk: (reason) => command(current.id, () => cancelPurchaseOrder(current.id, { expectedVersion: current.version, reason }), 'Đã huỷ PO.'),
  });

  const transitionButton = (current: PurchaseOrderDetailDto, action: TransitionAction) => {
    // PERMISSION/UX: người tạo không được tự duyệt — disable kèm lý do thay vì để API trả 403/409.
    const blocked = action === 'approve' || action === 'approveFinance' ? approvalBlocked : null;
    const button = <Button disabled={Boolean(blocked)} type={action === 'close' || action === 'approveFinance' ? 'default' : 'primary'} onClick={() => transition(current, action)}>{TRANSITIONS[action].label}</Button>;
    return <PermissionGate key={action} permission={TRANSITIONS[action].permission}>{blocked ? <Tooltip title={blocked}>{button}</Tooltip> : button}</PermissionGate>;
  };

  return (
    <DetailDrawer
      title={detail?.poNo ?? 'Chi tiết đơn mua hàng'}
      status={detail && <StatusTag status={detail.status} presentations={purchaseOrderStatusPresentation} />}
      size="xl"
      open={Boolean(id)}
      onClose={onClose}
      loading={query.isLoading}
      error={query.isError ? query.error : undefined}
      onRetry={() => void query.refetch()}
      actions={detail && <Space wrap>
        {actions.includes('edit') && <PermissionGate permission="purchase.order.create"><Button onClick={() => onEdit(detail)}>Sửa</Button></PermissionGate>}
        {actions.filter(isTransition).map((action) => transitionButton(detail, action))}
        {actions.includes('cancel') && <PermissionGate permission="purchase.order.create"><Button danger onClick={() => cancel(detail)}>Huỷ PO</Button></PermissionGate>}
      </Space>}
    >
      {detail && <div className="space-y-5">
        <Descriptions bordered column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="Cấp duyệt" span={2}>{enumLabel(approvalLevelLabels, detail.approvalLevel, 'Chưa chốt')}</Descriptions.Item>
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
    </DetailDrawer>
  );
}
