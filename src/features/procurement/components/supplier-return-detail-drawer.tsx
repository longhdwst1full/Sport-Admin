import { App, Button, Descriptions, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PermissionGate } from '@/core/auth/permissions';
import { StatusTag } from '@/foundation/management/status-tag';
import { DetailDrawer, useConfirmWithReason } from '@/foundation/overlay';
import { AdminTable, col } from '@/foundation/table';
import {
  approveSupplierReturn,
  cancelSupplierReturn,
  closeSupplierReturn,
  getGetSupplierReturnQueryKey,
  getListSupplierReturnsQueryKey,
  shipSupplierReturn,
  useGetSupplierReturn,
} from '@/generated/api/procurement/procurement';
import type { SupplierReturnDetailDto } from '@/generated/api/procurement/procurement.schemas';
import { formatDateTime } from '@/lib/format/datetime';
import { formatMoney } from '@/lib/format/money';
import { actorAt, CANCEL_REASON_MIN_LENGTH, partyLabel, supplierReturnStatusPresentation } from '../constants/procurement.constants';
import { useDocumentCommand } from '../hooks/use-procurement-mutations';
import { supplierReturnActions } from '../model/procurement-actions.policy';

type ReturnItem = SupplierReturnDetailDto['items'][number];
type TransitionAction = 'approve' | 'ship' | 'close';

const RETURN_ITEM_COLUMNS: ColumnsType<ReturnItem> = [
  col.text<ReturnItem>('sku', 'SKU', { width: 150 }),
  col.text<ReturnItem>('productName', 'Sản phẩm', { width: 240 }),
  col.number<ReturnItem>('quantity', 'Số trả', { width: 100 }),
  col.money<ReturnItem>('invoiceUnitCost', 'Giá hoá đơn', { width: 150 }),
  { title: 'Giá vốn xuất', dataIndex: 'issuedUnitCost', width: 150, align: 'right', render: (value?: string | null) => value ? formatMoney(value) : 'Chưa xuất' },
];

const TRANSITIONS: Record<TransitionAction, { button: string; title: string; consequence: string; done: string; run: typeof approveSupplierReturn }> = {
  approve: { button: 'Duyệt', title: 'Duyệt phiếu trả', consequence: 'Hệ thống sẽ kiểm tra maker-checker, phạm vi và phiên bản.', done: 'Đã duyệt phiếu trả.', run: approveSupplierReturn },
  ship: { button: 'Xuất trả', title: 'Xuất kho trả NCC', consequence: 'Thao tác sẽ trừ tồn và ghi sổ kho, không thể hoàn tác.', done: 'Đã xuất trả nhà cung cấp.', run: shipSupplierReturn },
  close: { button: 'Đóng', title: 'Đóng phiếu trả', consequence: 'Hệ thống sẽ kiểm tra maker-checker, phạm vi và phiên bản.', done: 'Đã đóng phiếu trả.', run: closeSupplierReturn },
};
const isTransition = (action: string): action is TransitionAction => action in TRANSITIONS;

const RETURN_KEYS = { list: getListSupplierReturnsQueryKey(), detail: getGetSupplierReturnQueryKey };

export function SupplierReturnDetailDrawer({ id, onClose, onEdit }: { id?: string; onClose: () => void; onEdit: (detail: SupplierReturnDetailDto) => void }) {
  const query = useGetSupplierReturn(id ?? '', { query: { enabled: Boolean(id) } });
  const detail = query.data;
  const actions = detail ? supplierReturnActions(detail.status) : [];
  const { modal } = App.useApp();
  const confirmWithReason = useConfirmWithReason();
  const command = useDocumentCommand(RETURN_KEYS);

  const transition = (current: SupplierReturnDetailDto, action: TransitionAction) => {
    const config = TRANSITIONS[action];
    modal.confirm({
      title: `${config.title} ${current.returnNo}?`,
      content: config.consequence,
      okText: config.title,
      onOk: () => command(current.id, () => config.run(current.id, { expectedVersion: current.version }), config.done),
    });
  };
  const cancel = (current: SupplierReturnDetailDto) => confirmWithReason({
    title: `Huỷ phiếu trả ${current.returnNo}?`,
    consequence: 'Phiếu trả sẽ bị huỷ và không xuất kho.',
    okText: 'Huỷ phiếu trả',
    placeholder: 'Lý do huỷ',
    minLength: CANCEL_REASON_MIN_LENGTH,
    onOk: (reason) => command(current.id, () => cancelSupplierReturn(current.id, { expectedVersion: current.version, reason }), 'Đã huỷ phiếu trả.'),
  });

  return <DetailDrawer
    title={detail?.returnNo ?? 'Chi tiết phiếu trả'}
    status={detail && <StatusTag status={detail.status} presentations={supplierReturnStatusPresentation} />}
    size="xl"
    open={Boolean(id)}
    onClose={onClose}
    loading={query.isLoading}
    error={query.isError ? query.error : undefined}
    onRetry={() => void query.refetch()}
    actions={detail && <PermissionGate permission="purchase.return.manage"><Space>
      {actions.includes('edit') && <Button onClick={() => onEdit(detail)}>Sửa</Button>}
      {actions.filter(isTransition).map((action) => <Button key={action} type={action === 'close' ? 'default' : 'primary'} onClick={() => transition(detail, action)}>{TRANSITIONS[action].button}</Button>)}
      {actions.includes('cancel') && <Button danger onClick={() => cancel(detail)}>Huỷ</Button>}
    </Space></PermissionGate>}
  >
    {detail && <div className="space-y-5"><Descriptions bordered column={{ xs: 1, md: 2 }}>
      <Descriptions.Item label="Phiếu nhập gốc" span={2}>{detail.goodsReceipt?.receiptNo ?? 'Không gắn'}</Descriptions.Item>
      <Descriptions.Item label="Nhà cung cấp">{partyLabel(detail.supplier)}</Descriptions.Item><Descriptions.Item label="Kho xuất">{partyLabel(detail.warehouse)}</Descriptions.Item>
      <Descriptions.Item label="Người tạo">{detail.createdByDisplayName}</Descriptions.Item>
      <Descriptions.Item label="Người duyệt">{actorAt(detail.approvedByDisplayName, detail.approvedAt, 'Chưa duyệt')}</Descriptions.Item>
      <Descriptions.Item label="Người xuất trả">{actorAt(detail.shippedByDisplayName, detail.shippedAt, 'Chưa xuất')}</Descriptions.Item>
      <Descriptions.Item label="Ngày đóng">{formatDateTime(detail.closedAt)}</Descriptions.Item>
      <Descriptions.Item label="Lý do" span={2}>{detail.reason}</Descriptions.Item>
      {detail.cancelReason ? <Descriptions.Item label="Lý do huỷ" span={2}>{detail.cancelReason}</Descriptions.Item> : null}
    </Descriptions><AdminTable surface="embedded" rowKey="id" pagination={false} dataSource={detail.items} columns={RETURN_ITEM_COLUMNS} /></div>}
  </DetailDrawer>;
}
