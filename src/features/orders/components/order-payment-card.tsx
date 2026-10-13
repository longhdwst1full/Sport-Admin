import type { ReactNode } from 'react';
import { CreditCardOutlined } from '@ant-design/icons';
import { StatusTag } from '@/foundation/management';
import { paymentStatusPresentation } from '../constants/order.constants';
import type { OrderDetailView } from '../model/order.mapper';
import { OrderInfoCard, OrderInfoRow } from './order-info-card';

interface OrderPaymentCardProps {
  order: OrderDetailView;
  renderShipmentStatus?: (status: string) => ReactNode;
}

export function OrderPaymentCard({ order, renderShipmentStatus }: OrderPaymentCardProps) {
  const { shipment } = order;
  return (
    <OrderInfoCard icon={<CreditCardOutlined />} title="Thanh toán & Chi nhánh">
      <div className="space-y-2 text-xs">
        <OrderInfoRow label="Trạng thái thanh toán:">
          <StatusTag status={order.paymentStatus} presentations={paymentStatusPresentation} />
        </OrderInfoRow>
        <OrderInfoRow label="Phương thức:" valueClassName="font-medium text-slate-700">
          {order.paymentMethodLabel}
        </OrderInfoRow>
        <OrderInfoRow label="Thanh toán lúc:">{order.paidAtLabel}</OrderInfoRow>
        {shipment && (
          <>
            <OrderInfoRow label="Giao vận:" divided>
              {renderShipmentStatus?.(shipment.status)}
            </OrderInfoRow>
            <OrderInfoRow label="Vận đơn:" valueClassName="font-medium text-slate-700">
              {shipment.carrierCode ? `${shipment.carrierCode} · ` : ''}
              {shipment.trackingHref ? (
                <a href={shipment.trackingHref} target="_blank" rel="noopener noreferrer">
                  {shipment.trackingNo}
                </a>
              ) : (
                (shipment.trackingNo ?? 'Chưa có')
              )}
            </OrderInfoRow>
            {shipment.shippedAtLabel && (
              <OrderInfoRow label="Bàn giao lúc:">{shipment.shippedAtLabel}</OrderInfoRow>
            )}
            {shipment.deliveredAtLabel && (
              <OrderInfoRow label="Giao thành công:">{shipment.deliveredAtLabel}</OrderInfoRow>
            )}
          </>
        )}
        <OrderInfoRow label="Chi nhánh xuất:" divided valueClassName="font-medium text-slate-800">
          {order.branchName}
        </OrderInfoRow>
        <OrderInfoRow label="Kho thực xuất:" valueClassName="text-slate-600">
          {order.warehouseName}
        </OrderInfoRow>
      </div>
    </OrderInfoCard>
  );
}
