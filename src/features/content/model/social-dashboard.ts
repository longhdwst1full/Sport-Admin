import dayjs, { type Dayjs } from 'dayjs';
import {
  SocialChannel as ApiSocialChannel,
  SocialChannelFilter,
  type SocialChannelKpiDto,
  type SocialDailyPointDto,
  type SocialDashboardDto,
  type SocialTopPostDto,
} from '@/generated/api/content/content.schemas';
import { fromApiSocialChannel, SOCIAL_CHANNEL, type SocialChannel } from '../constants/social.constants';
import { parseSocialChannel } from './social-post-filters';

/**
 * View-model của "Dashboard mạng xã hội". Trang chỉ đọc các kiểu ở đây; `toSocialDashboardViewModel` chuyển DTO
 * Orval (`getAdminSocialDashboard` + `listAdminSocialTopPosts`) sang đúng các kiểu này.
 */

export const SOCIAL_METRIC = {
  POSTS: 'posts',
  VIEWS: 'views',
  LIKES: 'likes',
  COMMENTS: 'comments',
  SHARES: 'shares',
  REACH: 'reach',
} as const;
export type SocialMetric = (typeof SOCIAL_METRIC)[keyof typeof SOCIAL_METRIC];

export const socialMetricLabels: Record<SocialMetric, string> = {
  [SOCIAL_METRIC.POSTS]: 'Bài/video',
  [SOCIAL_METRIC.VIEWS]: 'Lượt xem',
  [SOCIAL_METRIC.LIKES]: 'Lượt thích',
  [SOCIAL_METRIC.COMMENTS]: 'Bình luận',
  [SOCIAL_METRIC.SHARES]: 'Chia sẻ',
  [SOCIAL_METRIC.REACH]: 'Tiếp cận',
};

/** `null` = kênh không cung cấp/chưa đồng bộ chỉ số này — hiển thị "—", không phải 0. */
export type SocialMetricValues = Record<SocialMetric, number | null>;

export interface SocialChannelKpi {
  channel: SocialChannel;
  current: SocialMetricValues;
  /** Kỳ liền trước cùng độ dài, để tính chênh lệch; bỏ trống khi API không trả. */
  previous?: SocialMetricValues | null;
}

export interface SocialDailyPoint {
  /** `YYYY-MM-DD`. */
  date: string;
  channel: SocialChannel;
  values: SocialMetricValues;
}

export interface SocialTopPost {
  id: string;
  channel: SocialChannel;
  title: string;
  thumbnailUrl?: string | null;
  permalinkUrl?: string | null;
  publishedAt?: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
}

export const SOCIAL_DASHBOARD_SOURCE = {
  /** Chưa có số liệu từ API (đang tải/lỗi) — trang không hiện số. */
  UNAVAILABLE: 'unavailable',
  API: 'api',
} as const;
export type SocialDashboardSource = (typeof SOCIAL_DASHBOARD_SOURCE)[keyof typeof SOCIAL_DASHBOARD_SOURCE];

export interface SocialDashboardViewModel {
  source: SocialDashboardSource;
  /** Lần đồng bộ chỉ số gần nhất (ISO). */
  syncedAt?: string | null;
  kpis: SocialChannelKpi[];
  daily: SocialDailyPoint[];
  topPosts: SocialTopPost[];
}

export const EMPTY_SOCIAL_DASHBOARD: SocialDashboardViewModel = {
  source: SOCIAL_DASHBOARD_SOURCE.UNAVAILABLE,
  syncedAt: null,
  kpis: [],
  daily: [],
  topPosts: [],
};

export function hasDashboardData(model: SocialDashboardViewModel): boolean {
  return model.kpis.length > 0 || model.daily.length > 0 || model.topPosts.length > 0;
}

// ── Bộ lọc (trên URL) ──────────────────────────────────────────────

export interface SocialDashboardFilters {
  /** `YYYY-MM-DD`, bao gồm cả hai đầu. */
  from: string;
  to: string;
  /** Bỏ trống = mọi kênh. */
  channel?: SocialChannel;
}

