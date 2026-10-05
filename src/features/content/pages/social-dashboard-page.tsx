import { ArrowDownOutlined, ArrowUpOutlined, ExportOutlined, ReloadOutlined } from '@ant-design/icons';
import { App, Button, Card, DatePicker, Empty, Image, Select, Skeleton, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { lazy, Suspense, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IMAGE_FALLBACK_SRC } from '@/features/media';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { PageTransition } from '@/foundation/layout/page-transition';
import { ManagementPage } from '@/foundation/management';
import { AdminTable } from '@/foundation/table';
import { formatDateTime } from '@/lib/format/datetime';
import { SocialChannelIcons } from '../components/social-channel-icons';
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
/** API không trả số bài theo ngày nên biểu đồ không có chỉ số "Bài/video". */
const CHART_METRICS = [
  SOCIAL_METRIC.VIEWS,
  SOCIAL_METRIC.LIKES,
  SOCIAL_METRIC.COMMENTS,
  SOCIAL_METRIC.SHARES,
  SOCIAL_METRIC.REACH,
];

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
  const [params, setParams] = useSearchParams();
  const filters = parseSocialDashboardFilters(params);
  const [chartMetric, setChartMetric] = useState<SocialMetric>(SOCIAL_METRIC.VIEWS);
  const dashboard = useSocialDashboard(filters);
  const { data } = dashboard;
  const channels = visibleChannels(filters);
  const ids = useId();
  const hasData = hasDashboardData(data);
  const series = useMemo(
    () => toComparisonSeries(data.daily, chartMetric, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filters được tính lại mỗi render; khoá theo giá trị
    [data.daily, chartMetric, filters.from, filters.to, filters.channel],
  );

  const updateParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Quản trị nội dung CMS"
        title="Dashboard mạng xã hội"
        description="Theo dõi hiệu quả bài đăng Facebook và TikTok theo khoảng ngày."
        actions={
          <Tooltip title="Làm mới dữ liệu">
            <Button
              icon={<ReloadOutlined />}
              onClick={dashboard.refetch}
              loading={dashboard.isFetching}
              aria-label="Làm mới"
            />
          </Tooltip>
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
              Đồng bộ gần nhất: {formatDateTime(data.syncedAt)}
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
                options={CHART_METRICS.map((metric) => ({ value: metric, label: socialMetricLabels[metric] }))}
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
              columns={[
                {
                  title: 'Bài đăng',
                  key: 'title',
                  render: (_: unknown, row: SocialTopPost) => (
                    <div className="flex items-center gap-3">
                      <Image
                        width={48}
                        height={48}
                        className="rounded-md object-cover"
                        src={row.thumbnailUrl ?? IMAGE_FALLBACK_SRC}
                        fallback={IMAGE_FALLBACK_SRC}
                        alt={row.title}
                        preview={false}
                      />
                      <div className="min-w-0">
                        <div className="max-w-[260px] truncate text-xs font-semibold text-slate-800">{row.title}</div>
                        {row.publishedAt && (
                          <div className="text-[11px] text-slate-500">{formatDateTime(row.publishedAt)}</div>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  title: 'Kênh',
                  key: 'channel',
                  width: 70,
                  align: 'center' as const,
                  render: (_: unknown, row: SocialTopPost) => (
                    <SocialChannelIcons channels={[POST_CHANNEL_OF[row.channel]]} />
                  ),
                },
                ...(['views', 'likes', 'comments', 'shares'] as const).map((key) => ({
                  title: socialMetricLabels[key],
                  key,
                  width: 100,
                  align: 'right' as const,
                  render: (_: unknown, row: SocialTopPost) => <span className="text-xs">{formatMetric(row[key])}</span>,
                })),
                {
                  title: '',
                  key: 'link',
                  width: 130,
                  render: (_: unknown, row: SocialTopPost) =>
                    row.permalinkUrl ? (
                      <a href={row.permalinkUrl} target="_blank" rel="noopener noreferrer" className="text-xs">
                        <ExportOutlined aria-hidden /> Xem bài gốc
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    ),
                },
              ]}
            />
          </Card>
        </div>
      </ManagementPage>
    </PageTransition>
  );
}
