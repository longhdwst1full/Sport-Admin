import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { NotificationTable } from './notification-table';

const meta = {
  title: 'Features/Notifications/NotificationTable',
  component: NotificationTable,
  args: {
    loading: false,
    page: 1,
    pageSize: 30,
    total: 2,
    canRequeue: true,
    onPageChange: fn(),
    onRequeue: fn(),
    rows: [
      {
        id: '501',
        aggregateType: 'ORDER',
        aggregateId: '1024',
        eventType: 'order.placed',
        status: 'DONE',
        attempts: 1,
        availableAt: '2026-09-28T03:00:00.000Z',
        recipientMasked: 'l***@example.com',
        deliveryStatus: 'SENT',
        deliveryAttempts: 1,
        sentAt: '2026-09-28T03:00:02.000Z',
        createdAt: '2026-09-28T03:00:00.000Z',
      },
      {
        id: '502',
        aggregateType: 'PAYMENT',
        aggregateId: '2048',
        eventType: 'payment.failed',
        status: 'DEAD',
        attempts: 1,
        availableAt: '2026-09-28T04:00:00.000Z',
        recipientMasked: 'k***@example.com',
        deliveryStatus: 'FAILED',
        deliveryAttempts: 1,
        errorCode: 'MAILTRAP_HTTP_401',
        lastError: 'Nhà cung cấp email từ chối xác thực.',
        createdAt: '2026-09-28T04:00:00.000Z',
      },
    ],
  },
} satisfies Meta<typeof NotificationTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { rows: [], total: 0, loading: true } };
export const Empty: Story = { args: { rows: [], total: 0 } };

