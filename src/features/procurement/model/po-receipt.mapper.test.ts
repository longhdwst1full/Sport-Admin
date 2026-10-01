import { describe, expect, it } from 'vitest';
import type { PurchaseOrderDetailDto } from '@/generated/api/procurement/procurement.schemas';
import { toRemainingPoReceiptItems } from './po-receipt.mapper';

describe('toRemainingPoReceiptItems', () => {
  it('khởi tạo phiếu nhập từ các dòng PO còn nhận, không nhận lại dòng đã đủ', () => {
    const purchaseOrder = { items: [
      { id: '11', productVariantId: '21', orderedQty: 10, receivedQty: 4, remainingQty: 6, unitCost: '100.00' },
      { id: '12', productVariantId: '22', orderedQty: 3, receivedQty: 3, remainingQty: 0, unitCost: '200.00' },
    ] } as PurchaseOrderDetailDto;

    expect(toRemainingPoReceiptItems(purchaseOrder)).toEqual([{ purchaseOrderItemId: '11', productVariantId: '21', quantity: 6 }]);
    expect(purchaseOrder.items[0].remainingQty).toBe(6);
  });
});
