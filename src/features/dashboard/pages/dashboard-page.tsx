import { Col, Row } from 'antd';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { BranchRevenueCard } from '../components/branch-revenue-card';
import { CompletedOrdersCard } from '../components/completed-orders-card';
import { DashboardHero } from '../components/dashboard-hero';
import { DashboardKpiSection } from '../components/dashboard-kpi-section';
import { JobHealthCard } from '../components/job-health-card';
import { OrderStatusCard } from '../components/order-status-card';
import { PendingOrdersCard } from '../components/pending-orders-card';
import { RevenueChartCard } from '../components/revenue-chart-card';
import { TOP_CUSTOMER_COLUMNS, TOP_PRODUCT_COLUMNS } from '../components/report-table-columns';
import { TopRankingCard } from '../components/top-ranking-card';
import { PERIOD_DESCRIPTION, REPORT_EXPORT_PATH } from '../constants/dashboard.constants';
import { useDashboardReport } from '../hooks/use-dashboard-report';

export function DashboardPage() {
  const report = useDashboardReport();
  const { canSeeOperation, canSeeRevenue, canSeeInventory, canSeeOrders, canSeeSystem } = report.permissions;
  const { granularity, range } = report;

  return (
    <div className="dctd-page-enter space-y-6 pb-4">
      <DashboardHero displayName={report.displayName} scopeLabel={report.scopeLabel} />

      {canSeeOperation && report.overviewState.isError && (
        <QueryErrorAlert
          message="Không tải được số liệu vận hành"
          error={report.overviewState.error}
          retry={report.overviewState.retry}
        />
      )}

      <DashboardKpiSection cards={report.kpiCards} />

      {canSeeOrders && <PendingOrdersCard />}

      {/* Tác vụ nền đặt ở màn đầu tiên: job chết từng im lặng hơn 12 giờ vì tín hiệu chỉ nằm trong audit_logs. */}
      {canSeeSystem && <JobHealthCard />}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <RevenueChartCard
            canSeeRevenue={canSeeRevenue}
            granularity={granularity}
            onGranularityChange={report.setGranularity}
            range={range}
            state={report.revenueState}
            series={report.revenueSeries}
          />
        </Col>
        <Col xs={24} xl={8}>
          <OrderStatusCard
            canSeeOperation={canSeeOperation}
            state={report.overviewState}
            slices={report.statusSlices}
          />
        </Col>
      </Row>

      {canSeeRevenue && report.branchRevenue.length > 0 && (
        <BranchRevenueCard
          canSeeRevenue={canSeeRevenue}
          canSeeInventory={canSeeInventory}
          granularity={granularity}
          range={range}
          rows={report.branchRevenue}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <CompletedOrdersCard
            canSeeRevenue={canSeeRevenue}
            granularity={granularity}
            state={report.revenueState}
            series={report.revenueSeries}
          />
        </Col>
        <Col xs={24} xl={10}>
          <TopRankingCard
            title="Khách mua nhiều nhất"
            description={`Theo tiền đã thực trả · ${PERIOD_DESCRIPTION[granularity]}`}
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
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <TopRankingCard
            title="Sản phẩm bán chạy"
            description={`Xếp theo số lượng bán · ${PERIOD_DESCRIPTION[granularity]}`}
            canSeeRevenue={canSeeRevenue}
            range={range}
            state={report.topProductsState}
            rows={report.topProducts}
            rowKey="sku"
            columns={TOP_PRODUCT_COLUMNS}
            emptyText="Chưa có sản phẩm nào bán được trong đơn đã thu tiền"
            exportPath={REPORT_EXPORT_PATH.topProducts}
            exportFilename="bao-cao-san-pham-ban-chay"
          />
        </Col>
      </Row>
    </div>
  );
}
