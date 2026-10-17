import { ShopOutlined } from '@ant-design/icons';
import { TableSkeleton } from '@/foundation/feedback/page-skeleton';
import { AdminTable } from '@/foundation/table';
import type { BranchRevenueDto } from '@/generated/api/reporting/reporting.schemas';
import {
  PERIOD_DESCRIPTION,
  REPORT_EXPORT_PATH,
  type Granularity,
} from '../constants/dashboard.constants';
import type { ReportQueryState, ReportRange } from '../model/dashboard.mapper';
import { CardStateBody, DashboardCard } from './dashboard-card';
import { ReportExportButton } from './report-export-button';
import { BRANCH_REVENUE_COLUMNS, fillTableWidth } from './report-table-columns';

const BRANCH_TABLE_WIDTH = fillTableWidth(BRANCH_REVENUE_COLUMNS);

interface BranchRevenueCardProps {
  granularity: Granularity;
  range: ReportRange;
  state: ReportQueryState;
  rows: BranchRevenueDto[];
}

/**
 * Dữ liệu là `byBranch` của cùng báo cáo doanh thu. Trang chỉ mount thẻ khi có `report.revenue.view`
 * và báo cáo chưa lỗi (lỗi đã hiện ở thẻ doanh thu cùng nguồn).
 */
export function BranchRevenueCard({ granularity, range, state, rows }: BranchRevenueCardProps) {
  return (
    <DashboardCard
      icon={<ShopOutlined />}
      title="Hiệu quả theo chi nhánh"
      description={`Doanh thu hoàn tất, dự thu và hoàn tiền · ${PERIOD_DESCRIPTION[granularity]}`}
      extra={
        <ReportExportButton
          path={REPORT_EXPORT_PATH.revenueByBranch}
          params={{ ...range, granularity }}
          fallbackFilename="bao-cao-doanh-thu-chi-nhanh"
          label="Tải"
        />
      }
    >
      <CardStateBody
        state={state}
        isEmpty={rows.length === 0}
        emptyText={`Chưa có chi nhánh nào phát sinh doanh thu trong ${PERIOD_DESCRIPTION[granularity]}`}
        skeleton={<TableSkeleton rows={3} />}
      >
        <AdminTable
          rowKey="branchName"
          size="small"
          pagination={false}
          dataSource={rows}
          // UX: nhiều chi nhánh thì thân bảng cuộn trong ~6 dòng thay vì kéo dài thẻ.
          scroll={{ x: BRANCH_TABLE_WIDTH, y: 260 }}
          columns={BRANCH_REVENUE_COLUMNS}
        />
      </CardStateBody>
    </DashboardCard>
  );
}
