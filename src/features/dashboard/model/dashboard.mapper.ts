import { orderStatusPresentation } from '@/features/order-status';
import { OrderStatusGroup, type OrderStatus } from '@/generated/api/orders/orders.schemas';
import type {
  InventoryReportDto,
  OrderStatusCountDto,
  OverviewReportDto,
  RevenuePointDto,
  RevenueReportDto,
} from '@/generated/api/reporting/reporting.schemas';
import { formatMoney } from '@/lib/format/money';
import {
  CHART_COLORS,
  LOOKBACK_DAYS,
  MAX_STATUS_SLICES,
  OVERVIEW_PERIOD,
  PERIOD_DESCRIPTION,
  type Granularity,
} from '../constants/dashboard.constants';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Backend gom kỳ theo giờ Việt Nam (`common/time/vietnam-time.ts`), khung trục phải cắt cùng múi. */
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const UNITS_PER_YEAR: Record<Exclude<Granularity, 'DAY'>, number> = {
  MONTH: 12,
  QUARTER: 4,
  YEAR: 1,
};

export interface ReportRange {
  from: string;
  to: string;
}

export interface RevenuePoint {
  /** Khoá kỳ thô của Backend (`YYYY-MM-DD`, `YYYY-MM`, `YYYY-Qn`, `YYYY`). */
  key: string;
  /** Nhãn trục ngắn. */
  label: string;
  /** Nhãn đầy đủ cho tooltip. */
  fullLabel: string;
  amount: number;
  orders: number;
}

export interface StatusSlice {
  key: string;
  name: string;
  value: number;
  color: string;
  /** Tỷ lệ đã định dạng kiểu Việt Nam, ví dụ `12,5%`. */
  percentLabel: string;
}

/** Trạng thái truy vấn rút gọn cho các khối trình bày; không mang DTO. */
export interface ReportQueryState {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  retry: () => void;
}

export type KpiKey =
  | 'netRevenue'
  | 'expectedRevenue'
  | 'ordersToday'
  | 'awaitingFulfillment'
  | 'lowStock';
export type KpiTone = 'brand' | 'blue' | 'violet' | 'amber' | 'rose';
export type KpiStatus = 'ready' | 'loading' | 'error' | 'denied';

export interface KpiCard {
  key: KpiKey;
  label: string;
  /** Kỳ số liệu của riêng thẻ; tổng quan luôn 30 ngày, doanh thu theo bộ chọn kỳ. */
  period: string;
  value: string;
  hint: string;
  tone: KpiTone;
  status: KpiStatus;
  retry?: () => void;
}

/**
 * Thẻ KPI → màn danh sách đã lọc sẵn gần nhất với tập bản ghi tạo nên con số.
 * CONTRACT: `awaitingFulfillment` đếm đúng nhóm `AWAITING_SHIPMENT` (CONFIRMED|PICKING|PACKED) và `lowStock`
 * đếm đúng phân loại `LOW_STOCK` của Inventory (không gồm hết hàng), nên hai link này khớp con số tuyệt đối
 * (cùng phạm vi chi nhánh).
 */
export const KPI_LINKS: Record<KpiKey, string> = {
  netRevenue: '/payments',
  expectedRevenue: `/orders?status=${OrderStatusGroup.DELIVERED}`,
  ordersToday: '/orders',
  awaitingFulfillment: `/orders?status=${OrderStatusGroup.AWAITING_SHIPMENT}`,
  lowStock: '/inventory?tab=balances&balance.status=LOW_STOCK',
};

export function toReportRange(granularity: Granularity, now: Date): ReportRange {
  const from = new Date(now.getTime() - LOOKBACK_DAYS[granularity] * DAY_MS);
  return { from: from.toISOString(), to: now.toISOString() };
}

function vietnamDateParts(iso: string): [number, number, number] {
  const [year, month, day] = new Date(Date.parse(iso) + VIETNAM_OFFSET_MS)
    .toISOString()
    .slice(0, 10)
    .split('-');
  return [Number(year), Number(month), Number(day)];
}

const pad2 = (value: number) => String(value).padStart(2, '0');

