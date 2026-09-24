import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ReturnTable } from './return-table';

const meta = {
  title: 'Features/Returns/ReturnTable',
  component: ReturnTable,
  args: {
    loading: false,
    page: 1,
    total: 4,
    onPageChange: fn(),
    onOpen: fn(),
    rows: [
      { id: '1', returnNo: 'RMA-20260924-000001', orderId: '11', orderNo: 'ORD-000101', status: 'REQUESTED', channel: 'ACCOUNT', reasonCode: 'WRONG_SIZE', fault: null, recipientName: 'Nguyễn Minh Anh', itemCount: 2, createdAt: '2026-09-24T02:00:00.000Z', version: '0' },
      { id: '2', returnNo: 'RMA-20260924-000002', orderId: '12', orderNo: 'ORD-000102', status: 'APPROVED', channel: 'ADMIN', reasonCode: 'DEFECTIVE', fault: 'SHOP', recipientName: 'Trần Hoàng Nam', itemCount: 1, createdAt: '2026-09-24T03:00:00.000Z', version: '1' },
      { id: '3', returnNo: 'RMA-20260924-000003', orderId: '13', orderNo: 'ORD-000103', status: 'RECEIVED', channel: 'ACCOUNT', reasonCode: 'NOT_AS_DESCRIBED', fault: 'CUSTOMER', recipientName: 'Lê Thu Hà', itemCount: 3, createdAt: '2026-09-24T04:00:00.000Z', version: '2' },
      { id: '4', returnNo: 'RMA-20260924-000004', orderId: '14', orderNo: 'ORD-000104', status: 'CLOSED', channel: 'ADMIN', reasonCode: 'CHANGED_MIND', fault: 'CUSTOMER', recipientName: 'Phạm Quốc Bảo', itemCount: 1, createdAt: '2026-09-24T05:00:00.000Z', version: '5' },
    ],
  },
} satisfies Meta<typeof ReturnTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = { args: { loading: true, rows: [], total: 0 } };

export const Empty: Story = { args: { rows: [], total: 0 } };
