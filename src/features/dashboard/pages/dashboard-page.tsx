import { Alert, Col, Row } from 'antd';
import { getApiErrorMessage } from '@/lib/api/error';
import { BranchRevenueCard } from '../components/branch-revenue-card';
import { CompletedOrdersCard } from '../components/completed-orders-card';
import { DashboardHero } from '../components/dashboard-hero';
import { DashboardKpiSection } from '../components/dashboard-kpi-section';
import { JobHealthCard } from '../components/job-health-card';
import { OrderStatusCard } from '../components/order-status-card';
import { PendingOrdersCard } from '../components/pending-orders-card';
import { RevenueChartCard } from '../components/revenue-chart-card';
import { TopCustomersCard } from '../components/top-customers-card';
import { TopProductsCard } from '../components/top-products-card';
import { useDashboardReport } from '../hooks/use-dashboard-report';

export function DashboardPage() {
  const report = useDashboardReport();
  const { canSeeOperation, canSeeRevenue, canSeeInventory, canSeeOrders, canSeeSystem } = report.permissions;
  const { granularity, range } = report;

  return (
    <div className="dctd-page-enter space-y-6 pb-4">
      <DashboardHero displayName={report.displayName} scopeLabel={report.scopeLabel} />

      {canSeeOperation && report.overviewState.isError && (
        <Alert
          type="error"
          showIcon
          message="Không tải được số liệu vận hành"
          description={getApiErrorMessage(report.overviewState.error)}
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
          <TopCustomersCard
            canSeeRevenue={canSeeRevenue}
            granularity={granularity}
            range={range}
            state={report.topCustomersState}
            rows={report.topCustomers}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <TopProductsCard
            canSeeRevenue={canSeeRevenue}
            granularity={granularity}
            range={range}
            state={report.topProductsState}
            rows={report.topProducts}
          />
        </Col>
      </Row>
    </div>
  );
}
