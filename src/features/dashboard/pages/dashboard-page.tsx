import { BranchRevenueCard } from '../components/branch-revenue-card';
import { DashboardHero } from '../components/dashboard-hero';
import { DashboardKpiSection } from '../components/dashboard-kpi-section';
import { JobHealthCard } from '../components/job-health-card';
import { OrderStatusCard } from '../components/order-status-card';
import { PendingOrdersCard } from '../components/pending-orders-card';
import { RevenueSeriesCard } from '../components/revenue-series-card';
import { TOP_CUSTOMER_COLUMNS, TOP_PRODUCT_COLUMNS } from '../components/report-table-columns';
import { TopRankingCard } from '../components/top-ranking-card';
import { PERIOD_DESCRIPTION, REPORT_EXPORT_PATH } from '../constants/dashboard.constants';
import { useDashboardReport } from '../hooks/use-dashboard-report';

export function DashboardPage() {
  const report = useDashboardReport();
  const { canSeeOperation, canSeeRevenue, canSeeInventory, canSeeOrders, canSeeSystem } =
    report.permissions;
  const { granularity, range, revenueState } = report;
  const period = PERIOD_DESCRIPTION[granularity];
  // Lỗi đã hiện ở thẻ doanh thu cùng nguồn; chỉ ẩn bảng chi nhánh khi chắc chắn không có dòng nào.
  const showBranchRevenue =
    canSeeRevenue && !revenueState.isError && (revenueState.isPending || report.branchRevenue.length > 0);

  return (
    <div className="dctd-page-enter space-y-6 pb-4">
      <DashboardHero
        displayName={report.displayName}
        scopeLabel={report.scopeLabel}
        granularity={granularity}
        onGranularityChange={report.setGranularity}
      />

      {/* Lỗi từng nguồn hiện ngay trên thẻ KPI và thẻ biểu đồ tương ứng, không dồn thành một banner. */}
      <DashboardKpiSection cards={report.kpiCards} canSeeInventory={canSeeInventory} />

      {(canSeeOrders || canSeeSystem) && (
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-5">
          {canSeeOrders && (
            <div className={canSeeSystem ? 'min-w-0 2xl:col-span-3' : 'min-w-0 2xl:col-span-5'}>
              <PendingOrdersCard />
            </div>
          )}
          {/* Tác vụ nền đặt ở màn đầu tiên: job chết từng im lặng hơn 12 giờ vì tín hiệu chỉ nằm trong audit_logs. */}
          {canSeeSystem && (
            <div className={canSeeOrders ? 'min-w-0 2xl:col-span-2' : 'min-w-0 2xl:col-span-5'}>
              <JobHealthCard />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0 md:col-span-2">
          <RevenueSeriesCard
            metric="amount"
            canSeeRevenue={canSeeRevenue}
            granularity={granularity}
            range={range}
            state={revenueState}
            series={report.revenueSeries}
          />
        </div>
        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          <OrderStatusCard
            canSeeOperation={canSeeOperation}
            state={report.overviewState}
            slices={report.statusSlices}
          />
        </div>
      </div>

      {/* UX: bảng chi nhánh đứng cạnh top khách thay vì trải hết chiều ngang; không có thì top khách giãn đủ hàng. */}
      {/* Thẻ cùng hàng cao bằng nhau (grid stretch + DashboardCard h-full); bảng chi nhánh tự cuộn khi nhiều dòng. */}
      <div className="grid grid-cols-1 gap-4 xl:auto-rows-[minmax(360px,auto)] xl:grid-cols-12">
        {showBranchRevenue && (
          <div className="min-w-0 xl:col-span-7">
            <BranchRevenueCard
              granularity={granularity}
              range={range}
              state={revenueState}
              rows={report.branchRevenue}
            />
          </div>
        )}
        <div className={showBranchRevenue ? 'min-w-0 xl:col-span-5' : 'min-w-0 xl:col-span-12'}>
          <TopRankingCard
            title="Khách mua nhiều nhất"
            description={`Theo tổng giá trị đơn hoàn tất · ${period}`}
            canSeeRevenue={canSeeRevenue}
            range={range}
            state={report.topCustomersState}
            rows={report.topCustomers}
            rowKey="customerNo"
            columns={TOP_CUSTOMER_COLUMNS}
            emptyText="Chưa có khách nào hoàn tất đơn trong khoảng này"
            exportPath={REPORT_EXPORT_PATH.topCustomers}
            exportFilename="bao-cao-khach-mua-nhieu"
          />
        </div>
        <div className="min-w-0 xl:col-span-7">
          <RevenueSeriesCard
            metric="orders"
            range={range}
            canSeeRevenue={canSeeRevenue}
            granularity={granularity}
            state={revenueState}
            series={report.revenueSeries}
          />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <TopRankingCard
            title="Sản phẩm bán chạy"
            description={`Xếp theo số lượng bán trong đơn hoàn tất · ${period}`}
            canSeeRevenue={canSeeRevenue}
            range={range}
            state={report.topProductsState}
            rows={report.topProducts}
            rowKey="sku"
            columns={TOP_PRODUCT_COLUMNS}
            emptyText="Chưa có sản phẩm nào bán được trong đơn hoàn tất"
            exportPath={REPORT_EXPORT_PATH.topProducts}
            exportFilename="bao-cao-san-pham-ban-chay"
          />
        </div>
      </div>
    </div>
  );
}
