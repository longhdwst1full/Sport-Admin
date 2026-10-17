import { Alert, Descriptions } from 'antd';
import { StatusTag } from '@/foundation/management';
import { formatMoney } from '@/lib/format/money';
import {
  orderActionCopy,
  orderStatusPresentation,
  paymentStatusPresentation,
} from '../constants/order.constants';
import type { OrderDetailView } from '../model/order.mapper';
import { requiresManualRefund } from '../model/order-actions.policy';

interface OrderFailedDeliveryCancelSummaryProps {
  order: OrderDetailView;
}

/**
 * UX: nội dung hộp xác nhận "Huỷ sau giao thất bại" — trạng thái hiện tại, thao tác và hệ quả (RULE 04).
 * CONTRACT: `OrderDetailDto` không có số tiền đã thu (`payments.received_amount`), nên chỉ hiện tổng đơn
 * làm tham chiếu; số hoàn chính xác là số đã thu ghi ở màn Thanh toán.
 */
export function OrderFailedDeliveryCancelSummary({ order }: OrderFailedDeliveryCancelSummaryProps) {
  const manualRefund = requiresManualRefund(order);
  return (
    <div className="space-y-3">
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label="Đơn hàng">{order.orderNo}</Descriptions.Item>
        <Descriptions.Item label="Trạng thái">
          <StatusTag status={order.status} presentations={orderStatusPresentation} />
          <span className="ml-1 text-slate-500">· hàng giao thất bại đã hoàn về kho</span>
        </Descriptions.Item>
        <Descriptions.Item label="Thanh toán">
          <StatusTag status={order.paymentStatus} presentations={paymentStatusPresentation} />
          <span className="ml-1 text-slate-500">· {order.paymentMethodLabel}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Tổng đơn">{formatMoney(order.totals.grandTotal)}</Descriptions.Item>
      </Descriptions>
      <div className="text-sm text-slate-500">{orderActionCopy.cancelAfterFailedDelivery.description}</div>
      {manualRefund ? (
        <Alert
          type="warning"
          showIcon
          message="Đơn đã thu tiền: cần hoàn tiền thủ công"
          description="Thanh toán giữ trạng thái Thành công và được gắn cờ chờ hoàn tay. Kế toán chuyển trả số đã thu cho khách ngoài hệ thống, rồi ghi nhận hoàn tiền ở màn Thanh toán. Khách nhận email báo khoản hoàn thủ công."
        />
      ) : (
        <Alert type="info" showIcon message="Chưa thu tiền: giao dịch thanh toán chờ thu sẽ bị huỷ, không phát sinh hoàn tiền." />
      )}
    </div>
  );
}
