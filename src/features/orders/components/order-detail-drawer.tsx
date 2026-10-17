import { useMemo, type ReactNode } from 'react';
import { Drawer } from 'antd';
import { useCan } from '@/core/auth/permissions';
import { useGetAdminOrder } from '@/generated/api/orders/orders';
import { DetailSkeleton } from '@/foundation/feedback/page-skeleton';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { DRAWER_WIDTH, useConfirmWithReason } from '@/foundation/overlay';
import { OrderReturnPanel } from '@/features/returns';
import { PrintableOrderReceipt } from '@/features/receipt';
import { orderActionCopy } from '../constants/order.constants';
import { useOrderAction } from '../hooks/use-order-action';
import { getOrderActionAvailability, type OrderAction } from '../model/order-actions.policy';
import { toOrderDetailView } from '../model/order.mapper';
import { OrderActionConfirmation } from './order-action-confirmation';
import { OrderActionFooter } from './order-action-footer';
import { OrderDetailHeader } from './order-detail-header';
import { OrderFailedDeliveryCancelSummary } from './order-failed-delivery-cancel-summary';
import { OrderItemsCard } from './order-items-card';
import { OrderPaymentCard } from './order-payment-card';
import { OrderRecipientCard } from './order-recipient-card';
import { OrderStatusHistoryCard } from './order-status-history-card';

interface OrderDetailDrawerProps {
  orderId?: string;
  onClose: () => void;
  // CONTRACT: OrderDetailDrawer không tự import panel vận đơn (feature `fulfillments`) để tránh
  // vòng phụ thuộc orders↔fulfillments — nơi gọi (orders-page/fulfillments-page) inject panel này.
  renderFulfillmentPanel?: (orderId: string) => ReactNode;
  // CONTRACT: `OrderShipmentDto.status` là string thô ở domain orders; nhãn/tone thuộc `fulfillments`
  // nên nơi gọi inject `FulfillmentStatusTag` (cùng lý do vòng phụ thuộc như panel ở trên).
  renderShipmentStatus?: (status: string) => ReactNode;
}

export function OrderDetailDrawer({
  orderId,
  onClose,
  renderFulfillmentPanel,
  renderShipmentStatus,
}: OrderDetailDrawerProps) {
  const canManage = useCan('order.manage');
  const detail = useGetAdminOrder(orderId ?? '', {
    query: { enabled: Boolean(orderId) },
  });
  const order = detail.data;
  const view = useMemo(() => (order ? toOrderDetailView(order) : undefined), [order]);
  const orderAction = useOrderAction(order);
  const availability = getOrderActionAvailability(order, canManage);
  const confirmWithReason = useConfirmWithReason();

  // UX: huỷ sau giao thất bại cần hiện trạng thái hiện tại + hệ quả hoàn tiền nên dùng hộp riêng;
  // các lệnh khác giữ `OrderActionConfirmation`.
  const openAction = (kind: OrderAction) => {
    if (kind !== 'cancelAfterFailedDelivery' || !view) {
      orderAction.open(kind);
      return;
    }
    const copy = orderActionCopy.cancelAfterFailedDelivery;
    confirmWithReason({
      title: copy.title,
      consequence: <OrderFailedDeliveryCancelSummary order={view} />,
      okText: copy.okText,
      placeholder: 'Lý do huỷ (ví dụ: khách từ chối nhận, không liên lạc được)...',
      minLength: copy.minReasonLength,
      onOk: (reason) => orderAction.run(kind, reason),
    });
  };

  const closeDrawer = () => {
    if (orderAction.pending) return;
    orderAction.close();
    onClose();
  };

  return (
    <Drawer
      width={DRAWER_WIDTH.lg}
      open={Boolean(orderId)}
      title={null}
      onClose={closeDrawer}
      destroyOnHidden
      styles={{ body: { padding: 0 } }}
    >
      {detail.isLoading && (
        <div className="p-6">
          <DetailSkeleton />
        </div>
      )}

      {detail.isError && (
        <div className="p-6">
          <QueryErrorAlert
            message="Không tải được chi tiết đơn hàng"
            error={detail.error}
            retry={() => void detail.refetch()}
          />
        </div>
      )}

      {view && (
        <div className="flex flex-col min-h-full bg-slate-50/50">
          <OrderDetailHeader order={view} />

          <div className="flex-1 p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <OrderRecipientCard recipient={view.recipient} />
              <OrderPaymentCard order={view} renderShipmentStatus={renderShipmentStatus} />
            </div>
            <OrderItemsCard items={view.items} totals={view.totals} />
            <OrderStatusHistoryCard history={view.history} />
            {renderFulfillmentPanel?.(view.id)}
            {/* Đổi trả: tự ẩn khi đơn chưa giao hoặc tài khoản không có return.create */}
            <OrderReturnPanel orderId={view.id} />
          </div>

          {canManage && (
            <OrderActionFooter availability={availability} onAction={openAction} onClose={closeDrawer} />
          )}
        </div>
      )}

      <OrderActionConfirmation
        action={orderAction.action}
        reason={orderAction.reason}
        pending={orderAction.pending}
        onReasonChange={orderAction.setReason}
        onCancel={orderAction.close}
        onConfirm={orderAction.submit}
      />
      <PrintableOrderReceipt order={order} />
    </Drawer>
  );
}
