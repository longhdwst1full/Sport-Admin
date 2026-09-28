import {
  AlertOutlined,
  CalendarOutlined,
  DollarOutlined,
  GlobalOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { Alert, Card, Col, Empty, Row, Segmented, Skeleton, Typography } from 'antd';
import { lazy, Suspense, useMemo, useState } from 'react';
import { useCan } from '@/core/auth/permissions';
import { useAuth } from '@/core/auth/auth-context';
import {
  useGetAdminReportInventory,
  useGetAdminReportOverview,
  useGetAdminReportRevenue,
  useGetAdminReportTopCustomers,
  useGetAdminReportTopProducts,
} from '@/generated/api/reporting/reporting';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { AdminTable } from '@/foundation/table';
import { getApiErrorMessage } from '@/lib/api/error';
import { orderStatusPresentation } from '@/features/orders';
import type { OrderStatus } from '@/generated/api/orders/orders.schemas';
import { DashboardStatCard } from '../components/dashboard-stat-card';
import { JobHealthCard } from '../components/job-health-card';
import { PendingOrdersCard } from '../components/pending-orders-card';
import { ReportExportButton } from '../components/report-export-button';

// `recharts` nặng ~390 kB. Tách khỏi chunk của trang để thẻ số liệu và bảng phía trên vẽ được ngay;
// đồ thị tự tải sau và dùng đúng `Skeleton` như trạng thái đang tải dữ liệu nên không nhảy layout.
const RevenueAreaChart = lazy(() => import('../components/dashboard-charts')
  .then((module) => ({ default: module.RevenueAreaChart })));
const OrderStatusPieChart = lazy(() => import('../components/dashboard-charts')
  .then((module) => ({ default: module.OrderStatusPieChart })));
const CompletedOrdersBarChart = lazy(() => import('../components/dashboard-charts')
  .then((module) => ({ default: module.CompletedOrdersBarChart })));

const GRANULARITY_OPTIONS = [
  { value: 'DAY', label: 'Ngày' },
  { value: 'MONTH', label: 'Tháng' },
  { value: 'QUARTER', label: 'Quý' },
  { value: 'YEAR', label: 'Năm' },
] as const;

type Granularity = (typeof GRANULARITY_OPTIONS)[number]['value'];

/**
 * Khoảng thời gian mặc định theo mức gom.
 *
 * Backend mặc định 30 ngày gần nhất; gom theo quý hoặc năm trên 30 ngày chỉ cho đúng một cột, nên
 * mỗi mức tự nới khoảng đủ để biểu đồ có ý nghĩa.
 */
const LOOKBACK_DAYS: Record<Granularity, number> = {
  DAY: 30,
  MONTH: 365,
  QUARTER: 730,
  YEAR: 1826,
};

const PERIOD_DESCRIPTION: Record<Granularity, string> = {
  DAY: '30 ngày gần nhất',
  MONTH: '12 tháng gần nhất',
  QUARTER: '8 quý gần nhất',
  YEAR: '5 năm gần nhất',
};

const money = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const todayLabel = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
}).format(new Date());

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <div className="text-base font-bold text-slate-900">{title}</div>
      <div className="mt-0.5 text-xs font-normal text-slate-500">{description}</div>
    </div>
  );
}

