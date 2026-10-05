import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { SOCIAL_CHANNEL } from '../constants/social.constants';
import {
  EMPTY_SOCIAL_DASHBOARD,
  formatDelta,
  formatMetric,
  hasDashboardData,
  parseSocialDashboardFilters,
  SOCIAL_METRIC,
  toComparisonSeries,
  type SocialDailyPoint,
  type SocialMetricValues,
} from './social-dashboard';

const values = (patch: Partial<SocialMetricValues>): SocialMetricValues => ({
  posts: null,
  views: null,
  likes: null,
  comments: null,
  shares: null,
  reach: null,
  ...patch,
});

describe('parseSocialDashboardFilters', () => {
  const today = dayjs('2026-10-05T15:00:00');

  it('defaults to the last 30 days including today', () => {
    expect(parseSocialDashboardFilters(new URLSearchParams(), today)).toEqual({
      from: '2026-09-06',
      to: '2026-10-05',
      channel: undefined,
    });
  });

  it('keeps a valid range and an enabled channel', () => {
    expect(
      parseSocialDashboardFilters(new URLSearchParams('from=2026-10-01&to=2026-10-03&channel=facebook'), today),
    ).toEqual({ from: '2026-10-01', to: '2026-10-03', channel: 'facebook' });
  });

  it('falls back on reversed, invalid or too long (> 90 days) ranges and accepts TikTok', () => {
    const fallback = { from: '2026-09-06', to: '2026-10-05' };
    expect(parseSocialDashboardFilters(new URLSearchParams('from=2026-10-03&to=2026-10-01'), today)).toMatchObject(fallback);
    expect(parseSocialDashboardFilters(new URLSearchParams('from=bad&to=2026-10-01'), today)).toMatchObject(fallback);
    expect(parseSocialDashboardFilters(new URLSearchParams('from=2024-01-01&to=2026-10-01'), today)).toMatchObject(fallback);
    expect(parseSocialDashboardFilters(new URLSearchParams('from=2026-07-01&to=2026-10-01'), today)).toMatchObject(fallback);
    expect(parseSocialDashboardFilters(new URLSearchParams('channel=tiktok'), today).channel).toBe('tiktok');
  });
});

describe('formatDelta', () => {
  it('formats increase, decrease and no change', () => {
    expect(formatDelta(1125, 1000)).toEqual({ label: '+12,5%', trend: 'up' });
    expect(formatDelta(97, 100)).toEqual({ label: '-3%', trend: 'down' });
    expect(formatDelta(100, 100)).toEqual({ label: '0%', trend: 'flat' });
  });

  it('returns undefined when it cannot be computed', () => {
    expect(formatDelta(10, 0)).toBeUndefined();
    expect(formatDelta(null, 10)).toBeUndefined();
    expect(formatDelta(10, undefined)).toBeUndefined();
  });
});

describe('formatMetric', () => {
  it('uses vi-VN grouping and a dash for missing values', () => {
    expect(formatMetric(12345)).toBe('12.345');
    expect(formatMetric(0)).toBe('0');
    expect(formatMetric(null)).toBe('—');
  });
});

describe('toComparisonSeries', () => {
  const daily: SocialDailyPoint[] = [
    { date: '2026-10-01', channel: SOCIAL_CHANNEL.FACEBOOK, values: values({ views: 100 }) },
    { date: '2026-10-01', channel: SOCIAL_CHANNEL.FACEBOOK, values: values({ views: 20 }) },
    { date: '2026-10-01', channel: SOCIAL_CHANNEL.TIKTOK, values: values({ views: 300 }) },
    { date: '2026-10-03', channel: SOCIAL_CHANNEL.TIKTOK, values: values({ views: null }) },
  ];

  it('emits one point per day, sums duplicates and leaves missing days null', () => {
    expect(toComparisonSeries(daily, SOCIAL_METRIC.VIEWS, { from: '2026-10-01', to: '2026-10-03' })).toEqual([
      { date: '2026-10-01', label: '01/10', facebook: 120, tiktok: 300 },
      { date: '2026-10-02', label: '02/10', facebook: null, tiktok: null },
      { date: '2026-10-03', label: '03/10', facebook: null, tiktok: null },
    ]);
  });

  it('nulls out channels removed by the filter', () => {
    const [first] = toComparisonSeries(daily, SOCIAL_METRIC.VIEWS, {
      from: '2026-10-01',
      to: '2026-10-01',
      channel: SOCIAL_CHANNEL.FACEBOOK,
    });
    expect(first).toMatchObject({ facebook: 120, tiktok: null });
  });
});

describe('hasDashboardData', () => {
  it('is false for the placeholder state', () => {
    expect(hasDashboardData(EMPTY_SOCIAL_DASHBOARD)).toBe(false);
  });
});
