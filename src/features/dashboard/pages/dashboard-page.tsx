import {
  AppstoreOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Skeleton, Typography } from 'antd';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
import { useListSystemModules } from '@/generated/api/system/system';
import { SystemModuleList } from '../components/system-module-list';
import { useAuth } from '@/core/auth/auth-context';

const CHART_COLORS = ['#059669', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

const GRADIENT_ICONS = [
  { bg: 'from-blue-500 to-cyan-400', shadow: 'shadow-blue-500/20' },
  { bg: 'from-emerald-500 to-teal-400', shadow: 'shadow-emerald-500/20' },
  { bg: 'from-violet-500 to-purple-400', shadow: 'shadow-violet-500/20' },
  { bg: 'from-amber-500 to-orange-400', shadow: 'shadow-amber-500/20' },
];

export function DashboardPage() {
  const auth = useAuth();
  const query = useListSystemModules();
  const data = query.data;
  const active = data?.items.filter((item) => item.status === 'ACTIVE').length ?? 0;
  const total = data?.items.length ?? 0;
  const percent = total ? Math.round((active / total) * 100) : 0;

  const greeting = getGreeting();
  const displayName = auth.currentUser?.displayName ?? 'Admin';

  const statCards = [
    {
      label: 'Model đã rà soát',
      value: data?.totalModels ?? 0,
      icon: <DatabaseOutlined />,
      trend: '+12%',
      trendUp: true,
    },
    {
      label: 'Bảng ưu tiên P0',
      value: data?.p0Models ?? 0,
      icon: <RocketOutlined />,
      trend: 'core',
      trendUp: true,
    },
    {
      label: 'Bảng ưu tiên P1',
      value: data?.p1Models ?? 0,
      icon: <AppstoreOutlined />,
      trend: 'extended',
      trendUp: true,
    },
    {
      label: 'Module có API',
      value: active,
      icon: <CheckCircleOutlined />,
      trend: `${percent}%`,
      trendUp: percent > 50,
    },
  ];

  const chartData = (data?.items ?? []).map((item) => ({
    name: item.name,
    P0: item.p0Count,
    P1: item.p1Count,
    total: item.p0Count + item.p1Count,
  }));

  const pieData = [
    { name: 'Đã có API', value: active },
    { name: 'Đã scaffold', value: total - active },
  ];

  return (
    <div className="space-y-8">
      {/* ── Greeting ───────────────────────────────────────── */}
      <div className="animate-fade-in-up">
        <Typography.Text className="!text-xs !font-semibold !uppercase !tracking-[0.16em] !text-slate-400">
          DCTD Commerce V1
        </Typography.Text>
        <Typography.Title level={2} className="!mb-1 !mt-1">
          {greeting}, {displayName} 👋
        </Typography.Title>
        <Typography.Text type="secondary">
          Theo dõi tổng quan hệ thống và tiến độ phát triển bounded context
        </Typography.Text>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────── */}
      <Row gutter={[20, 20]}>
        {statCards.map((card, index) => (
          <Col xs={24} sm={12} xl={6} key={card.label}>
            {query.isPending ? (
              <Card className="!rounded-2xl">
                <Skeleton active paragraph={{ rows: 1 }} />
              </Card>
            ) : (
              <Card
                className="dctd-metric-card !rounded-2xl !border-slate-100"
                style={{
                  '--metric-accent': CHART_COLORS[index],
                } as React.CSSProperties}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-500">
                      {card.label}
                    </div>
                    <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900 animate-fade-in">
                      {card.value}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          card.trendUp
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {card.trendUp && '↑ '}
                        {card.trend}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${GRADIENT_ICONS[index].bg} ${GRADIENT_ICONS[index].shadow} text-lg text-white shadow-lg`}
                  >
                    {card.icon}
                  </span>
                </div>
              </Card>
            )}
          </Col>
        ))}
      </Row>

      {/* ── Charts Row ─────────────────────────────────────── */}
      <Row gutter={[20, 20]}>
        {/* Area Chart */}
        <Col xs={24} xl={16}>
          <Card
            className="!rounded-2xl"
            title={
              <div className="flex items-center gap-2">
                <span className="inline-block size-2 rounded-full bg-admin-500" />
                <span>Phân bổ model theo module</span>
              </div>
            }
            loading={query.isPending}
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ left: 0, right: 12, top: 8, bottom: 28 }}
                >
                  <defs>
                    <linearGradient id="gradP0" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradP1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    angle={-20}
                    textAnchor="end"
                    height={64}
                    interval={0}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 4px 20px rgb(0 0 0 / 0.08)',
                      fontSize: 13,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="P0"
                    stroke="#059669"
                    strokeWidth={2}
                    fill="url(#gradP0)"
                    dot={{ r: 3, fill: '#059669' }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="P1"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#gradP1)"
                    dot={{ r: 3, fill: '#8b5cf6' }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Donut Chart */}
        <Col xs={24} xl={8}>
          <Card
            className="!rounded-2xl"
            title={
              <div className="flex items-center gap-2">
                <span className="inline-block size-2 rounded-full bg-sky-500" />
                <span>Tiến độ tổng thể</span>
              </div>
            }
            loading={query.isPending}
          >
            <div className="flex h-80 flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={index === 0 ? '#059669' : '#e2e8f0'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 4px 20px rgb(0 0 0 / 0.08)',
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center">
                <div className="text-4xl font-bold text-slate-900">{percent}%</div>
                <div className="mt-1 text-sm text-slate-500">
                  {active}/{total} modules active
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Module Bar Chart ───────────────────────────────── */}
      <Card
        className="!rounded-2xl"
        title={
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-violet-500" />
            <span>Chi tiết theo module</span>
          </div>
        }
        loading={query.isPending}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 28 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                angle={-20}
                textAnchor="end"
                height={64}
                interval={0}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 4px 20px rgb(0 0 0 / 0.08)',
                  fontSize: 13,
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} iconType="circle" />
              <Bar dataKey="P0" fill="#059669" radius={[6, 6, 0, 0]} />
              <Bar dataKey="P1" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── Module List ────────────────────────────────────── */}
      <Card
        className="!rounded-2xl"
        title={
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-amber-500" />
            <span>Bounded contexts</span>
          </div>
        }
        loading={query.isPending}
      >
        <div className="overflow-x-auto">
          <SystemModuleList items={data?.items ?? []} />
        </div>
      </Card>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}
