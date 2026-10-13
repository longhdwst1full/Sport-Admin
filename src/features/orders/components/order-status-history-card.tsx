import { HistoryOutlined } from '@ant-design/icons';
import { Timeline } from 'antd';
import type { OrderHistoryView } from '../model/order.mapper';
import { OrderInfoCard } from './order-info-card';

export function OrderStatusHistoryCard({ history }: { history: OrderHistoryView[] }) {
  if (history.length === 0) return null;
  return (
    <OrderInfoCard icon={<HistoryOutlined />} title="Nhật ký xử lý đơn hàng">
      <Timeline
        className="mt-2 text-xs"
        items={history.map((entry) => ({
          key: entry.key,
          color: 'green',
          children: (
            <div>
              <span className="font-semibold text-slate-800">{entry.statusLabel}</span>
              <div className="text-[11px] text-slate-400">{entry.metaLabel}</div>
              {entry.reason && (
                <div className="mt-1 text-slate-600 bg-slate-50 p-2 rounded text-[11px] border border-slate-100">
                  Ghi chú: {entry.reason}
                </div>
              )}
            </div>
          ),
        }))}
      />
    </OrderInfoCard>
  );
}