/** Mọi khoá kỳ trong khoảng, cùng định dạng và múi giờ với Backend. */
export function toPeriodKeys(range: ReportRange, granularity: Granularity): string[] {
  const [fromYear, fromMonth, fromDay] = vietnamDateParts(range.from);
  const [toYear, toMonth, toDay] = vietnamDateParts(range.to);
  const keys: string[] = [];
  if (granularity === 'DAY') {
    const end = Date.UTC(toYear, toMonth - 1, toDay);
    for (let time = Date.UTC(fromYear, fromMonth - 1, fromDay); time <= end; time += DAY_MS) {
      keys.push(new Date(time).toISOString().slice(0, 10));
    }
    return keys;
  }
  const perYear = UNITS_PER_YEAR[granularity];
  const unitOf = (month: number) => Math.floor(((month - 1) * perYear) / 12);
  const end = toYear * perYear + unitOf(toMonth);
  for (let index = fromYear * perYear + unitOf(fromMonth); index <= end; index += 1) {
    const year = Math.floor(index / perYear);
    const unit = (index % perYear) + 1;
    keys.push(
      granularity === 'MONTH'
        ? `${year}-${pad2(unit)}`
        : granularity === 'QUARTER'
          ? `${year}-Q${unit}`
          : `${year}`,
    );
  }
  return keys;
}

function toPeriodLabels(
  key: string,
  granularity: Granularity,
): { label: string; fullLabel: string } {
  const [year, part, day] = key.split('-');
  switch (granularity) {
    case 'DAY':
      return { label: `${day}/${part}`, fullLabel: `${day}/${part}/${year}` };
    case 'MONTH':
      return { label: `${part}/${year}`, fullLabel: `Tháng ${Number(part)}/${year}` };
    case 'QUARTER':
      return { label: `${part}/${year}`, fullLabel: `Quý ${part?.slice(1)}/${year}` };
    default:
      return { label: key, fullLabel: `Năm ${key}` };
  }
}

/**
 * Backend chỉ trả kỳ có phát sinh. Điền kỳ trống bằng 0 để trục thời gian liên tục — không thì
 * vùng doanh thu nối thẳng qua những ngày không bán được gì, trông như có doanh thu.
 * Không có điểm nào thì trả mảng rỗng để thẻ hiện empty state thay vì đường phẳng 0.
 */
export function toRevenueSeries(
  series: readonly RevenuePointDto[],
  granularity: Granularity,
  range: ReportRange,
): RevenuePoint[] {
  if (series.length === 0) return [];
  const byKey = new Map(series.map((point) => [point.date, point]));
  const keys = new Set([...toPeriodKeys(range, granularity), ...byKey.keys()]);
  return [...keys]
    .sort((left, right) => left.localeCompare(right))
    .map((key) => {
      const point = byKey.get(key);
      return {
        key,
        ...toPeriodLabels(key, granularity),
        amount: point ? Number(point.netAmount) : 0,
        orders: point?.orderCount ?? 0,
      };
    });
}

/** Lát theo trạng thái; quá số màu thì gộp đuôi thành "Khác" để không lặp màu. */
export function toStatusSlices(rows: readonly OrderStatusCountDto[]): StatusSlice[] {
  const sorted = [...rows].sort((left, right) => right.count - left.count);
  const head = sorted.length > MAX_STATUS_SLICES ? sorted.slice(0, MAX_STATUS_SLICES - 1) : sorted;
  const rest = sorted.slice(head.length);
  const total = sorted.reduce((sum, row) => sum + row.count, 0);
  const entries = head.map((row) => ({
    key: row.status,
    // CONTRACT: OrderStatusCountDto.status là string thô ở domain reporting; giá trị thực luôn thuộc OrderStatus.
    name: orderStatusPresentation[row.status as OrderStatus]?.label ?? row.status,
    value: row.count,
  }));
  if (rest.length > 0) {
    entries.push({
      key: 'OTHER',
      name: 'Khác',
      value: rest.reduce((sum, row) => sum + row.count, 0),
    });
  }
  return entries.map((entry, index) => ({
    ...entry,
    color: CHART_COLORS[index],
    percentLabel: `${compactNumber.format(total > 0 ? (entry.value / total) * 100 : 0)}%`,
  }));
}

