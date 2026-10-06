import { Card, Empty, Skeleton } from 'antd';
import { Suspense } from 'react';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { DASHBOARD_CARD_CLASS, PERIOD_DESCRIPTION, type Granularity } from '../constants/dashboard.constants';
import type { ReportQueryState, RevenuePoint } from '../model/dashboard.mapper';
import { CompletedOrdersBarChart } from './lazy-dashboard-charts';
import { SectionTitle } from './section-title';

interface CompletedOrdersCardProps {
  canSeeRevenue: boolean;
  granularity: Granularity;
  state: ReportQueryState;
  series: RevenuePoint[];
}

export function CompletedOrdersCard({ canSeeRevenue, granularity, state, series }: CompletedOrdersCardProps) {
  return (
    <Card
      className={`h-full ${DASHBOARD_CARD_CLASS}`}
      title={
        <SectionTitle
          title="Số đơn hoàn tất theo kỳ"
          description={`Cùng khoảng và mức gom với biểu đồ doanh thu · ${PERIOD_DESCRIPTION[granularity]}`}
        />
      }
    >
      {!canSeeRevenue ? (
        <Empty description="Tài khoản của bạn không có quyền xem doanh thu" />
      ) : state.isError ? (
        <QueryErrorAlert error={state.error} retry={state.retry} />
      ) : state.isPending ? (
        <Skeleton active />
      ) : series.length === 0 ? (
        <Empty description="Chưa có đơn nào hoàn tất trong khoảng này" />
      ) : (
        <Suspense fallback={<Skeleton active />}>
          <CompletedOrdersBarChart data={series} />
        </Suspense>
      )}
    </Card>
  );
}
