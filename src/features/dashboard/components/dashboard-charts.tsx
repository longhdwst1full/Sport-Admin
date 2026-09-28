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

/**
 * Ba biểu đồ của Dashboard, tách khỏi trang để `recharts` không nằm trong chunk của trang.
 *
 * Trang nạp module này qua `React.lazy`, nên phần thẻ số liệu và bảng phía trên vẽ được ngay mà
 * không phải chờ ~390 kB thư viện đồ thị tải xong. Giữ cả ba trong một file vì chúng dùng chung
 * bảng màu và luôn xuất hiện trên cùng một trang — tách thành ba file chỉ thêm ba lượt tải mạng.
 */

/**
 * Bảng màu phân loại, thứ tự cố định — không bao giờ xoay vòng sang màu thứ 7.
 *
 * Bảng cũ (`#059669,#0ea5e9,#8b5cf6,#f59e0b,#ef4444,#ec4899`) trượt kiểm tra: cặp hồng/đỏ cạnh nhau
 * chỉ cách ΔE 11.4 với mắt thường (ngưỡng 15), và hai màu xanh/cam dưới 3:1 tương phản với nền.
 * Bảng hiện tại đạt cả sáu kiểm tra ở cả nền sáng lẫn nền tối.
 */
const CHART_COLORS = ['#047857', '#0284c7', '#a16207', '#7c3aed', '#dc2626', '#0891b2'];
const REVENUE_COLOR = CHART_COLORS[0];
const ORDERS_COLOR = CHART_COLORS[1];

const TOOLTIP_STYLE = { borderRadius: 12, borderColor: '#e2e8f0' } as const;

export interface RevenuePoint {
  date: string;
  amount: number;
  orders: number;
}

export interface StatusSlice {
  name: string;
  value: number;
}

export function RevenueAreaChart({
  data,
  money,
}: {
  data: RevenuePoint[];
  money: Intl.NumberFormat;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={REVENUE_COLOR} stopOpacity={0.28} />
            <stop offset="100%" stopColor={REVENUE_COLOR} stopOpacity={0.02} />
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
          contentStyle={TOOLTIP_STYLE}
        />
        {/* Một chuỗi duy nhất nên không cần chú giải: tiêu đề thẻ đã nói đây là doanh thu. */}
        <Area
          type="monotone"
          dataKey="amount"
          name="Doanh thu thuần"
          stroke={REVENUE_COLOR}
          strokeWidth={2}
          fill="url(#revenueFill)"
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function OrderStatusPieChart({ data }: { data: StatusSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={88}
          paddingAngle={2}
          // Khe 2px giữa các lát để hai màu cạnh nhau không dính thành một mảng.
          stroke="#fff"
          strokeWidth={2}
          animationDuration={600}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CompletedOrdersBarChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barCategoryGap="28%">
        <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e2e8f0" />
        <XAxis dataKey="date" fontSize={12} axisLine={false} tickLine={false} />
        <YAxis fontSize={12} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'rgba(15,23,42,0.04)' }}
          formatter={(value) => [`${Number(value ?? 0)} đơn`, 'Đã hoàn tất']}
          contentStyle={TOOLTIP_STYLE}
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