const compactNumber = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** Tiền rút gọn cho trục đồ thị: 1,2 tr · 3,4 tỷ. Tooltip và bảng vẫn dùng `formatMoney` đầy đủ. */
export function formatCompactMoney(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${compactNumber.format(value / 1e9)} tỷ`;
  if (abs >= 1e6) return `${compactNumber.format(value / 1e6)} tr`;
  if (abs >= 1e3) return `${compactNumber.format(value / 1e3)} k`;
  return compactNumber.format(value);
}

export function toScopeLabel(scopes: ReadonlyArray<{ type: string }> | undefined): string {
  if (scopes?.some((scope) => scope.type === 'GLOBAL')) return 'Toàn hệ thống';
  const branchScopeCount = scopes?.filter((scope) => scope.type === 'BRANCH').length;
  return `${branchScopeCount ?? 0} chi nhánh được phân quyền`;
}

export interface KpiSource<T> {
  allowed: boolean;
  data: T | undefined;
  state: Pick<ReportQueryState, 'isPending' | 'isError' | 'retry'>;
}

export interface KpiInput {
  /** Mức gom đang xem: doanh thu/dự thu tính trên khoảng của mức này, không cố định 30 ngày. */
  granularity: Granularity;
  revenue: KpiSource<RevenueReportDto>;
  overview: KpiSource<OverviewReportDto>;
  inventory: KpiSource<InventoryReportDto>;
}

const DENIED_HINT = {
  revenue: 'Cần quyền xem doanh thu',
  overview: 'Cần quyền xem vận hành',
  inventory: 'Cần quyền xem tồn kho',
} as const;

/**
 * Trạng thái mỗi KPI đi theo đúng endpoint sở hữu dữ liệu. Lỗi tải không được hiện thành 0: số 0
 * đọc như "không có đơn/không thiếu hàng", trong khi thực tế là chưa biết.
 */
function kpi<T>(
  source: KpiSource<T>,
  deniedHint: string,
  base: Pick<KpiCard, 'key' | 'label' | 'period' | 'tone'>,
  read: (data: T | undefined) => Pick<KpiCard, 'value' | 'hint'>,
): KpiCard {
  if (!source.allowed) return { ...base, value: '—', hint: deniedHint, status: 'denied' };
  if (source.state.isError) {
    return {
      ...base,
      value: '—',
      hint: 'Không tải được số liệu',
      status: 'error',
      retry: source.state.retry,
    };
  }
  if (source.state.isPending) return { ...base, value: '—', hint: '', status: 'loading' };
  return { ...base, ...read(source.data), status: 'ready' };
}

export function toKpiCards({ granularity, revenue, overview, inventory }: KpiInput): KpiCard[] {
  const revenuePeriod = PERIOD_DESCRIPTION[granularity];
  return [
    // Số chính là doanh thu thuần: hoàn tiền không đổi trạng thái đơn, nên con số gộp vẫn đếm cả
    // đơn đã hoàn toàn bộ.
    kpi(
      revenue,
      DENIED_HINT.revenue,
      { key: 'netRevenue', label: 'Doanh thu thuần', period: revenuePeriod, tone: 'brand' },
      (data) => ({
        value: formatMoney(data?.netRevenue ?? 0),
        hint: `${data?.completedOrderCount ?? 0} đơn hoàn tất · đã hoàn ${formatMoney(data?.refundedAmount ?? 0)}`,
      }),
    ),
    kpi(
      revenue,
      DENIED_HINT.revenue,
      { key: 'expectedRevenue', label: 'Dự thu', period: revenuePeriod, tone: 'violet' },
      (data) => ({
        value: formatMoney(data?.expectedRevenue ?? 0),
        hint: `${data?.expectedOrderCount ?? 0} đơn đã giao, chờ hoàn tất`,
      }),
    ),
    kpi(
      overview,
      DENIED_HINT.overview,
      { key: 'ordersToday', label: 'Đơn đặt hôm nay', period: 'Hôm nay', tone: 'blue' },
      (data) => ({
        value: String(data?.ordersToday ?? 0),
        hint: `${data?.ordersLast30Days ?? 0} đơn trong ${OVERVIEW_PERIOD}`,
      }),
    ),
    kpi(
      overview,
      DENIED_HINT.overview,
      { key: 'awaitingFulfillment', label: 'Đơn đang chờ giao', period: 'Hiện tại', tone: 'amber' },
      (data) => ({
        value: String(data?.ordersAwaitingFulfillment ?? 0),
        hint: `${data?.ordersCancelledLast30Days ?? 0} đơn huỷ trong ${OVERVIEW_PERIOD}`,
      }),
    ),
    // Backend đếm theo dòng tồn (SKU × kho); `lowStock` chỉ gồm dòng còn bán chạm/dưới ngưỡng, hết hàng tách riêng.
    kpi(
      inventory,
      DENIED_HINT.inventory,
      { key: 'lowStock', label: 'Tồn dưới ngưỡng', period: 'Hiện tại', tone: 'rose' },
      (data) => ({
        value: String(data?.lowStock ?? 0),
        hint: `Chưa gồm ${data?.outOfStock ?? 0} dòng tồn (SKU × kho) đã hết hàng`,
      }),
    ),
  ];
}
