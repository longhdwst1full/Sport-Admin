import { Card, Empty } from 'antd';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { AdminTable } from '@/foundation/table';
import type { TopProductDto } from '@/generated/api/reporting/reporting.schemas';
import {
  DASHBOARD_CARD_CLASS,
  PERIOD_DESCRIPTION,
  TOP_LIST_EXPORT_LIMIT,
  type Granularity,
} from '../constants/dashboard.constants';
import type { ReportQueryState, ReportRange } from '../model/dashboard.mapper';
import { ReportExportButton } from './report-export-button';
import { TOP_PRODUCT_COLUMNS } from './report-table-columns';
import { SectionTitle } from './section-title';

interface TopProductsCardProps {
  canSeeRevenue: boolean;
  granularity: Granularity;
  range: ReportRange;
  state: ReportQueryState;
  rows: TopProductDto[];
}

export function TopProductsCard({ canSeeRevenue, granularity, range, state, rows }: TopProductsCardProps) {
  return (
    <Card
      className={`h-full ${DASHBOARD_CARD_CLASS}`}
      title={
        <SectionTitle
          title="Sản phẩm bán chạy"
          description={`Xếp theo số lượng bán · ${PERIOD_DESCRIPTION[granularity]}`}
        />
      }
      extra={
        <ReportExportButton
          path="/api/v1/admin/reports/top-products/export"
          params={{ ...range, limit: TOP_LIST_EXPORT_LIMIT }}
          fallbackFilename="bao-cao-san-pham-ban-chay"
          disabled={!canSeeRevenue}
          label="Tải"
        />
      }
    >
      {!canSeeRevenue ? (
        <Empty description="Cần quyền xem doanh thu" />
      ) : state.isError ? (
        <QueryErrorAlert error={state.error} retry={state.retry} />
      ) : (
        <AdminTable
          rowKey="sku"
          size="small"
          pagination={false}
          loading={state.isPending}
          dataSource={rows}
          locale={{ emptyText: 'Chưa có sản phẩm nào bán được trong đơn đã thu tiền' }}
          columns={TOP_PRODUCT_COLUMNS}
        />
      )}
    </Card>
  );
}
