import type { ReportGranularity } from '@/generated/api/reporting/reporting.schemas';

export type Granularity = ReportGranularity;

export const GRANULARITY_OPTIONS: ReadonlyArray<{ value: Granularity; label: string }> = [
  { value: 'DAY', label: 'Ngày' },
  { value: 'MONTH', label: 'Tháng' },
  { value: 'QUARTER', label: 'Quý' },
  { value: 'YEAR', label: 'Năm' },
];

/**
 * Khoảng thời gian mặc định theo mức gom.
 *
 * Backend mặc định 30 ngày gần nhất; gom theo quý hoặc năm trên 30 ngày chỉ cho đúng một cột, nên
 * mỗi mức tự nới khoảng đủ để biểu đồ có ý nghĩa.
 */
export const LOOKBACK_DAYS: Record<Granularity, number> = {
  DAY: 30,
  MONTH: 365,
  QUARTER: 730,
  YEAR: 1826,
};

export const PERIOD_DESCRIPTION: Record<Granularity, string> = {
  DAY: '30 ngày gần nhất',
  MONTH: '12 tháng gần nhất',
  QUARTER: '8 quý gần nhất',
  YEAR: '5 năm gần nhất',
};

/** Màn hình chỉ hiện top 5; file tải về là toàn bộ danh sách của khoảng đang xem. */
export const TOP_LIST_LIMIT = 5;
export const TOP_LIST_EXPORT_LIMIT = 50;

export const DASHBOARD_CARD_CLASS = '!rounded-2xl !border-slate-200/80 !shadow-card';
