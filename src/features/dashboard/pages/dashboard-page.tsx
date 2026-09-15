import {
  AlertOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { Alert, Card, Col, Empty, Row, Skeleton, Table, Tag, Typography } from 'antd';
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
import { getApiErrorMessage } from '@/lib/api/error';

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

const GRADIENTS = [
  { bg: 'from-emerald-500 to-teal-400', shadow: 'shadow-emerald-500/20' },
  { bg: 'from-blue-500 to-cyan-400', shadow: 'shadow-blue-500/20' },
  { bg: 'from-violet-500 to-purple-400', shadow: 'shadow-violet-500/20' },
  { bg: 'from-amber-500 to-orange-400', shadow: 'shadow-amber-500/20' },
];

export function DashboardPage() {
  const auth = useAuth();
  // Doanh thu là số nhạy cảm: chỉ gọi khi tài khoản thực sự có quyền xem.
  const canSeeRevenue = useCan('report.revenue.view');
  const canSeeInventory = useCan('report.inventory.view');

  const overview = useGetAdminReportOverview();
  const revenue = useGetAdminReportRevenue(undefined, { query: { enabled: canSeeRevenue } });
  const inventory = useGetAdminReportInventory({ query: { enabled: canSeeInventory } });
  const topProducts = useGetAdminReportTopProducts(
    { limit: 5 },
    { query: { enabled: canSeeRevenue } },
  );

  const statCards = [
    {
      label: 'Doanh thu đã thu (30 ngày)',
      value: canSeeRevenue ? money.format(Number(revenue.data?.totalRevenue ?? 0)) : '—',
      hint: canSeeRevenue
        ? `${revenue.data?.paidOrderCount ?? 0} đơn đã nhận được tiền`
        : 'Cần quyền xem doanh thu',
      icon: <DollarOutlined />,
    },
    {
      label: 'Đơn đặt hôm nay',
      value: overview.data?.ordersToday ?? 0,
      hint: `${overview.data?.ordersLast30Days ?? 0} đơn trong 30 ngày`,
      icon: <ShoppingCartOutlined />,
    },
    {
      label: 'Đơn đang chờ giao',
      value: overview.data?.ordersAwaitingFulfillment ?? 0,
      hint: `${overview.data?.ordersCancelledLast30Days ?? 0} đơn huỷ trong 30 ngày`,
      icon: <TruckOutlined />,
    },
    {
      label: 'Tồn dưới ngưỡng',
      value: canSeeInventory ? (inventory.data?.lowStock ?? 0) : '—',
      hint: canSeeInventory
        ? `${inventory.data?.outOfStock ?? 0} SKU đã hết hàng bán`
        : 'Cần quyền xem tồn kho',
      icon: <AlertOutlined />,
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
    <div className="space-y-8">
      <div>
        <Typography.Text className="!text-xs !font-semibold !uppercase !tracking-[0.16em] !text-slate-400">
          Bảo An Sport
        </Typography.Text>
        <Typography.Title level={3} className="!mb-0 !mt-1">
          Chào {auth.currentUser?.displayName ?? 'bạn'}
        </Typography.Title>
        <Typography.Text type="secondary" className="text-sm">
          Số liệu 30 ngày gần nhất, trong phạm vi chi nhánh bạn được phân quyền.
        </Typography.Text>
      </div>

      {overview.isError && (
        <Alert
          type="error"
          showIcon
          message="Không tải được số liệu vận hành"
          description={getApiErrorMessage(overview.error)}
        />
      )}

      <Row gutter={[16, 16]}>
        {statCards.map((card, index) => (
          <Col key={card.label} xs={24} sm={12} xl={6}>
            <Card className="!rounded-2xl !border-slate-100 !shadow-soft">
              {overview.isPending ? (
                <Skeleton active paragraph={{ rows: 1 }} />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-500">{card.label}</div>
                    <div className="mt-1 truncate text-2xl font-black text-slate-800">
                      {card.value}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{card.hint}</div>
                  </div>
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-lg text-white shadow-lg ${GRADIENTS[index % GRADIENTS.length]!.bg} ${GRADIENTS[index % GRADIENTS.length]!.shadow}`}
                  >
                    {card.icon}
                  </span>
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card
            className="!rounded-2xl !border-slate-100 !shadow-soft"
            title="Doanh thu đã thu theo ngày"
          >
            {!canSeeRevenue ? (
              <Empty description="Tài khoản của bạn không có quyền xem doanh thu" />
            ) : revenue.isPending ? (
              <Skeleton active />
            ) : revenueSeries.length === 0 ? (
              <Empty description="Chưa có đơn nào nhận được tiền trong 30 ngày qua" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(value: number) => `${Math.round(value / 1_000_000)}tr`}
                  />
                  <Tooltip formatter={(value) => money.format(Number(value ?? 0))} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    name="Doanh thu"
                    stroke="#059669"
                    fill="#05966922"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card className="!rounded-2xl !border-slate-100 !shadow-soft" title="Đơn theo trạng thái">
            {overview.isPending ? (
              <Skeleton active />
            ) : statusPie.length === 0 ? (
              <Empty description="Chưa có đơn nào trong 30 ngày qua" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" outerRadius={90} label>
                    {statusPie.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card className="!rounded-2xl !border-slate-100 !shadow-soft" title="Bán chạy 30 ngày">
            {!canSeeRevenue ? (
              <Empty description="Cần quyền xem doanh thu" />
            ) : (
              <Table
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

        <Col xs={24} xl={12}>
          <Card className="!rounded-2xl !border-slate-100 !shadow-soft" title="Cần nhập thêm hàng">
            {!canSeeInventory ? (
              <Empty description="Cần quyền xem tồn kho" />
            ) : (
              <Table
                rowKey={(row) => `${row.sku}-${row.warehouseName}`}
                size="small"
                pagination={false}
                loading={inventory.isPending}
                dataSource={inventory.data?.items ?? []}
                locale={{ emptyText: 'Không có SKU nào chạm ngưỡng đặt lại' }}
                columns={[
                  { title: 'SKU', dataIndex: 'sku', width: 130 },
                  { title: 'Kho', dataIndex: 'warehouseName', ellipsis: true },
                  {
                    title: 'Còn bán',
                    dataIndex: 'available',
                    width: 90,
                    align: 'right',
                    render: (value: number) => (
                      <Tag color={value <= 0 ? 'red' : 'orange'}>{value}</Tag>
                    ),
                  },
                  { title: 'Ngưỡng', dataIndex: 'reorderPoint', width: 80, align: 'right' },
                ]}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
