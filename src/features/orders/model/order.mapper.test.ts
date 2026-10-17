import { describe, expect, it } from 'vitest';
import type { OrderDetailDto, OrderSummaryDto } from '@/generated/api/orders/orders.schemas';
import { toOrderDetailView, toOrderRow, toPaidAtLabel } from './order.mapper';

const summary: OrderSummaryDto = {
  id: '101',
  orderNo: 'ORD-1',
  status: 'PENDING_CONFIRMATION',
  paymentStatus: 'PENDING',
  fulfillmentStatus: 'PENDING',
  paymentMethod: 'COD',
  shippingMethod: 'STANDARD_DELIVERY',
  branchId: '1',
  branchName: 'Chi nhánh Hà Nội',
  warehouseName: 'Kho Hà Nội',
  grandTotal: '120000.00',
  itemCount: 2,
  recipient: {
    name: 'nguyễn An',
    phone: '0901',
    email: null,
    addressLine: '12 Nguyễn Trãi',
    ward: null,
    district: 'Thanh Xuân',
    province: 'Hà Nội',
  },
  placedAt: '2026-09-11T03:15:00.000Z',
  version: 3,
};

const detail: OrderDetailDto = {
  ...summary,
  branchContact: {} as OrderDetailDto['branchContact'],
  currencyCode: 'VND',
  pricesIncludeTax: true,
  subtotal: '100000.00',
  discountTotal: '0.00',
  shippingTotal: '20000.00',
  taxTotal: '0.00',
  customerNote: '  ',
  items: [
    {
      id: '1',
      lineNo: 1,
      productVariantId: '1',
      itemType: 'VARIANT',
      sku: 'SKU-1',
      productName: 'áo',
      variantName: '',
      imageUrl: null,
      quantity: 2,
      unitPrice: '50000.00',
      lineTotal: '100000.00',
      components: [],
    },
  ],
  statusHistory: [
    { sequenceNo: 1, toStatus: 'PENDING_CONFIRMATION', actorType: 'ROBOT', createdAt: '2026-09-11T03:15:00.000Z', reason: '' },
  ],
  paidAt: null,
};

describe('toOrderRow', () => {
  it('ghép nhãn phương thức và chữ cái đầu', () => {
    const row = toOrderRow(summary);
    expect(row.recipientInitial).toBe('N');
    expect(row.paymentMethodLabel).toBe('Tiền mặt khi nhận (COD)');
    expect(toOrderRow({ ...summary, paymentMethod: 'MOMO' }).paymentMethodLabel).toBe('MOMO');
  });
});

describe('toPaidAtLabel', () => {
  it('nói đúng trạng thái khi thiếu mốc giờ', () => {
    expect(toPaidAtLabel({ paidAt: null, paymentStatus: 'PENDING', paymentMethod: 'COD' })).toBe('Thu khi giao hàng');
    expect(toPaidAtLabel({ paidAt: null, paymentStatus: 'REFUNDED', paymentMethod: 'VNPAY' })).toBe('Không ghi nhận thời điểm');
    expect(toPaidAtLabel({ paidAt: null, paymentStatus: 'FAILED', paymentMethod: 'VNPAY' })).toBe('Chưa thanh toán');
  });
});

describe('toOrderDetailView', () => {
  it('xử lý trường null/rỗng', () => {
    const view = toOrderDetailView(detail);
    expect(view.recipient.email).toBe('Không có email');
    expect(view.recipient.address).toBe('12 Nguyễn Trãi, Thanh Xuân, Hà Nội');
    expect(view.recipient.note).toBeUndefined();
    expect(view.items[0]).toMatchObject({ initial: 'Á', variantLabel: 'SKU-1', imageUrl: undefined });
    expect(view.history[0]).toMatchObject({ statusLabel: 'Chờ xác nhận', reason: undefined });
    expect(view.history[0].metaLabel).toContain('Không xác định');
    expect(view.shipment).toBeUndefined();
  });

  it('chỉ hiện giảm giá/thuế khi khác 0 và thuế chưa gồm trong giá', () => {
    expect(toOrderDetailView(detail).totals).toMatchObject({ discountTotal: undefined, taxTotal: undefined });
    const view = toOrderDetailView({ ...detail, discountTotal: '5000.00', pricesIncludeTax: false, taxTotal: '8000.00' });
    expect(view.totals).toMatchObject({ discountTotal: '5000.00', taxTotal: '8000.00', pricesIncludeTax: false });
  });

  it('chỉ tạo link vận đơn với URL http(s)', () => {
    const shipment = { status: 'SHIPPED', carrierCode: 'GHN', trackingNo: 'T1', trackingUrl: 'javascript:alert(1)' };
    expect(toOrderDetailView({ ...detail, shipment }).shipment?.trackingHref).toBeUndefined();
    const safe = toOrderDetailView({ ...detail, shipment: { ...shipment, trackingUrl: 'https://ghn.vn/t/T1' } });
    expect(safe.shipment).toMatchObject({ trackingHref: 'https://ghn.vn/t/T1', trackingNo: 'T1', carrierCode: 'GHN' });
  });
});
