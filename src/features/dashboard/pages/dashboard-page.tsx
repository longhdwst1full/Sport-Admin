import {
  AlertOutlined,
  CalendarOutlined,
  DollarOutlined,
  GlobalOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { Alert, Card, Col, Empty, Row, Skeleton, Typography } from 'antd';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useCan } from '@/core/auth/permissions';
import { useAuth } from '@/core/auth/auth-context';
import {
  useGetAdminReportInventory,
  useGetAdminReportOverview,
  useGetAdminReportRevenue,
  useGetAdminReportTopProducts,
} from '@/generated/api/reporting/reporting';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { AdminTable } from '@/foundation/table';
import { getApiErrorMessage } from '@/lib/api/error';
import { DashboardStatCard } from '../components/dashboard-stat-card';
import { PendingOrdersCard } from '../components/pending-orders-card';

const CHART_COLORS = ['#059669', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

const money = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PICKING: 'Đang lấy hàng',
  PACKED: 'Đã đóng gói',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã huỷ',
};

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

  const overview = useGetAdminReportOverview({ query: { enabled: canSeeOperation } });
  const revenue = useGetAdminReportRevenue(undefined, { query: { enabled: canSeeRevenue } });
  const inventory = useGetAdminReportInventory({ query: { enabled: canSeeInventory } });
  const topProducts = useGetAdminReportTopProducts(
    { limit: 5 },
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
      label: 'Doanh thu đã hoàn tất (30 ngày)',
      value: canSeeRevenue ? money.format(Number(revenue.data?.completedRevenue ?? 0)) : '—',
      hint: canSeeRevenue
        ? `${revenue.data?.completedOrderCount ?? 0} đơn đã hoàn tất`
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
    date: point.date.slice(5),
    amount: Number(point.amount),
    orders: point.orderCount,
  }));

  const statusPie = (overview.data?.ordersByStatus ?? []).map((row) => ({
    name: ORDER_STATUS_LABELS[row.status] ?? row.status,
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
              khi đơn đã hoàn tất; đơn đã giao chờ hoàn tất được tính vào dự thu.
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
          {statCards.map((card) => (
            <DashboardStatCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      {canSeeOrders && <PendingOrdersCard />}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card
            className="h-full !rounded-2xl !border-slate-200/80 !shadow-card"
            title={
              <SectionTitle
                title="Doanh thu theo ngày hoàn tất"
                description="Chỉ ghi nhận đơn đã thu đủ tiền"
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
              <Empty description="Chưa có đơn nào hoàn tất trong 30 ngày qua" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueSeries}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis dataKey="date" fontSize={12} axisLine={false} tickLine={false} />
                  <YAxis
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: number) => `${Math.round(value / 1_000_000)}tr`}
                  />
                  <Tooltip
                    formatter={(value) => money.format(Number(value ?? 0))}
                    contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    name="Doanh thu"
                    stroke="#059669"
                    strokeWidth={3}
                    fill="url(#revenueFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {statusPie.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
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
            ]}
          />
        </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            className="h-full !rounded-2xl !border-slate-200/80 !shadow-card"
            title={
              <SectionTitle title="Sản phẩm bán chạy" description="Xếp theo doanh thu 30 ngày" />
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