export const SOCIAL_DASHBOARD_DEFAULT_DAYS = 30;
/** CONTRACT: API nhận tối đa 90 ngày tính cả hai đầu (400 SOCIAL_DASHBOARD_RANGE_INVALID). */
export const SOCIAL_DASHBOARD_MAX_DAYS = 90;
/** Số bài nổi bật lấy về (API ≤ 50). */
export const SOCIAL_TOP_POSTS_LIMIT = 10;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_FORMAT = 'YYYY-MM-DD';

const parseDay = (value: string | null) =>
  value && DATE_PATTERN.test(value) && dayjs(value).isValid() ? dayjs(value) : undefined;

/** Khoảng ngày sai/thiếu/quá dài → mặc định 30 ngày gần nhất tính tới `today`. */
export function parseSocialDashboardFilters(params: URLSearchParams, today: Dayjs = dayjs()): SocialDashboardFilters {
  const from = parseDay(params.get('from'));
  const to = parseDay(params.get('to'));
  const validRange =
    from && to && !from.isAfter(to) && to.diff(from, 'day') < SOCIAL_DASHBOARD_MAX_DAYS;
  const end = today.startOf('day');
  return {
    from: validRange ? from.format(DATE_FORMAT) : end.subtract(SOCIAL_DASHBOARD_DEFAULT_DAYS - 1, 'day').format(DATE_FORMAT),
    to: validRange ? to.format(DATE_FORMAT) : end.format(DATE_FORMAT),
    channel: parseSocialChannel(params.get('channel')),
  };
}

/** Bộ lọc kênh của trang → `channel` của contract (bỏ trống = ALL). */
export function toDashboardChannelFilter(channel: SocialChannel | undefined): SocialChannelFilter {
  if (channel === SOCIAL_CHANNEL.FACEBOOK) return SocialChannelFilter.FACEBOOK;
  if (channel === SOCIAL_CHANNEL.TIKTOK) return SocialChannelFilter.TIKTOK;
  return SocialChannelFilter.ALL;
}

/** Kênh hiển thị: lọc một kênh thì chỉ kênh đó, không lọc thì so sánh mọi kênh. */
export function visibleChannels(filters: Pick<SocialDashboardFilters, 'channel'>): SocialChannel[] {
  return filters.channel ? [filters.channel] : Object.values(SOCIAL_CHANNEL);
}

// ── Định dạng ──────────────────────────────────────────────────────

const NUMBER = new Intl.NumberFormat('vi-VN');
const PERCENT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1, minimumFractionDigits: 0 });

export const formatMetric = (value: number | null | undefined) => (value == null ? '—' : NUMBER.format(value));

export interface MetricDelta {
  /** Ví dụ `+12,5%`, `-3%`, `0%`. */
  label: string;
  trend: 'up' | 'down' | 'flat';
}

/** Chênh lệch so với kỳ trước; không tính được (thiếu số hoặc kỳ trước = 0) thì trả `undefined`. */
export function formatDelta(current: number | null | undefined, previous: number | null | undefined): MetricDelta | undefined {
  if (current == null || previous == null || previous === 0) return undefined;
  const percent = Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
  if (percent === 0) return { label: '0%', trend: 'flat' };
  return {
    label: `${percent > 0 ? '+' : '-'}${PERCENT.format(Math.abs(percent))}%`,
    trend: percent > 0 ? 'up' : 'down',
  };
}

// ── Chuỗi theo ngày cho biểu đồ ────────────────────────────────────

export type ComparisonPoint = { date: string; label: string } & Record<SocialChannel, number | null>;

/**
 * Một điểm cho mỗi ngày trong khoảng (kể cả ngày không có số liệu → `null`, biểu đồ để trống chứ không vẽ 0),
 * cộng dồn nếu API trả nhiều dòng cùng ngày/kênh. Kênh bị lọc ra luôn `null`.
 */
