import { BarChartOutlined, LineChartOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import {
  DENIED_TEXT,
  PERIOD_DESCRIPTION,
  REPORT_EXPORT_PATH,
  type Granularity,
} from '../constants/dashboard.constants';
import type { ReportQueryState, ReportRange, RevenuePoint } from '../model/dashboard.mapper';
import { CardStateBody, DashboardCard } from './dashboard-card';
import { CompletedOrdersBarChart, RevenueAreaChart } from './lazy-dashboard-charts';
import { ReportExportButton } from './report-export-button';

type SeriesMetric = 'amount' | 'orders';

const METRIC: Record<
  SeriesMetric,
  { icon: ReactNode; title: string; description: string; height: number }
> = {
  amount: {
    icon: <LineChartOutlined />,
    title: 'Doanh thu thuần theo kỳ',
    description: 'Đơn hoàn tất trừ tiền đã hoàn trong kỳ',
    height: 280,
  },
  orders: {
    icon: <BarChartOutlined />,
    title: 'Số đơn hoàn tất theo kỳ',
    description: 'Cùng khoảng và mức gom với biểu đồ doanh thu',
    height: 260,
  },
};

interface RevenueSeriesCardProps {
  metric: SeriesMetric;
  canSeeRevenue: boolean;
  granularity: Granularity;
  range: ReportRange;
  state: ReportQueryState;
  series: RevenuePoint[];
}

/**
 * Hai biểu đồ theo kỳ (doanh thu thuần, số đơn hoàn tất) đọc cùng một chuỗi `series` của báo cáo
 * doanh thu, nên luôn nói về cùng một tập đơn và chung trạng thái tải/lỗi/quyền.
 */
export function RevenueSeriesCard({
  metric,
  canSeeRevenue,
  granularity,
  range,
  state,
  series,
}: RevenueSeriesCardProps) {
  const config = METRIC[metric];
  const period = PERIOD_DESCRIPTION[granularity];
  return (
    <DashboardCard
      icon={config.icon}
      title={config.title}
      description={`${config.description} · ${period}`}
      extra={
        metric === 'amount' ? (
          // File tải về dùng đúng khoảng và mức gom đang xem trên màn hình.
          <ReportExportButton
            path={REPORT_EXPORT_PATH.revenue}
            params={{ ...range, granularity }}
            fallbackFilename="bao-cao-doanh-thu"
            disabled={!canSeeRevenue}
          />
        ) : undefined
      }
    >
      <CardStateBody
        state={state}
        deniedText={canSeeRevenue ? undefined : DENIED_TEXT.revenue}
        isEmpty={series.length === 0}
        emptyText={`Chưa có đơn nào hoàn tất trong ${period}`}
        minHeight={config.height}
      >
        {metric === 'amount' ? (
          <RevenueAreaChart data={series} />
        ) : (
          <CompletedOrdersBarChart data={series} />
        )}
      </CardStateBody>
    </DashboardCard>
  );
}
