import { orderStatusPresentation } from '@/features/order-status';
import type { OrderStatus } from '@/generated/api/orders/orders.schemas';
import type {
  InventoryReportDto,
  OrderStatusCountDto,
  OverviewReportDto,
  RevenuePointDto,
  RevenueReportDto,
} from '@/generated/api/reporting/reporting.schemas';
import { formatMoney } from '@/lib/format/money';
import { LOOKBACK_DAYS, type Granularity } from '../constants/dashboard.constants';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReportRange {
  from: string;
  to: string;
}

export interface RevenuePoint {
  date: string;
  amount: number;
  orders: number;
}

export interface StatusSlice {
  name: string;
  value: number;
}

/** Trạng thái truy vấn rút gọn cho các khối trình bày; không mang DTO. */
export interface ReportQueryState {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  retry: () => void;
}

export type KpiKey = 'netRevenue' | 'expectedRevenue' | 'ordersToday' | 'awaitingFulfillment' | 'lowStock';
export type KpiTone = 'brand' | 'blue' | 'violet' | 'amber' | 'rose';

export interface KpiCard {
  key: KpiKey;
  label: string;
  value: string | number;
  hint: string;
  tone: KpiTone;
  loading: boolean;
}

export function toReportRange(granularity: Granularity, now: Date): ReportRange {
  const from = new Date(now.getTime() - LOOKBACK_DAYS[granularity] * DAY_MS);
  return { from: from.toISOString(), to: now.toISOString() };
}

export function toRevenueSeries(series: readonly RevenuePointDto[], granularity: Granularity): RevenuePoint[] {
  return series.map((point) => ({
    // Mức ngày cắt bớt năm cho đỡ chật trục; các mức còn lại giữ nguyên vì năm là thông tin thật.
    date: granularity === 'DAY' ? point.date.slice(5) : point.date,
    amount: Number(point.netAmount),
    orders: point.orderCount,
  }));
}

export function toStatusSlices(rows: readonly OrderStatusCountDto[]): StatusSlice[] {
  return rows.map((row) => ({
    // CONTRACT: OrderStatusCountDto.status là string thô ở domain reporting; giá trị thực luôn thuộc OrderStatus.
    name: orderStatusPresentation[row.status as OrderStatus]?.label ?? row.status,
    value: row.count,
  }));
}

export function toScopeLabel(scopes: ReadonlyArray<{ type: string }> | undefined): string {
  if (scopes?.some((scope) => scope.type === 'GLOBAL')) return 'Toàn hệ thống';
  const branchScopeCount = scopes?.filter((scope) => scope.type === 'BRANCH').length;
  return `${branchScopeCount ?? 0} chi nhánh được phân quyền`;
}

export interface KpiInput {
  canSeeRevenue: boolean;
  canSeeOperation: boolean;
  canSeeInventory: boolean;
  revenue: RevenueReportDto | undefined;
  overview: OverviewReportDto | undefined;
  inventory: InventoryReportDto | undefined;
  revenuePending: boolean;
  overviewPending: boolean;
  inventoryPending: boolean;
}

/** Loading của mỗi KPI đi theo đúng endpoint sở hữu dữ liệu. */
export function toKpiCards(input: KpiInput): KpiCard[] {
  const { canSeeRevenue, canSeeOperation, canSeeInventory, revenue, overview, inventory } = input;
  return [
    {
      key: 'netRevenue',
      // Số chính là doanh thu thuần: hoàn tiền không đổi trạng thái đơn, nên con số gộp vẫn đếm cả
      // đơn đã hoàn toàn bộ.
      label: 'Doanh thu thuần (30 ngày)',
      value: canSeeRevenue ? formatMoney(revenue?.netRevenue ?? 0) : '—',
      hint: canSeeRevenue
        ? `${revenue?.completedOrderCount ?? 0} đơn hoàn tất · đã hoàn ${formatMoney(revenue?.refundedAmount ?? 0)}`
        : 'Cần quyền xem doanh thu',
      tone: 'brand',
      loading: canSeeRevenue && input.revenuePending,
    },
    {
      key: 'expectedRevenue',
      label: 'Dự thu',
      value: canSeeRevenue ? formatMoney(revenue?.expectedRevenue ?? 0) : '—',
      hint: canSeeRevenue
        ? `${revenue?.expectedOrderCount ?? 0} đơn đã giao, chờ hoàn tất`
        : 'Cần quyền xem doanh thu',
      tone: 'violet',
      loading: canSeeRevenue && input.revenuePending,
    },
    {
      key: 'ordersToday',
      label: 'Đơn đặt hôm nay',
      value: canSeeOperation ? (overview?.ordersToday ?? 0) : '—',
      hint: canSeeOperation ? `${overview?.ordersLast30Days ?? 0} đơn trong 30 ngày` : 'Cần quyền xem vận hành',
      tone: 'blue',
      loading: canSeeOperation && input.overviewPending,
    },
    {
      key: 'awaitingFulfillment',
      label: 'Đơn đang chờ giao',
      value: canSeeOperation ? (overview?.ordersAwaitingFulfillment ?? 0) : '—',
      hint: canSeeOperation
        ? `${overview?.ordersCancelledLast30Days ?? 0} đơn huỷ trong 30 ngày`
        : 'Cần quyền xem vận hành',
      tone: 'amber',
      loading: canSeeOperation && input.overviewPending,
    },
    {
      key: 'lowStock',
      label: 'Tồn dưới ngưỡng',
      value: canSeeInventory ? (inventory?.lowStock ?? 0) : '—',
      hint: canSeeInventory ? `${inventory?.outOfStock ?? 0} SKU đã hết hàng bán` : 'Cần quyền xem tồn kho',
      tone: 'rose',
      loading: canSeeInventory && input.inventoryPending,
    },
  ];
}
