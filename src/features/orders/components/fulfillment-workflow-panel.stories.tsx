import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getGetAdminFulfillmentByOrderQueryKey } from '@/generated/api/fulfillments/fulfillments';
import type { FulfillmentDetailDto } from '@/generated/api/fulfillments/models';
import { FulfillmentWorkflowPanel } from './fulfillment-workflow-panel';

const fulfillment: FulfillmentDetailDto = {
  id: '501',
  fulfillmentNo: 'FUL-ORD-20260912-000105',
  orderId: '105',
  orderNo: 'ORD-20260912-000105',
  warehouseId: '1',
  warehouseName: 'Kho chi nhánh Hà Nội',
  status: 'SHIPPED',
  carrierCode: 'MANUAL',
  trackingNo: 'GH-20260912-001',
  recipientName: 'Nguyễn Minh Anh',
  recipientPhone: '+84901234567',
  createdAt: '2026-09-12T01:30:00.000Z',
  version: '3',
  orderStatus: 'SHIPPED',
  paymentStatus: 'SUCCESS',
  paymentMethod: 'BANK_TRANSFER',
  pickedAt: '2026-09-12T02:00:00.000Z',
  packedAt: '2026-09-12T02:30:00.000Z',
  shippedAt: '2026-09-12T03:00:00.000Z',
  history: [
    { sequenceNo: 1, toStatus: 'PENDING', reason: 'Tạo giao vận cùng đơn hàng', createdAt: '2026-09-12T01:30:00.000Z' },
    { sequenceNo: 2, fromStatus: 'PENDING', toStatus: 'PICKING', reason: 'Đã phân công lấy hàng', createdAt: '2026-09-12T02:00:00.000Z' },
    { sequenceNo: 3, fromStatus: 'PICKING', toStatus: 'PACKED', reason: 'Đã kiểm và đóng gói', createdAt: '2026-09-12T02:30:00.000Z' },
    { sequenceNo: 4, fromStatus: 'PACKED', toStatus: 'SHIPPED', reason: 'Bàn giao giao hàng nội bộ', createdAt: '2026-09-12T03:00:00.000Z' },
  ],
};

const meta = {
  title: 'Features/Orders/Fulfillment workflow',
  component: FulfillmentWorkflowPanel,
  parameters: { layout: 'padded' },
  args: { orderId: fulfillment.orderId },
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      queryClient.setQueryData(getGetAdminFulfillmentByOrderQueryKey(fulfillment.orderId), fulfillment);
      return <QueryClientProvider client={queryClient}><Story /></QueryClientProvider>;
    },
  ],
} satisfies Meta<typeof FulfillmentWorkflowPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Shipping: Story = {};
