import {
  AlertOutlined,
  DollarOutlined,
  FileDoneOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import { REPORT_EXPORT_PATH } from '../constants/dashboard.constants';
import { KPI_LINKS, type KpiCard, type KpiKey } from '../model/dashboard.mapper';
import { DashboardStatCard } from './dashboard-stat-card';
import { ReportExportButton } from './report-export-button';

const KPI_ICONS: Record<KpiKey, ReactNode> = {
  netRevenue: <DollarOutlined />,
  expectedRevenue: <FileDoneOutlined />,
  ordersToday: <ShoppingCartOutlined />,
  awaitingFulfillment: <TruckOutlined />,
  lowStock: <AlertOutlined />,
};

const EMPTY_PARAMS = {};

export function DashboardKpiSection({
  cards,
  canSeeInventory,
}: {
  cards: KpiCard[];
  canSeeInventory: boolean;
}) {
  return (
    <section aria-labelledby="dashboard-summary-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="dashboard-summary-title" className="m-0 text-base font-semibold text-slate-900">
          Chỉ số chính
        </h2>
        {/* PERMISSION: báo cáo tồn có quyền riêng, không phụ thuộc quyền doanh thu. Báo cáo là danh
            sách CẦN NHẬP (chạm ngưỡng đặt lại), không phải toàn bộ tồn — nhãn nói đúng thứ sẽ tải. */}
        {canSeeInventory && (
          <ReportExportButton
            path={REPORT_EXPORT_PATH.inventory}
            params={EMPTY_PARAMS}
            fallbackFilename="bao-cao-ton-kho"
            label="Tải hàng cần nhập"
          />
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ key, ...card }, index) => (
          <div
            key={key}
            className="dctd-card-enter"
            // Thẻ hiện lần lượt thay vì bật cùng lúc; đủ nhanh để không thành thời gian chờ.
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <DashboardStatCard {...card} icon={KPI_ICONS[key]} href={KPI_LINKS[key]} />
          </div>
        ))}
      </div>
    </section>
  );
}
