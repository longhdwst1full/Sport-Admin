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
    label: 'Doanh thu đã hoàn tất',
    value: '128.500.000 ₫',
    hint: '24 đơn đã thu đủ tiền trong 30 ngày',
    icon: <DollarOutlined />,
    tone: 'brand',
  },
} satisfies Meta<typeof DashboardStatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: { loading: true },
};

export const Restricted: Story = {
  args: {
    value: '—',
    hint: 'Cần quyền xem doanh thu',
    tone: 'violet',
  },
};
