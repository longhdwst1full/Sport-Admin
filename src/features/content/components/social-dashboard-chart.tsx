import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SOCIAL_CHANNEL, socialChannelLabels, type SocialChannel } from '../constants/social.constants';
import { formatMetric, type ComparisonPoint } from '../model/social-dashboard';

/**
 * Biểu đồ so sánh Facebook/TikTok theo ngày. Nạp qua `React.lazy` như `features/dashboard/components/dashboard-charts`
 * để `recharts` không nằm trong chunk của trang; màu lấy từ cùng bảng màu phân loại của Dashboard.
 */
const CHANNEL_COLORS: Record<SocialChannel, string> = {
  [SOCIAL_CHANNEL.FACEBOOK]: '#0284c7',
  [SOCIAL_CHANNEL.TIKTOK]: '#7c3aed',
};

const TOOLTIP_STYLE = { borderRadius: 12, borderColor: '#e2e8f0' } as const;

export function SocialComparisonChart({
  data,
  channels,
  metricLabel,
}: {
  data: ComparisonPoint[];
  channels: SocialChannel[];
  metricLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barCategoryGap="20%" accessibilityLayer>
        <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e2e8f0" />
        <XAxis dataKey="label" fontSize={12} axisLine={false} tickLine={false} minTickGap={12} />
        <YAxis fontSize={12} axisLine={false} tickLine={false} allowDecimals={false} width={48} />
        <Tooltip
          cursor={{ fill: 'rgba(15,23,42,0.04)' }}
          formatter={(value, name) => [formatMetric(value == null ? null : Number(value)), `${name} · ${metricLabel}`]}
          contentStyle={TOOLTIP_STYLE}
        />
        {channels.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
        {channels.map((channel) => (
          <Bar
            key={channel}
            dataKey={channel}
            name={socialChannelLabels[channel]}
            fill={CHANNEL_COLORS[channel]}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            animationDuration={600}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