export function DashboardPage() {
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
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - LOOKBACK_DAYS[granularity] * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [granularity]);

  const overview = useGetAdminReportOverview({ query: { enabled: canSeeOperation } });
  const revenue = useGetAdminReportRevenue(
    { ...range, granularity },
    { query: { enabled: canSeeRevenue } },
  );
  const topCustomers = useGetAdminReportTopCustomers(
    { ...range, limit: 5 },
    { query: { enabled: canSeeRevenue } },
  );
  const inventory = useGetAdminReportInventory({ query: { enabled: canSeeInventory } });
  const topProducts = useGetAdminReportTopProducts(
    { ...range, limit: 5 },
    { query: { enabled: canSeeRevenue } },
  );

  const hasGlobalScope = auth.currentUser?.scopes.some((scope) => scope.type === 'GLOBAL');
  const branchScopeCount = auth.currentUser?.scopes.filter(
    (scope) => scope.type === 'BRANCH',
  ).length;
  const scopeLabel = hasGlobalScope
    ? 'Toàn hệ thống'
    : `${branchScopeCount ?? 0} chi nhánh được phân quyền`;

  const statCards = [
    {
      // Số chính là doanh thu thuần: hoàn tiền không đổi trạng thái đơn, nên con số gộp vẫn đếm cả
      // đơn đã hoàn toàn bộ.
      label: 'Doanh thu thuần (30 ngày)',
      value: canSeeRevenue ? money.format(Number(revenue.data?.netRevenue ?? 0)) : '—',
      hint: canSeeRevenue
        ? `${revenue.data?.completedOrderCount ?? 0} đơn hoàn tất · đã hoàn ${money.format(Number(revenue.data?.refundedAmount ?? 0))}`
        : 'Cần quyền xem doanh thu',
      icon: <DollarOutlined />,
      tone: 'brand' as const,
      loading: canSeeRevenue && revenue.isPending,
    },
    {
      label: 'Dự thu',
      value: canSeeRevenue ? money.format(Number(revenue.data?.expectedRevenue ?? 0)) : '—',
      hint: canSeeRevenue
        ? `${revenue.data?.expectedOrderCount ?? 0} đơn đã giao, chờ hoàn tất`
        : 'Cần quyền xem doanh thu',
      icon: <DollarOutlined />,
      tone: 'violet' as const,
      loading: canSeeRevenue && revenue.isPending,
    },
    {
      label: 'Đơn đặt hôm nay',
      value: canSeeOperation ? (overview.data?.ordersToday ?? 0) : '—',
      hint: canSeeOperation
        ? `${overview.data?.ordersLast30Days ?? 0} đơn trong 30 ngày`
        : 'Cần quyền xem vận hành',
      icon: <ShoppingCartOutlined />,
      tone: 'blue' as const,
      loading: canSeeOperation && overview.isPending,
    },
    {
      label: 'Đơn đang chờ giao',
      value: canSeeOperation ? (overview.data?.ordersAwaitingFulfillment ?? 0) : '—',
      hint: canSeeOperation
        ? `${overview.data?.ordersCancelledLast30Days ?? 0} đơn huỷ trong 30 ngày`
        : 'Cần quyền xem vận hành',
      icon: <TruckOutlined />,
      tone: 'amber' as const,
      loading: canSeeOperation && overview.isPending,
    },
    {
      label: 'Tồn dưới ngưỡng',
      value: canSeeInventory ? (inventory.data?.lowStock ?? 0) : '—',
      hint: canSeeInventory
        ? `${inventory.data?.outOfStock ?? 0} SKU đã hết hàng bán`
        : 'Cần quyền xem tồn kho',
      icon: <AlertOutlined />,
      tone: 'rose' as const,
      loading: canSeeInventory && inventory.isPending,
    },
  ];

  const revenueSeries = (revenue.data?.series ?? []).map((point) => ({
    // Mức ngày cắt bớt năm cho đỡ chật trục; các mức còn lại giữ nguyên vì năm là thông tin thật.
    date: granularity === 'DAY' ? point.date.slice(5) : point.date,
    amount: Number(point.netAmount),
    orders: point.orderCount,
  }));

  const statusPie = (overview.data?.ordersByStatus ?? []).map((row) => ({
    // CONTRACT: OrderStatusCountDto.status là string thô ở domain reporting; giá trị thực luôn thuộc OrderStatus.
    name: orderStatusPresentation[row.status as OrderStatus]?.label ?? row.status,
    value: row.count,
  }));

  return (
    <div className="dctd-page-enter space-y-6 pb-4">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-admin-950 via-admin-800 to-admin-600 px-5 py-6 text-white shadow-lg shadow-admin-900/10 sm:px-7 sm:py-7">
        <div
          className="absolute -right-16 -top-24 size-64 rounded-full border-[44px] border-white/5"
          aria-hidden
        />
        <div
          className="absolute -bottom-24 right-1/4 size-52 rounded-full bg-emerald-300/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/80">
              <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_0_5px_rgba(110,231,183,0.12)]" />
              Bảo An Sport · Trung tâm vận hành
            </div>
            <Typography.Title level={2} className="!mb-2 !text-white">
              Chào {auth.currentUser?.displayName ?? 'bạn'}
            </Typography.Title>
            <p className="mb-0 max-w-2xl text-sm leading-6 text-emerald-50/80">
              Theo dõi doanh thu, đơn hàng và tồn kho trong 30 ngày gần nhất. Doanh thu chỉ ghi nhận
              khi đơn đã hoàn tất và đã trừ tiền hoàn cho khách; đơn đã giao chờ hoàn tất được tính vào dự thu.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm">
              <CalendarOutlined />
              <span className="capitalize">{todayLabel}</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm">
              <GlobalOutlined />
              {scopeLabel}
            </span>
          </div>
        </div>
      </section>

      {canSeeOperation && overview.isError && (
        <Alert
          type="error"
          showIcon
          message="Không tải được số liệu vận hành"
          description={getApiErrorMessage(overview.error)}
        />
      )}

      <section aria-labelledby="dashboard-summary-title">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id="dashboard-summary-title" className="m-0 text-lg font-bold text-slate-950">
            Tổng quan hôm nay
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card, index) => (
            <div
              key={card.label}
              className="dctd-card-enter"
              // Thẻ hiện lần lượt thay vì bật cùng lúc; đủ nhanh để không thành thời gian chờ.
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <DashboardStatCard {...card} />
            </div>
          ))}
        </div>
      </section>

      {canSeeOrders && <PendingOrdersCard />}

      {/* Tác vụ nền đặt ở màn đầu tiên: job chết từng im lặng hơn 12 giờ vì tín hiệu chỉ nằm trong audit_logs. */}
      {canSeeSystem && <JobHealthCard />}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card
            className="h-full !rounded-2xl !border-slate-200/80 !shadow-card"
            title={
              <SectionTitle
                title="Doanh thu thuần theo kỳ"
                description={`Đơn hoàn tất trừ tiền đã hoàn trong kỳ · ${PERIOD_DESCRIPTION[granularity]}`}
              />
            }
            extra={
              <div className="flex items-center gap-2">
                <Segmented
                  size="small"
                  value={granularity}
                  options={[...GRANULARITY_OPTIONS]}
                  onChange={(value) => setGranularity(value as Granularity)}
                />
                {/* File tải về dùng đúng khoảng và mức gom đang xem trên màn hình. */}
                <ReportExportButton
                  path="/api/v1/admin/reports/revenue/export"
                  params={{ ...range, granularity }}
                  fallbackFilename="bao-cao-doanh-thu"
                  disabled={!canSeeRevenue}
                />
              </div>
            }
          >
            {!canSeeRevenue ? (
              <Empty description="Tài khoản của bạn không có quyền xem doanh thu" />
            ) : revenue.isError ? (
              <QueryErrorAlert error={revenue.error} retry={() => void revenue.refetch()} />
            ) : revenue.isPending ? (
              <Skeleton active />
            ) : revenueSeries.length === 0 ? (
              <Empty description={`Chưa có đơn nào hoàn tất trong ${PERIOD_DESCRIPTION[granularity]}`} />
            ) : (
              <Suspense fallback={<Skeleton active />}>
                <RevenueAreaChart data={revenueSeries} money={money} />
              </Suspense>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            className="h-full !rounded-2xl !border-slate-200/80 !shadow-card"
            title={
              <SectionTitle
                title="Đơn theo trạng thái"
                description="Phân bổ đơn hàng trong 30 ngày"
              />
            }
          >
            {!canSeeOperation ? (
              <Empty description="Tài khoản của bạn không có quyền xem vận hành" />
            ) : overview.isError ? (
              <QueryErrorAlert error={overview.error} retry={() => void overview.refetch()} />
            ) : overview.isPending ? (
              <Skeleton active />
            ) : statusPie.length === 0 ? (
              <Empty description="Chưa có đơn nào trong 30 ngày qua" />
            ) : (
              <Suspense fallback={<Skeleton active />}>
                <OrderStatusPieChart data={statusPie} />
              </Suspense>
            )}
          </Card>
        </Col>
      </Row>

      {canSeeRevenue && (revenue.data?.byBranch.length ?? 0) > 0 && (
        <Card
          className="!rounded-2xl !border-slate-200/80 !shadow-card"
          title={
            <SectionTitle
              title="Hiệu quả theo chi nhánh"
              description="Doanh thu thực nhận và dự thu"
            />
          }
          extra={
            <div className="flex items-center gap-2">
              <ReportExportButton
                path="/api/v1/admin/reports/revenue/by-branch/export"
                params={{ ...range, granularity }}
                fallbackFilename="bao-cao-doanh-thu-chi-nhanh"
                disabled={!canSeeRevenue}
                label="Tải"
              />
              {/* Báo cáo tồn kho là danh sách CẦN NHẬP (chạm ngưỡng đặt lại), không phải toàn bộ
                  tồn — nhãn phải nói đúng thứ sẽ tải về. */}
              <ReportExportButton
                path="/api/v1/admin/reports/inventory/export"
                params={{}}
                fallbackFilename="bao-cao-ton-kho"
                disabled={!canSeeInventory}
                label="Tải hàng cần nhập"
              />
            </div>
          }
        >
          <AdminTable
            rowKey="branchName"
            size="small"
            pagination={false}
            dataSource={revenue.data?.byBranch ?? []}
            columns={[
              { title: 'Chi nhánh', dataIndex: 'branchName' },
              {
                title: 'Đã hoàn tất',
                dataIndex: 'completedRevenue',
                align: 'right',
                render: (value: string) => money.format(Number(value)),
              },
              { title: 'Số đơn', dataIndex: 'completedOrderCount', width: 90, align: 'right' },
              {
                title: 'Dự thu',
                dataIndex: 'expectedRevenue',
                align: 'right',
                render: (value: string) => (
                  <span className="text-slate-500">{money.format(Number(value))}</span>
                ),
              },
              {
                title: 'Đã hoàn tiền',
                dataIndex: 'refundedAmount',
                align: 'right',
                render: (value: string) => (
                  <span className={Number(value) > 0 ? 'text-rose-600' : 'text-slate-400'}>
                    {money.format(Number(value))}
                  </span>
                ),
              },
              {
                title: 'Thuần',
                dataIndex: 'netRevenue',
                align: 'right',
                render: (value: string) => <span className="font-semibold">{money.format(Number(value))}</span>,
              },
            ]}
          />
        </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            className="h-full !rounded-2xl !border-slate-200/80 !shadow-card"
            title={
              <SectionTitle
                title="Số đơn hoàn tất theo kỳ"
                description={`Cùng khoảng và mức gom với biểu đồ doanh thu · ${PERIOD_DESCRIPTION[granularity]}`}
              />
            }
          >
            {!canSeeRevenue ? (
              <Empty description="Tài khoản của bạn không có quyền xem doanh thu" />
            ) : revenue.isError ? (
              <QueryErrorAlert error={revenue.error} retry={() => void revenue.refetch()} />
            ) : revenue.isPending ? (
              <Skeleton active />
            ) : revenueSeries.length === 0 ? (
              <Empty description="Chưa có đơn nào hoàn tất trong khoảng này" />
            ) : (
              <Suspense fallback={<Skeleton active />}>
                <CompletedOrdersBarChart data={revenueSeries} />
              </Suspense>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            className="h-full !rounded-2xl !border-slate-200/80 !shadow-card"
            title={
              <SectionTitle
                title="Khách mua nhiều nhất"
                description={`Theo tiền đã thực trả · ${PERIOD_DESCRIPTION[granularity]}`}
              />
            }
            extra={
              // Màn hình chỉ hiện 5 khách; file tải về là toàn bộ danh sách của khoảng đang xem.
              <ReportExportButton
                path="/api/v1/admin/reports/top-customers/export"
                params={{ ...range, limit: 50 }}
                fallbackFilename="bao-cao-khach-mua-nhieu"
                disabled={!canSeeRevenue}
                label="Tải"
              />
            }
          >
            {!canSeeRevenue ? (
              <Empty description="Cần quyền xem doanh thu" />
            ) : topCustomers.isError ? (
              <QueryErrorAlert
                error={topCustomers.error}
                retry={() => void topCustomers.refetch()}
              />
            ) : (
              <AdminTable
                rowKey="customerNo"
                size="small"
                pagination={false}
                loading={topCustomers.isPending}
                dataSource={topCustomers.data?.items ?? []}
                locale={{ emptyText: 'Chưa có khách nào hoàn tất đơn trong khoảng này' }}
                columns={[
                  {
                    title: 'Khách hàng',
                    dataIndex: 'name',
                    ellipsis: true,
                    render: (value: string, row: { customerNo: string }) => (
                      <div>
                        <div className="font-semibold text-slate-800">{value}</div>
                        <div className="font-mono text-xs text-slate-500">{row.customerNo}</div>
                      </div>
                    ),
                  },
                  { title: 'Số đơn', dataIndex: 'orderCount', width: 80, align: 'right' },
                  {
                    title: 'Đã chi',
                    dataIndex: 'revenue',
                    width: 140,
                    align: 'right',
                    render: (value: string) => (
                      <span className="font-semibold text-emerald-700">
                        {money.format(Number(value))}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            className="h-full !rounded-2xl !border-slate-200/80 !shadow-card"
            title={
              <SectionTitle
                title="Sản phẩm bán chạy"
                description={`Xếp theo số lượng bán · ${PERIOD_DESCRIPTION[granularity]}`}
              />
            }
            extra={
              <ReportExportButton
                path="/api/v1/admin/reports/top-products/export"
                params={{ ...range, limit: 50 }}
                fallbackFilename="bao-cao-san-pham-ban-chay"
                disabled={!canSeeRevenue}
                label="Tải"
              />
            }
          >
            {!canSeeRevenue ? (
              <Empty description="Cần quyền xem doanh thu" />
            ) : topProducts.isError ? (
              <QueryErrorAlert error={topProducts.error} retry={() => void topProducts.refetch()} />
            ) : (
              <AdminTable
                rowKey="sku"
                size="small"
                pagination={false}
                loading={topProducts.isPending}
                dataSource={topProducts.data?.items ?? []}
                locale={{
                  emptyText: 'Chưa có sản phẩm nào bán được trong đơn đã thu tiền',
                }}
                columns={[
                  { title: 'SKU', dataIndex: 'sku', width: 130 },
                  { title: 'Sản phẩm', dataIndex: 'productName', ellipsis: true },
                  { title: 'SL', dataIndex: 'quantitySold', width: 70, align: 'right' },
                  {
                    title: 'Doanh thu',
                    dataIndex: 'revenue',
                    width: 130,
                    align: 'right',
                    render: (value: string) => money.format(Number(value)),
                  },
                ]}
              />
            )}
          </Card>
        </Col>

      </Row>
    </div>
  );
}
