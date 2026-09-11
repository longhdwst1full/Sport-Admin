import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  AdminOrderSummaryDtoFulfillmentStatus,
  AdminOrderSummaryDtoPaymentStatus,
  AdminOrderSummaryDtoStatus,
  type AdminOrderSummaryDto,
} from '@/generated/api/orders/models';
import { OrderTable } from './order-table';

const demoRows: AdminOrderSummaryDto[] = [
  {
    id: '101',
    orderNo: 'ORD-20260911-00000101',
    status: AdminOrderSummaryDtoStatus.PENDING_CONFIRMATION,
    paymentStatus: AdminOrderSummaryDtoPaymentStatus.PENDING,
    fulfillmentStatus: AdminOrderSummaryDtoFulfillmentStatus.PENDING,
    paymentMethod: 'COD',
    shippingMethod: 'STANDARD_DELIVERY',
    branchId: '1',
    branchName: 'Chi nhánh Hà Nội',
    warehouseName: 'Kho Hà Nội',
    grandTotal: '12490000.00',
    itemCount: 2,
    recipient: {
      name: 'Nguyễn Minh Anh',
      phone: '+84901234567',
      email: 'minhanh@example.com',
      addressLine: '12 Nguyễn Trãi',
      ward: 'Thanh Xuân Trung',
      district: 'Thanh Xuân',
      province: 'Hà Nội',
    },
    placedAt: '2026-09-11T03:15:00.000Z',
    version: 0,
  },
];

const meta = {
  title: 'Features/Orders/Table',
  component: OrderTable,
  parameters: { layout: 'padded' },
  args: {
    rows: demoRows,
    loading: false,
    page: 1,
    total: 1,
    onPageChange: () => undefined,
    onOpen: () => undefined,
  },
} satisfies Meta<typeof OrderTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {};
export const Loading: Story = { args: { rows: [], loading: true } };
export const Empty: Story = { args: { rows: [], total: 0 } };

