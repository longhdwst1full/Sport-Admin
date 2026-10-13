import { PieChartOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import { OVERVIEW_PERIOD, DENIED_TEXT } from '../constants/dashboard.constants';
import type { ReportQueryState, StatusSlice } from '../model/dashboard.mapper';
import { CardStateBody, DashboardCard } from './dashboard-card';
import { OrderStatusPieChart } from './lazy-dashboard-charts';

interface OrderStatusCardProps {
  canSeeOperation: boolean;
  state: ReportQueryState;
  slices: StatusSlice[];
}

/** Báo cáo tổng quan cố định 30 ngày theo ngày đặt; không đổi theo bộ chọn kỳ. */
export function OrderStatusCard({ canSeeOperation, state, slices }: OrderStatusCardProps) {
  const total = useMemo(() => slices.reduce((sum, slice) => sum + slice.value, 0), [slices]);
  return (
    <DashboardCard
      icon={<PieChartOutlined />}
      title="Đơn theo trạng thái"
      description={`Đơn đặt trong ${OVERVIEW_PERIOD}, theo trạng thái hiện tại`}
    >
      <CardStateBody
        state={state}
        deniedText={canSeeOperation ? undefined : DENIED_TEXT.operation}
        isEmpty={slices.length === 0}
        emptyText={`Chưa có đơn nào trong ${OVERVIEW_PERIOD}`}
        minHeight={280}
      >
        <OrderStatusPieChart data={slices} total={total} />
        <ul className="m-0 mt-4 grid list-none grid-cols-1 gap-x-4 gap-y-1.5 p-0 text-sm sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {slices.map((slice) => (
            <li key={slice.key} className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-slate-600">{slice.name}</span>
              <span className="font-semibold tabular-nums text-slate-900">{slice.value}</span>
              <span className="w-12 text-right text-xs tabular-nums text-slate-400">
                {slice.percentLabel}
              </span>
            </li>
          ))}
        </ul>
      </CardStateBody>
    </DashboardCard>
  );
}
