import { EnvironmentOutlined, UserOutlined } from '@ant-design/icons';
import type { OrderDetailView } from '../model/order.mapper';
import { OrderInfoCard } from './order-info-card';

export function OrderRecipientCard({ recipient }: { recipient: OrderDetailView['recipient'] }) {
  return (
    <OrderInfoCard icon={<UserOutlined />} title="Người nhận hàng">
      <div className="space-y-1 text-xs">
        <div className="font-semibold text-slate-800 text-sm">{recipient.name}</div>
        <div className="font-mono text-slate-600">{recipient.phone}</div>
        <div className="text-slate-500">{recipient.email}</div>
        <div className="mt-2 text-slate-700 leading-relaxed border-t border-slate-100 pt-2 flex items-start gap-1.5">
          <EnvironmentOutlined className="text-slate-400 mt-0.5 flex-shrink-0" />
          <span>{recipient.address}</span>
        </div>
        {recipient.note && (
          <div className="mt-2 rounded border border-amber-100 bg-amber-50 p-2 text-slate-700">
            Ghi chú của khách: {recipient.note}
          </div>
        )}
      </div>
    </OrderInfoCard>
  );
}
