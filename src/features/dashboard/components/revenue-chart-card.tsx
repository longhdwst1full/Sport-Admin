import { Card, Empty, Segmented, Skeleton } from 'antd';
import { Suspense } from 'react';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { moneyFormatter } from '@/lib/format/money';
import {
  DASHBOARD_CARD_CLASS,
  GRANULARITY_OPTIONS,
  PERIOD_DESCRIPTION,
  REPORT_EXPORT_PATH,
  type Granularity,
} from '../constants/dashboard.constants';
import type { ReportQueryState, ReportRange, RevenuePoint } from '../model/dashboard.mapper';
import { RevenueAreaChart } from './lazy-dashboard-charts';
import { ReportExportButton } from './report-export-button';
import { SectionTitle } from './section-title';

interface RevenueChartCardProps {
  canSeeRevenue: boolean;
  granularity: Granularity;
  onGranularityChange: (value: Granularity) => void;
  range: ReportRange;
  state: ReportQueryState;
  series: RevenuePoint[];
}

export function RevenueChartCard({
  canSeeRevenue,
  granularity,
  onGranularityChange,
  range,
  state,
  series,
}: RevenueChartCardProps) {
  return (
    <Card
      className={`h-full ${DASHBOARD_CARD_CLASS}`}
      title={
        <SectionTitle
          title="Doanh thu thuần theo kỳ"
          description={`Đơn hoàn tất trừ tiền đã hoàn trong kỳ · ${PERIOD_DESCRIPTION[granularity]}`}
        />
      }
      extra={
        <div className="flex items-center gap-2">
          <Segmented
            size="small"
            value={granularity}
            options={[...GRANULARITY_OPTIONS]}
            onChange={(value) => onGranularityChange(value as Granularity)}
          />
          {/* File tải về dùng đúng khoảng và mức gom đang xem trên màn hình. */}
          <ReportExportButton
            path={REPORT_EXPORT_PATH.revenue}
            params={{ ...range, granularity }}
            fallbackFilename="bao-cao-doanh-thu"
            disabled={!canSeeRevenue}
          />
        </div>
      }
    >
      {!canSeeRevenue ? (
        <Empty description="Tài khoản của bạn không có quyền xem doanh thu" />
      ) : state.isError ? (
        <QueryErrorAlert error={state.error} retry={state.retry} />
      ) : state.isPending ? (
        <Skeleton active />
      ) : series.length === 0 ? (
        <Empty description={`Chưa có đơn nào hoàn tất trong ${PERIOD_DESCRIPTION[granularity]}`} />
      ) : (
        <Suspense fallback={<Skeleton active />}>
          <RevenueAreaChart data={series} money={moneyFormatter} />
        </Suspense>
      )}
    </Card>
  );
}
