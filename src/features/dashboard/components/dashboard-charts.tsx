import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney } from '@/lib/format/money';
import { CHART_COLORS } from '../constants/dashboard.constants';
import { formatCompactMoney, type RevenuePoint, type StatusSlice } from '../model/dashboard.mapper';

/**
 * Ba biểu đồ của Dashboard, tách khỏi trang để `recharts` không nằm trong chunk của trang.
 *
 * Trang nạp module này qua `React.lazy` (`lazy-dashboard-charts.ts`), nên thẻ số liệu và bảng vẽ
 * được ngay mà không chờ thư viện đồ thị. Giữ cả ba trong một file vì chúng dùng chung cấu hình và
 * luôn xuất hiện trên cùng một trang — tách thành ba file chỉ thêm ba lượt tải mạng.
 * Màu lấy từ `CHART_COLORS` (constants) để chú giải HTML ngoài chunk này dùng đúng màu.
 */

const REVENUE_COLOR = CHART_COLORS[0];
const ORDERS_COLOR = CHART_COLORS[1];
const GRID_COLOR = '#eef2f6';
const AXIS_TICK = { fontSize: 12, fill: '#64748b' } as const;
const TOOLTIP_PROPS = {
  contentStyle: {
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
    fontSize: 13,
    padding: '8px 12px',
  },
  labelStyle: { color: '#0f172a', fontWeight: 600, marginBottom: 4 },
  cursor: { fill: 'rgba(15,23,42,0.04)', stroke: '#cbd5e1' },
} as const;

const X_AXIS_PROPS = {
  dataKey: 'label',
  tick: AXIS_TICK,
  axisLine: false,
  tickLine: false,
  minTickGap: 16,
} as const;
const Y_AXIS_PROPS = { tick: AXIS_TICK, axisLine: false, tickLine: false } as const;
const CHART_MARGIN = { top: 8, right: 8, left: 0, bottom: 0 } as const;

/** Tooltip đọc nhãn đầy đủ của kỳ (ngày/tháng/quý kèm năm) thay vì nhãn trục rút gọn. */
const fullLabelOf = (_label: unknown, payload: ReadonlyArray<{ payload?: RevenuePoint }>) =>
  payload[0]?.payload?.fullLabel ?? '';

export function RevenueAreaChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={CHART_MARGIN}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={REVENUE_COLOR} stopOpacity={0.24} />
            <stop offset="100%" stopColor={REVENUE_COLOR} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID_COLOR} />
        <XAxis {...X_AXIS_PROPS} />
        <YAxis {...Y_AXIS_PROPS} width={64} tickFormatter={formatCompactMoney} />
        <Tooltip
          {...TOOLTIP_PROPS}
          labelFormatter={fullLabelOf}
          formatter={(value) => [formatMoney(Number(value ?? 0)), 'Doanh thu thuần']}
        />
        {/* Một chuỗi duy nhất nên không cần chú giải: tiêu đề thẻ đã nói đây là doanh thu. */}
        <Area
          type="monotone"
          dataKey="amount"
          name="Doanh thu thuần"
          stroke={REVENUE_COLOR}
          strokeWidth={2}
          fill="url(#revenueFill)"
          activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Donut có tổng ở giữa; chú giải là danh sách HTML do thẻ cha dựng (kèm số và tỷ lệ). */
export function OrderStatusPieChart({ data, total }: { data: StatusSlice[]; total: number }) {
  return (
    <div className="relative h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={90}
            paddingAngle={2}
            // Khe 2px giữa các lát để hai màu cạnh nhau không dính thành một mảng.
            stroke="#fff"
            strokeWidth={2}
            animationDuration={600}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            {...TOOLTIP_PROPS}
            formatter={(value, name) => [`${Number(value ?? 0)} đơn`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div
        className="pointer-events-none absolute inset-0 grid place-items-center text-center"
        aria-hidden
      >
        <div>
          <div className="text-2xl font-bold tabular-nums leading-none text-slate-900">{total}</div>
          <div className="mt-1 text-xs text-slate-500">đơn</div>
        </div>
      </div>
    </div>
  );
}

export function CompletedOrdersBarChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barCategoryGap="28%" margin={CHART_MARGIN}>
        <CartesianGrid vertical={false} stroke={GRID_COLOR} />
        <XAxis {...X_AXIS_PROPS} />
        <YAxis {...Y_AXIS_PROPS} width={40} allowDecimals={false} />
        <Tooltip
          {...TOOLTIP_PROPS}
          labelFormatter={fullLabelOf}
          formatter={(value) => [`${Number(value ?? 0)} đơn`, 'Đã hoàn tất']}
        />
        {/* Đầu cột bo 4px và neo vào đường nền; một chuỗi nên không dựng chú giải. */}
        <Bar
          dataKey="orders"
          name="Đơn hoàn tất"
          fill={ORDERS_COLOR}
          radius={[4, 4, 0, 0]}
          maxBarSize={44}
          animationDuration={600}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
