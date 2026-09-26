import { describe, expect, it } from 'vitest';
import type { ReturnEligibilityLineDto, ReturnItemDto } from '@/generated/api/returns/returns.schemas';
import { estimateSelection, toCreateReturnPayload, toInspectionPayload, toProofImages } from './return-form.mapper';

const line = (overrides: Partial<ReturnEligibilityLineDto>): ReturnEligibilityLineDto => ({
  orderItemId: '1',
  sku: 'SKU-1',
  productName: 'Áo',
  variantName: 'L',
  imageUrl: null,
  isBundle: false,
  purchasedQuantity: 3,
  returnedQuantity: 0,
  returnableQuantity: 3,
  blockedByCategory: false,
  unitRefundEstimate: '100000.00',
  maxRefundEstimate: '300000.00',
  ...overrides,
});

const image = { publicId: 'shop/return-evidence/o9/a', providerVersion: 1, providerSignature: 's', previewUrl: 'https://x/a.jpg' };

describe('toInspectionPayload', () => {
  it('takes ids from the loaded return and sends disposition only for damaged goods', () => {
    const items = [{ id: '11' }, { id: '12' }, { id: '13' }] as ReturnItemDto[];
    expect(toInspectionPayload(items, [
      { condition: 'SELLABLE', disposition: 'HOLD' },
      { condition: 'DAMAGED', disposition: 'WRITE_OFF', note: ' rách ' },
      { condition: 'MISSING' },
    ])).toEqual([
      { returnItemId: '11', condition: 'SELLABLE' },
      { returnItemId: '12', condition: 'DAMAGED', disposition: 'WRITE_OFF', note: 'rách' },
      { returnItemId: '13', condition: 'MISSING' },
    ]);
  });
});

describe('toCreateReturnPayload', () => {
  it('keeps selected lines, caps quantities and sends whole combos', () => {
    const lines = [
      line({ orderItemId: '1' }),
      line({ orderItemId: '2', isBundle: true, returnableQuantity: 2 }),
      line({ orderItemId: '3', returnableQuantity: 0, blockedByCategory: true }),
    ];
    const payload = toCreateReturnPayload('9', lines, {
      reasonCode: 'DEFECTIVE',
      description: '  bị lỗi đường may ',
      fault: 'SHOP',
      quantities: { '1': 5, '2': 1, '3': 1 },
    }, [image]);
    expect(payload).toEqual({
      orderId: '9',
      reasonCode: 'DEFECTIVE',
      description: 'bị lỗi đường may',
      fault: 'SHOP',
      items: [{ orderItemId: '1', quantity: 3 }, { orderItemId: '2', quantity: 2 }],
      evidenceImages: [{ publicId: 'shop/return-evidence/o9/a', providerVersion: 1, providerSignature: 's' }],
    });
  });

  it('omits optional fields left empty', () => {
    const payload = toCreateReturnPayload('9', [line({})], { reasonCode: 'WRONG_SIZE', quantities: { '1': 1 } }, []);
    expect(payload).toEqual({ orderId: '9', reasonCode: 'WRONG_SIZE', items: [{ orderItemId: '1', quantity: 1 }] });
  });
});

describe('estimateSelection', () => {
  it('sums unit estimates and uses the rounded line estimate for full lines and combos', () => {
    const lines = [line({ orderItemId: '1' }), line({ orderItemId: '2', isBundle: true, returnableQuantity: 1, maxRefundEstimate: '500000.00' })];
    expect(estimateSelection(lines, { '1': 2 })).toBe(200000);
    expect(estimateSelection(lines, { '1': 3, '2': 1 })).toBe(800000);
  });
});

describe('toProofImages', () => {
  it('sends nothing when no image was attached', () => {
    expect(toProofImages([])).toBeUndefined();
  });
});
