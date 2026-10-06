import { useMemo, useState } from 'react';
import { useAuth } from '@/core/auth/auth-context';
import { useCan } from '@/core/auth/permissions';
import {
  useGetAdminReportInventory,
  useGetAdminReportOverview,
  useGetAdminReportRevenue,
  useGetAdminReportTopCustomers,
  useGetAdminReportTopProducts,
} from '@/generated/api/reporting/reporting';
import { TOP_LIST_LIMIT, type Granularity } from '../constants/dashboard.constants';
import {
  toKpiCards,
  toReportRange,
  toRevenueSeries,
  toScopeLabel,
  toStatusSlices,
  type ReportQueryState,
} from '../model/dashboard.mapper';

interface QueryLike {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}

function toQueryState(query: QueryLike): ReportQueryState {
  return {
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    retry: () => void query.refetch(),
  };
}

/** Gom quyền, khoảng thời gian, các truy vấn báo cáo và view model của Dashboard. */
export function useDashboardReport() {
  const auth = useAuth();
  // Doanh thu là số nhạy cảm: chỉ gọi khi tài khoản thực sự có quyền xem.
  // Mỗi widget gọi một endpoint có quyền riêng; gọi khi chưa có quyền chỉ tạo ra 403.
  const canSeeOperation = useCan('report.operation.view');
  const canSeeRevenue = useCan('report.revenue.view');
  const canSeeInventory = useCan('report.inventory.view');
  const canSeeOrders = useCan('order.view');
  const canSeeSystem = useCan('system.module.view');

  const [granularity, setGranularity] = useState<Granularity>('DAY');
  // Khoảng tính lại khi đổi mức gom; ghim theo ngày để không tạo query key mới mỗi lần render.
  const range = useMemo(() => toReportRange(granularity, new Date()), [granularity]);

  const overview = useGetAdminReportOverview({ query: { enabled: canSeeOperation } });
  const revenue = useGetAdminReportRevenue({ ...range, granularity }, { query: { enabled: canSeeRevenue } });
  const topCustomers = useGetAdminReportTopCustomers(
    { ...range, limit: TOP_LIST_LIMIT },
    { query: { enabled: canSeeRevenue } },
  );
  const inventory = useGetAdminReportInventory({ query: { enabled: canSeeInventory } });
  const topProducts = useGetAdminReportTopProducts(
    { ...range, limit: TOP_LIST_LIMIT },
    { query: { enabled: canSeeRevenue } },
  );

  const kpiCards = toKpiCards({
    canSeeRevenue,
    canSeeOperation,
    canSeeInventory,
    revenue: revenue.data,
    overview: overview.data,
    inventory: inventory.data,
    revenuePending: revenue.isPending,
    overviewPending: overview.isPending,
    inventoryPending: inventory.isPending,
  });
  const revenueSeries = useMemo(
    () => toRevenueSeries(revenue.data?.series ?? [], granularity),
    [revenue.data, granularity],
  );
  const statusSlices = useMemo(() => toStatusSlices(overview.data?.ordersByStatus ?? []), [overview.data]);

  return {
    permissions: { canSeeOperation, canSeeRevenue, canSeeInventory, canSeeOrders, canSeeSystem },
    displayName: auth.currentUser?.displayName ?? 'bạn',
    scopeLabel: toScopeLabel(auth.currentUser?.scopes),
    granularity,
    setGranularity,
    range,
    kpiCards,
    revenueSeries,
    statusSlices,
    branchRevenue: revenue.data?.byBranch ?? [],
    topCustomers: topCustomers.data?.items ?? [],
    topProducts: topProducts.data?.items ?? [],
    overviewState: toQueryState(overview),
    revenueState: toQueryState(revenue),
    topCustomersState: toQueryState(topCustomers),
    topProductsState: toQueryState(topProducts),
  };
}

export type DashboardReport = ReturnType<typeof useDashboardReport>;
