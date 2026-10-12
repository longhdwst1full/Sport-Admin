import {
  AlertOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import { KPI_LINKS, type KpiCard, type KpiKey } from '../model/dashboard.mapper';
import { DashboardStatCard } from './dashboard-stat-card';

const KPI_ICONS: Record<KpiKey, ReactNode> = {
  netRevenue: <DollarOutlined />,
  expectedRevenue: <DollarOutlined />,
  ordersToday: <ShoppingCartOutlined />,
  awaitingFulfillment: <TruckOutlined />,
  lowStock: <AlertOutlined />,
};

export function DashboardKpiSection({ cards }: { cards: KpiCard[] }) {
  return (
    <section aria-labelledby="dashboard-summary-title">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id="dashboard-summary-title" className="m-0 text-lg font-bold text-slate-950">
          Tổng quan hôm nay
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ key, ...card }, index) => (
          <div
            key={card.label}
            className="dctd-card-enter"
            // Thẻ hiện lần lượt thay vì bật cùng lúc; đủ nhanh để không thành thời gian chờ.
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <DashboardStatCard
              {...card}
              icon={KPI_ICONS[key]}
              // Thiếu quyền xem số liệu (`—`) thì thẻ không dẫn sang màn danh sách.
              href={card.value === '—' ? undefined : KPI_LINKS[key]}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
