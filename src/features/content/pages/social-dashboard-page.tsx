import { ArrowDownOutlined, ArrowUpOutlined, ExportOutlined } from '@ant-design/icons';
import { App, Card, DatePicker, Empty, Select, Skeleton, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { lazy, Suspense, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { PageTransition } from '@/foundation/layout/page-transition';
import { ManagementPage } from '@/foundation/management';
import { AdminTable, col, EMPTY_CELL, RefreshButton } from '@/foundation/table';
import { formatDateTime } from '@/lib/format/datetime';
import { useUrlFilters } from '@/shared/hooks/use-url-filters';
import { SocialChannelIcons } from '../components/social-channel-icons';
import { SocialPostTitleCell } from '../components/social-post-title-cell';
import { SocialSyncButton } from '../components/social-sync-button';
import {
  isSocialChannelEnabled,
  SOCIAL_CHANNEL,
  socialChannelLabels,
  type SocialChannel,
  TIKTOK_DISABLED_HINT,
} from '../constants/social.constants';
import { useSocialDashboard } from '../hooks/use-social-dashboard';
import {
  formatDelta,
  formatMetric,
  hasDashboardData,
  parseSocialDashboardFilters,
  SOCIAL_DASHBOARD_MAX_DAYS,
  SOCIAL_METRIC,
  socialMetricLabels,
  type SocialChannelKpi,
  type SocialMetric,
  type SocialTopPost,
  toComparisonSeries,
  visibleChannels,
} from '../model/social-dashboard';
import { socialCommandErrorMessage } from '../model/social-command-error';
import { POST_CHANNEL } from '../model/social-post-filters';

const SocialComparisonChart = lazy(() =>
  import('../components/social-dashboard-chart').then((module) => ({ default: module.SocialComparisonChart })),
);

const ALL_CHANNELS = 'all';
const KPI_METRICS = Object.values(SOCIAL_METRIC);
const CHART_METRIC_OPTIONS = Object.values(SOCIAL_METRIC).map((metric) => ({ value: metric, label: socialMetricLabels[metric] }));
const TOP_POST_METRICS = ['views', 'likes', 'comments', 'shares'] as const;

const POST_CHANNEL_OF: Record<SocialChannel, (typeof POST_CHANNEL)[keyof typeof POST_CHANNEL]> = {
  [SOCIAL_CHANNEL.FACEBOOK]: POST_CHANNEL.FACEBOOK,
  [SOCIAL_CHANNEL.TIKTOK]: POST_CHANNEL.TIKTOK,
};

const channelOptions = [
  { value: ALL_CHANNELS, label: 'Tất cả kênh' },
  ...Object.values(SOCIAL_CHANNEL).map((channel) =>
    isSocialChannelEnabled(channel)
      ? { value: channel, label: socialChannelLabels[channel] }
      : {
          value: channel,
          disabled: true,
          label: (
            <Tooltip title={TIKTOK_DISABLED_HINT}>
              <span>{socialChannelLabels[channel]}</span>
            </Tooltip>
          ),
        },
  ),
];

const TOP_POST_COLUMNS: ColumnsType<SocialTopPost> = [
  {
    title: 'Bài đăng',
    key: 'title',
    render: (_: unknown, row: SocialTopPost) => (
      <SocialPostTitleCell title={row.title} imageUrl={row.thumbnailUrl}>
        {row.publishedAt && <div className="text-[11px] text-slate-500">{formatDateTime(row.publishedAt)}</div>}
      </SocialPostTitleCell>
    ),
  },
  col.text<SocialTopPost>('channel', 'Kênh', {
    width: 70,
    align: 'center',
    render: (channel: SocialChannel) => <SocialChannelIcons channels={[POST_CHANNEL_OF[channel]]} />,
  }),
  ...TOP_POST_METRICS.map((key) =>
    col.number<SocialTopPost>(key, socialMetricLabels[key], {
      width: 100,
      render: (value: number | null) => <span className="text-xs">{formatMetric(value)}</span>,
    }),
  ),
  col.text<SocialTopPost>('permalinkUrl', '', {
    key: 'link',
    width: 130,
    render: (url: string | null | undefined) =>
      url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs">
          <ExportOutlined aria-hidden /> Xem bài gốc
        </a>
      ) : (
        <span className="text-xs text-slate-400">{EMPTY_CELL}</span>
      ),
  }),
];

function KpiCard({
  metric,
  channels,
  kpis,
  loading,
}: {
  metric: SocialMetric;
  channels: SocialChannel[];
  kpis: SocialChannelKpi[];
  loading: boolean;
}) {
  return (
    <Card size="small" className="h-full" title={socialMetricLabels[metric]}>
      {loading ? (
        <Skeleton active title={false} paragraph={{ rows: 2 }} />
      ) : (
        <dl className="m-0 space-y-2">
          {channels.map((channel) => {
            const kpi = kpis.find((item) => item.channel === channel);
            const delta = formatDelta(kpi?.current[metric], kpi?.previous?.[metric]);
            return (
              <div key={channel} className="flex items-center justify-between gap-2">
                <dt className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                  <SocialChannelIcons channels={[POST_CHANNEL_OF[channel]]} />
                  <span className="truncate">{socialChannelLabels[channel]}</span>
                </dt>
                <dd className="m-0 flex items-baseline gap-1.5 text-right">
                  <span className="text-base font-semibold text-slate-900">{formatMetric(kpi?.current[metric])}</span>
                  {delta && (
                    <span
                      className={`text-[11px] ${
                        delta.trend === 'up' ? 'text-emerald-600' : delta.trend === 'down' ? 'text-rose-600' : 'text-slate-500'
                      }`}
                      aria-label={`So với kỳ trước ${delta.label}`}
                    >
                      {delta.trend === 'up' && <ArrowUpOutlined aria-hidden />}
                      {delta.trend === 'down' && <ArrowDownOutlined aria-hidden />} {delta.label}
                    </span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </Card>
  );
}

/**
 * Dashboard mạng xã hội: KPI theo kênh, biểu đồ so sánh theo ngày, bài nổi bật. Bộ lọc nằm trên URL.
 * Dữ liệu đi qua `useSocialDashboard` (query Orval) → view-model ở `model/social-dashboard`.
 */
export function SocialDashboardPage() {
  const { message } = App.useApp();
  const [params] = useSearchParams();
  const { patch: updateParams } = useUrlFilters();
  const filters = parseSocialDashboardFilters(params);
  const { from, to, channel } = filters;
  const [chartMetric, setChartMetric] = useState<SocialMetric>(SOCIAL_METRIC.VIEWS);
  const dashboard = useSocialDashboard(filters);
  const { data } = dashboard;
  const channels = visibleChannels(filters);
  const ids = useId();
  const hasData = hasDashboardData(data);
  // `filters` là object mới mỗi render; khoá memo theo từng giá trị.
  const series = useMemo(
    () => toComparisonSeries(data.daily, chartMetric, { from, to, channel }),
    [data.daily, chartMetric, from, to, channel],
  );

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Quản trị nội dung CMS"
        title="Dashboard mạng xã hội"
        description="Theo dõi hiệu quả bài đăng Facebook và TikTok theo khoảng ngày."
        actions={
          <div className="flex flex-wrap gap-2">
            <RefreshButton onRefresh={dashboard.refetch} loading={dashboard.isFetching} />
            <SocialSyncButton />
          </div>
        }
        filters={
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0">
              <label htmlFor={`${ids}-range`} className="sr-only">
                Khoảng ngày
              </label>
              <DatePicker.RangePicker
                id={`${ids}-range`}
                className="w-full"
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                allowClear={false}
                value={[dayjs(filters.from), dayjs(filters.to)]}
                disabledDate={(date) => date.isAfter(dayjs(), 'day')}
                onChange={(dates) => {
                  const [start, end] = [dates?.[0], dates?.[1]];
                  // CONTRACT: tối đa 90 ngày tính cả hai đầu; khoảng dài hơn bị API từ chối.
                  if (start && end && end.diff(start, 'day') >= SOCIAL_DASHBOARD_MAX_DAYS) {
                    void message.warning(`Chọn khoảng tối đa ${SOCIAL_DASHBOARD_MAX_DAYS} ngày.`);
                    return;
                  }
                  updateParams({ from: start?.format('YYYY-MM-DD'), to: end?.format('YYYY-MM-DD') });
                }}
              />
            </div>
            <Select
              className="w-full"
              aria-label="Kênh"
              value={filters.channel ?? ALL_CHANNELS}
              options={channelOptions}
              onChange={(value: string) => updateParams({ channel: value === ALL_CHANNELS ? undefined : value })}
            />
          </div>
        }
      >
        <div className="space-y-4">
          {dashboard.error != null && (
            <QueryErrorAlert
              error={dashboard.error}
              message="Không tải được số liệu mạng xã hội"
              description={socialCommandErrorMessage(dashboard.error)}
              retry={dashboard.refetch}
            />
          )}
          <Typography.Text type="secondary" className="block text-xs">
            Lượt xem/thích/bình luận/chia sẻ là mức tăng trong khoảng ngày (giờ Việt Nam), do job đồng bộ chỉ số ghi
            lại mỗi ngày. "Bài/video" là số bài đăng thành công trong khoảng.
          </Typography.Text>
          {data.syncedAt && (
            <Typography.Text type="secondary" className="block text-xs">
              Đồng bộ lần cuối: {formatDateTime(data.syncedAt)}
            </Typography.Text>
          )}

          <section aria-label="Chỉ số tổng hợp" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {KPI_METRICS.map((metric) => (
              <KpiCard key={metric} metric={metric} channels={channels} kpis={data.kpis} loading={dashboard.isLoading} />
            ))}
          </section>

          <Card
            size="small"
            title="Theo ngày"
            extra={
              <Select
                size="small"
                className="w-32"
                aria-label="Chỉ số biểu đồ"
                value={chartMetric}
                onChange={setChartMetric}
                options={CHART_METRIC_OPTIONS}
              />
            }
          >
            {dashboard.isLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : data.daily.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có số liệu theo ngày." />
            ) : (
              <figure className="m-0" aria-label={`${socialMetricLabels[chartMetric]} theo ngày, so sánh theo kênh`}>
                <Suspense fallback={<Skeleton active paragraph={{ rows: 6 }} />}>
                  <SocialComparisonChart data={series} channels={channels} metricLabel={socialMetricLabels[chartMetric]} />
                </Suspense>
              </figure>
            )}
          </Card>

          <Card size="small" title="Bài nổi bật">
            <AdminTable<SocialTopPost>
              rowKey="id"
              surface="embedded"
              loading={dashboard.isLoading}
              dataSource={data.topPosts}
              pagination={false}
              scroll={{ x: 820 }}
              locale={{ emptyText: hasData ? 'Không có bài trong khoảng ngày này.' : 'Chưa có số liệu bài đăng.' }}
              columns={TOP_POST_COLUMNS}
            />
          </Card>
        </div>
      </ManagementPage>
    </PageTransition>
  );
}
