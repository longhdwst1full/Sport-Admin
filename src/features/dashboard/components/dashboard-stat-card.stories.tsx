import { DollarOutlined } from '@ant-design/icons';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DashboardStatCard } from './dashboard-stat-card';

const meta = {
  title: 'Features/Dashboard/DashboardStatCard',
  component: DashboardStatCard,
  decorators: [
    (Story) => (
      <div className="max-w-sm bg-slate-50 p-6">
        <Story />
      </div>
    ),
  ],
  args: {
    label: 'Doanh thu thuần',
    period: '30 ngày gần nhất',
    value: '128.500.000 ₫',
    hint: '24 đơn hoàn tất · đã hoàn 0 ₫',
    icon: <DollarOutlined />,
    tone: 'brand',
  },
} satisfies Meta<typeof DashboardStatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: { status: 'loading' },
};

export const LoadError: Story = {
  args: { status: 'error', value: '—', hint: 'Không tải được số liệu', retry: () => undefined },
};

export const Restricted: Story = {
  args: {
    status: 'denied',
    value: '—',
    hint: 'Cần quyền xem doanh thu',
    tone: 'violet',
  },
};
