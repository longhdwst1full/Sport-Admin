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

/** `refetch` của TanStack Query ổn định giữa các render nên state chỉ đổi khi trạng thái thật đổi. */
export function useQueryState({ isPending, isError, error, refetch }: QueryLike): ReportQueryState {
  return useMemo(
    () => ({ isPending, isError, error, retry: () => void refetch() }),
    [isPending, isError, error, refetch],
  );
}

/** Gom quyền, khoảng thời gian, các truy vấn báo cáo và view model của Dashboard. */
export function useDashboardReport() {
  const auth = useAuth();
  // PERMISSION: mỗi widget gọi một endpoint có quyền riêng; gọi khi chưa có quyền chỉ tạo ra 403.
  const canSeeOperation = useCan('report.operation.view');
  const canSeeRevenue = useCan('report.revenue.view');
  const canSeeInventory = useCan('report.inventory.view');
  const canSeeOrders = useCan('order.view');
  const canSeeSystem = useCan('system.module.view');

  const [granularity, setGranularity] = useState<Granularity>('DAY');
  // Khoảng chỉ tính lại khi đổi mức gom, để không tạo query key mới mỗi lần render.
  const range = useMemo(() => toReportRange(granularity, new Date()), [granularity]);

  const overview = useGetAdminReportOverview({ query: { enabled: canSeeOperation } });
  const revenue = useGetAdminReportRevenue(
    { ...range, granularity },
    { query: { enabled: canSeeRevenue } },
  );
  const topCustomers = useGetAdminReportTopCustomers(
    { ...range, limit: TOP_LIST_LIMIT },
    { query: { enabled: canSeeRevenue } },
  );
  const inventory = useGetAdminReportInventory({ query: { enabled: canSeeInventory } });
  const topProducts = useGetAdminReportTopProducts(
    { ...range, limit: TOP_LIST_LIMIT },
    { query: { enabled: canSeeRevenue } },
  );

  const overviewState = useQueryState(overview);
  const revenueState = useQueryState(revenue);
  const inventoryState = useQueryState(inventory);
  const topCustomersState = useQueryState(topCustomers);
  const topProductsState = useQueryState(topProducts);

  const kpiCards = useMemo(
    () =>
      toKpiCards({
        granularity,
        revenue: { allowed: canSeeRevenue, data: revenue.data, state: revenueState },
        overview: { allowed: canSeeOperation, data: overview.data, state: overviewState },
        inventory: { allowed: canSeeInventory, data: inventory.data, state: inventoryState },
      }),
    [
      granularity,
      canSeeRevenue,
      canSeeOperation,
      canSeeInventory,
      revenue.data,
      overview.data,
      inventory.data,
      revenueState,
      overviewState,
      inventoryState,
    ],
  );
  const revenueSeries = useMemo(
    () => toRevenueSeries(revenue.data?.series ?? [], granularity, range),
    [revenue.data, granularity, range],
  );
  const statusSlices = useMemo(
    () => toStatusSlices(overview.data?.ordersByStatus ?? []),
    [overview.data],
  );

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
    overviewState,
    revenueState,
    topCustomersState,
    topProductsState,
  };
}
