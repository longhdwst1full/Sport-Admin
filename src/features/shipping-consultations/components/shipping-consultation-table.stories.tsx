import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  CheckoutQuotePaymentMethod,
  ShippingMethod,
  CheckoutQuoteStatus,
  type AdminShippingConsultationDto,
} from '@/generated/api/checkout/models';
import { ShippingConsultationTable } from './shipping-consultation-table';

const demoRows: AdminShippingConsultationDto[] = [
  {
    checkoutToken: 'checkout_demo_01',
    status: CheckoutQuoteStatus.AWAITING_SHIPPING_CONSULTATION,
    branchId: '1',
    warehouseId: '1',
    branchName: 'Chi nhánh Quận 7',
    paymentMethod: CheckoutQuotePaymentMethod.COD,
    shippingMethod: ShippingMethod.MANUAL_EXTERNAL,
    shippingProvider: 'COACH_BUS',
    itemSubtotal: '18500000',
    shippingTotal: null,
    grandTotal: null,
    etaMinDays: null,
    etaMaxDays: null,
    requiresShippingConsultation: true,
    items: [
      {
        productVariantId: '10',
        sku: 'MAY-CHAY-BO-01',
        name: 'Máy chạy bộ điện đa năng',
        quantity: 1,
        unitPrice: '18500000',
        lineTotal: '18500000',
      },
    ],
    expiresAt: '2026-09-09T03:00:00.000Z',
    version: 1,
    recipient: {
      recipient: 'Nguyễn Minh Anh',
      phone: '+84901234567',
      addressLine: '12 Nguyễn Hữu Thọ',
      ward: 'Tân Phong',
      district: 'Quận 7',
      province: 'TP. Hồ Chí Minh',
      provinceCode: '79',
    },
    customerNote: 'Nhờ gọi trước để thống nhất xe giao.',
    createdAt: '2026-09-08T02:30:00.000Z',
  },
];

const meta = {
  title: 'Features/Shipping consultations/Table',
  component: ShippingConsultationTable,
  parameters: { layout: 'padded' },
  args: {
    rows: demoRows,
    loading: false,
    page: 1,
    total: 1,
    onPageChange: () => undefined,
    onOpen: () => undefined,
  },
} satisfies Meta<typeof ShippingConsultationTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPendingConsultation: Story = {};

export const Loading: Story = {
  args: { loading: true, rows: [] },
};

export const Empty: Story = {
  args: { rows: [], total: 0 },
};
