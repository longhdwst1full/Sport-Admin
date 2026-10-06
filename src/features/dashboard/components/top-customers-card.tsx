import { Card, Empty } from 'antd';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { AdminTable } from '@/foundation/table';
import type { TopCustomerDto } from '@/generated/api/reporting/reporting.schemas';
import {
  DASHBOARD_CARD_CLASS,
  PERIOD_DESCRIPTION,
  TOP_LIST_EXPORT_LIMIT,
  type Granularity,
} from '../constants/dashboard.constants';
import type { ReportQueryState, ReportRange } from '../model/dashboard.mapper';
import { ReportExportButton } from './report-export-button';
import { TOP_CUSTOMER_COLUMNS } from './report-table-columns';
import { SectionTitle } from './section-title';

interface TopCustomersCardProps {
  canSeeRevenue: boolean;
  granularity: Granularity;
  range: ReportRange;
  state: ReportQueryState;
  rows: TopCustomerDto[];
}

export function TopCustomersCard({ canSeeRevenue, granularity, range, state, rows }: TopCustomersCardProps) {
  return (
    <Card
      className={`h-full ${DASHBOARD_CARD_CLASS}`}
      title={
        <SectionTitle
          title="Khách mua nhiều nhất"
          description={`Theo tiền đã thực trả · ${PERIOD_DESCRIPTION[granularity]}`}
        />
      }
      extra={
        // Màn hình chỉ hiện 5 khách; file tải về là toàn bộ danh sách của khoảng đang xem.
        <ReportExportButton
          path="/api/v1/admin/reports/top-customers/export"
          params={{ ...range, limit: TOP_LIST_EXPORT_LIMIT }}
          fallbackFilename="bao-cao-khach-mua-nhieu"
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
          rowKey="customerNo"
          size="small"
          pagination={false}
          loading={state.isPending}
          dataSource={rows}
          locale={{ emptyText: 'Chưa có khách nào hoàn tất đơn trong khoảng này' }}
          columns={TOP_CUSTOMER_COLUMNS}
        />
      )}
    </Card>
  );
}
