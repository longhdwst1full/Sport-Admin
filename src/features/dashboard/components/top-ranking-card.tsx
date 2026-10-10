import { Card, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { AdminTable } from '@/foundation/table';
import { DASHBOARD_CARD_CLASS, TOP_LIST_EXPORT_LIMIT } from '../constants/dashboard.constants';
import type { ReportQueryState, ReportRange } from '../model/dashboard.mapper';
import { ReportExportButton } from './report-export-button';
import { SectionTitle } from './section-title';

interface TopRankingCardProps<TRow extends object> {
  title: string;
  description: string;
  canSeeRevenue: boolean;
  range: ReportRange;
  state: ReportQueryState;
  rows: TRow[];
  rowKey: Extract<keyof TRow, string>;
  columns: ColumnsType<TRow>;
  emptyText: string;
  exportPath: string;
  exportFilename: string;
}

/**
 * Bảng xếp hạng top N (khách mua nhiều, sản phẩm bán chạy). Màn hình chỉ hiện top 5; file tải về là
 * toàn bộ danh sách của khoảng đang xem (`TOP_LIST_EXPORT_LIMIT`).
 */
export function TopRankingCard<TRow extends object>({
  title,
  description,
  canSeeRevenue,
  range,
  state,
  rows,
  rowKey,
  columns,
  emptyText,
  exportPath,
  exportFilename,
}: TopRankingCardProps<TRow>) {
  return (
    <Card
      className={`h-full ${DASHBOARD_CARD_CLASS}`}
      title={<SectionTitle title={title} description={description} />}
      extra={
        <ReportExportButton
          path={exportPath}
          params={{ ...range, limit: TOP_LIST_EXPORT_LIMIT }}
          fallbackFilename={exportFilename}
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
        <AdminTable<TRow>
          rowKey={rowKey}
          size="small"
          pagination={false}
          loading={state.isPending}
          dataSource={rows}
          locale={{ emptyText }}
          columns={columns}
        />
      )}
    </Card>
  );
}