export function toComparisonSeries(
  daily: readonly SocialDailyPoint[],
  metric: SocialMetric,
  filters: SocialDashboardFilters,
): ComparisonPoint[] {
  const channels = visibleChannels(filters);
  const sums = new Map<string, number>();
  for (const point of daily) {
    const value = point.values[metric];
    if (value == null || !channels.includes(point.channel)) continue;
    const key = `${point.date}|${point.channel}`;
    sums.set(key, (sums.get(key) ?? 0) + value);
  }
  const start = dayjs(filters.from).startOf('day');
  const days = Math.min(dayjs(filters.to).startOf('day').diff(start, 'day') + 1, SOCIAL_DASHBOARD_MAX_DAYS);
  return Array.from({ length: Math.max(days, 0) }, (_, index) => {
    const day = start.add(index, 'day');
    const date = day.format(DATE_FORMAT);
    const point = { date, label: day.format('DD/MM') } as ComparisonPoint;
    for (const channel of Object.values(SOCIAL_CHANNEL)) point[channel] = sums.get(`${date}|${channel}`) ?? null;
    return point;
  });
}

// ── Mapper DTO → view-model ────────────────────────────────────────

/** CONTRACT: reach của TikTok luôn 0 (TikTok không có chỉ số này) → hiển thị "—" thay vì 0. */
const reachOf = (channel: ApiSocialChannel, reach: number) => (channel === ApiSocialChannel.TIKTOK ? null : reach);

function kpiValues(kpi: SocialChannelKpiDto): SocialMetricValues {
  return {
    posts: kpi.posts,
    views: kpi.views,
    likes: kpi.likes,
    comments: kpi.comments,
    shares: kpi.shares,
    reach: reachOf(kpi.channel, kpi.reach),
  };
}

/** Điểm theo ngày: `posts` = số bản đăng thành công có giờ đăng (giờ VN) trong ngày. */
function dailyValues(channel: ApiSocialChannel, point: SocialDailyPointDto): SocialMetricValues {
  return {
    posts: point.posts,
    views: point.views,
    likes: point.likes,
    comments: point.comments,
    shares: point.shares,
    reach: reachOf(channel, point.reach),
  };
}

/** Một bài có thể nằm ở cả hai kênh → id dòng = postId + kênh. */
function toTopPost(item: SocialTopPostDto): SocialTopPost {
  return {
    id: `${item.postId}:${item.channel}`,
    channel: fromApiSocialChannel(item.channel),
    title: item.title,
    thumbnailUrl: item.thumbnailUrl ?? null,
    permalinkUrl: item.permalinkUrl ?? null,
    publishedAt: item.publishAt,
    views: item.views,
    likes: item.likes,
    comments: item.comments,
    shares: item.shares,
  };
}

/**
 * KPI/chuỗi là mức TĂNG trong khoảng (tổng delta theo ngày), không phải giá trị tích luỹ. `previous` = KPI kỳ liền trước
 * cùng độ dài (`previousTotals`) để tính % chênh lệch; `syncedAt` = lần job ghi chỉ số gần nhất (`lastSyncedAt`).
 */
export function toSocialDashboardViewModel(
  dashboard: SocialDashboardDto | undefined,
  topPosts: SocialTopPostDto[] | undefined,
): SocialDashboardViewModel {
  if (!dashboard) return { ...EMPTY_SOCIAL_DASHBOARD, topPosts: (topPosts ?? []).map(toTopPost) };
  return {
    source: SOCIAL_DASHBOARD_SOURCE.API,
    syncedAt: dashboard.lastSyncedAt,
    kpis: dashboard.totals.map((kpi) => {
      const previous = dashboard.previousTotals.find((item) => item.channel === kpi.channel);
      return {
        channel: fromApiSocialChannel(kpi.channel),
        current: kpiValues(kpi),
        previous: previous ? kpiValues(previous) : null,
      };
    }),
    daily: dashboard.daily.flatMap((series) =>
      series.points.map((point) => ({
        date: point.date,
        channel: fromApiSocialChannel(series.channel),
        values: dailyValues(series.channel, point),
      })),
    ),
    topPosts: (topPosts ?? []).map(toTopPost),
  };
}
