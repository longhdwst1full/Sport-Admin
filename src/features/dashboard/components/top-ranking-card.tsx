import { TrophyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { TableSkeleton } from '@/foundation/feedback/page-skeleton';
import { AdminTable } from '@/foundation/table';
import {
  TOP_LIST_EXPORT_LIMIT,
  TOP_LIST_LIMIT,
  DENIED_TEXT,
} from '../constants/dashboard.constants';
import type { ReportQueryState, ReportRange } from '../model/dashboard.mapper';
import { CardStateBody, DashboardCard } from './dashboard-card';
import { ReportExportButton } from './report-export-button';

const RANK_CLASS = [
  'bg-amber-100 text-amber-800 ring-amber-200',
  'bg-slate-200 text-slate-700 ring-slate-300',
  'bg-orange-100 text-orange-800 ring-orange-200',
];

/** Hạng 1–3 nổi bật; Backend đã sắp xếp nên thứ tự dòng chính là hạng. */
function RankBadge({ rank }: { rank: number }) {
  const highlight = RANK_CLASS[rank - 1];
  return (
    <span
      className={`inline-grid size-6 place-items-center rounded-full text-xs font-bold tabular-nums ${
        highlight ? `ring-1 ring-inset ${highlight}` : 'text-slate-400'
      }`}
    >
      {rank}
    </span>
  );
}

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
 * Bảng xếp hạng top N (khách mua nhiều, sản phẩm bán chạy). Màn hình chỉ hiện top 5; file tải về lấy
 * tối đa `TOP_LIST_EXPORT_LIMIT` dòng (giới hạn Backend) của khoảng đang xem.
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
  const rankedColumns = useMemo<ColumnsType<TRow>>(
    () => [
      {
        title: '#',
        key: 'rank',
        width: 52,
        align: 'center',
        render: (_value, _row, index) => <RankBadge rank={index + 1} />,
      },
      ...columns,
    ],
    [columns],
  );
  return (
    <DashboardCard
      icon={<TrophyOutlined />}
      title={title}
      description={description}
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
      <CardStateBody
        state={state}
        deniedText={canSeeRevenue ? undefined : DENIED_TEXT.revenue}
        isEmpty={rows.length === 0}
        emptyText={emptyText}
        skeleton={<TableSkeleton rows={TOP_LIST_LIMIT} />}
      >
        <AdminTable<TRow>
          rowKey={rowKey}
          size="small"
          pagination={false}
          dataSource={rows}
          columns={rankedColumns}
        />
      </CardStateBody>
    </DashboardCard>
  );
}
