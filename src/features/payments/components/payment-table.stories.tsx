import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PaymentTable } from './payment-table';

const meta = {
  title: 'Features/Payments/PaymentTable',
  component: PaymentTable,
  args: {
    loading: false,
    page: 1,
    total: 3,
    onPageChange: fn(),
    onOpen: fn(),
    rows: [
      { id: '101', paymentRef: 'PAY-ORD-000101', orderNo: 'ORD-000101', recipientName: 'Nguyễn Minh Anh', recipientPhone: '+84901234567', method: 'BANK_TRANSFER', status: 'AWAITING_CONFIRMATION', expectedAmount: '1490000.00', receivedAmount: '0.00', createdAt: '2026-09-12T02:00:00.000Z', version: '1' },
      { id: '102', paymentRef: 'PAY-ORD-000102', orderNo: 'ORD-000102', recipientName: 'Trần Hoàng Nam', recipientPhone: '+84907654321', method: 'COD', status: 'PENDING', expectedAmount: '750000.00', receivedAmount: '0.00', createdAt: '2026-09-12T03:00:00.000Z', version: '0' },
      { id: '103', paymentRef: 'PAY-ORD-000103', orderNo: 'ORD-000103', recipientName: 'Lê Thu Hà', recipientPhone: '+84908889999', method: 'BANK_TRANSFER', status: 'SUCCESS', expectedAmount: '2200000.00', receivedAmount: '2200000.00', createdAt: '2026-09-12T04:00:00.000Z', version: '2' },
    ],
  },
} satisfies Meta<typeof PaymentTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = { args: { loading: true, rows: [], total: 0 } };

export const Empty: Story = { args: { rows: [], total: 0 } };
