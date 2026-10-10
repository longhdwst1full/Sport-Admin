import { Card } from 'antd';
import { AdminTable } from '@/foundation/table';
import type { BranchRevenueDto } from '@/generated/api/reporting/reporting.schemas';
import { DASHBOARD_CARD_CLASS, REPORT_EXPORT_PATH, type Granularity } from '../constants/dashboard.constants';
import type { ReportRange } from '../model/dashboard.mapper';
import { ReportExportButton } from './report-export-button';
import { BRANCH_REVENUE_COLUMNS } from './report-table-columns';
import { SectionTitle } from './section-title';

interface BranchRevenueCardProps {
  canSeeRevenue: boolean;
  canSeeInventory: boolean;
  granularity: Granularity;
  range: ReportRange;
  rows: BranchRevenueDto[];
}

export function BranchRevenueCard({ canSeeRevenue, canSeeInventory, granularity, range, rows }: BranchRevenueCardProps) {
  return (
    <Card
      className={DASHBOARD_CARD_CLASS}
      title={<SectionTitle title="Hiệu quả theo chi nhánh" description="Doanh thu thực nhận và dự thu" />}
      extra={
        <div className="flex items-center gap-2">
          <ReportExportButton
            path={REPORT_EXPORT_PATH.revenueByBranch}
            params={{ ...range, granularity }}
            fallbackFilename="bao-cao-doanh-thu-chi-nhanh"
            disabled={!canSeeRevenue}
            label="Tải"
          />
          {/* Báo cáo tồn kho là danh sách CẦN NHẬP (chạm ngưỡng đặt lại), không phải toàn bộ
              tồn — nhãn phải nói đúng thứ sẽ tải về. */}
          <ReportExportButton
            path={REPORT_EXPORT_PATH.inventory}
            params={{}}
            fallbackFilename="bao-cao-ton-kho"
            disabled={!canSeeInventory}
            label="Tải hàng cần nhập"
          />
        </div>
      }
    >
      <AdminTable
        rowKey="branchName"
        size="small"
        pagination={false}
        dataSource={rows}
        columns={BRANCH_REVENUE_COLUMNS}
      />
    </Card>
  );
}
