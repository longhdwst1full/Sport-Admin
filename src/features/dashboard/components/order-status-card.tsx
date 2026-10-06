import { Card, Empty, Skeleton } from 'antd';
import { Suspense } from 'react';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { DASHBOARD_CARD_CLASS } from '../constants/dashboard.constants';
import type { ReportQueryState, StatusSlice } from '../model/dashboard.mapper';
import { OrderStatusPieChart } from './lazy-dashboard-charts';
import { SectionTitle } from './section-title';

interface OrderStatusCardProps {
  canSeeOperation: boolean;
  state: ReportQueryState;
  slices: StatusSlice[];
}

export function OrderStatusCard({ canSeeOperation, state, slices }: OrderStatusCardProps) {
  return (
    <Card
      className={`h-full ${DASHBOARD_CARD_CLASS}`}
      title={<SectionTitle title="Đơn theo trạng thái" description="Phân bổ đơn hàng trong 30 ngày" />}
    >
      {!canSeeOperation ? (
        <Empty description="Tài khoản của bạn không có quyền xem vận hành" />
      ) : state.isError ? (
        <QueryErrorAlert error={state.error} retry={state.retry} />
      ) : state.isPending ? (
        <Skeleton active />
      ) : slices.length === 0 ? (
        <Empty description="Chưa có đơn nào trong 30 ngày qua" />
      ) : (
        <Suspense fallback={<Skeleton active />}>
          <OrderStatusPieChart data={slices} />
        </Suspense>
      )}
    </Card>
  );
}
