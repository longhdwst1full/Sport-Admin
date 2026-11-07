import { describe, expect, it } from 'vitest';
import { isItemChanged, toUpsertFlashSaleItemPayload, type EditableItem } from './flash-sale.mapper';
import { applyBulkQuota, bulkQuotaError } from './flash-sale-quota';

function row(index: number): EditableItem {
  return { productVariantId: String(index), sku: `SKU-${index}`, name: `Sản phẩm ${index}`,
    salePrice: 80000, quota: null, committed: 0, inactive: false };
}

describe('flash sale fill-all quota', () => {
  it('sets 5 total slots per SKU for 10 products, without dividing or changing prices', () => {
    const items = Array.from({ length: 10 }, (_, index) => row(index));
    const result = applyBulkQuota(items, 5);
    expect(result.map(toUpsertFlashSaleItemPayload)).toEqual(items.map((item) => ({
      productVariantId: item.productVariantId, salePrice: '80000.00', quota: 5,
    })));
    expect(result.reduce((total, item) => total + (item.quota ?? 0), 0)).toBe(50);
    expect(items.every((item) => item.quota === null)).toBe(true);
  });

  it('keeps identity/version snapshot and marks an existing changed row for save', () => {
    const item = { ...row(1), itemId: '11', quota: 10, committed: 3, original: { salePrice: 80000, quota: 10 } };
    const result = applyBulkQuota([item], 5)[0];
    expect(result).toMatchObject({ itemId: '11', quota: 5, committed: 3, original: { quota: 10 }, inactive: false });
    expect(isItemChanged(result)).toBe(true);
    expect(item.quota).toBe(10);
  });

  it('blocks the entire fill if any row has more sold/held than the requested quota', () => {
    const items = [row(1), { ...row(2), committed: 6 }];
    expect(bulkQuotaError(items, 5)).toContain('Tối thiểu 6');
    expect(applyBulkQuota(items, 5)).toBe(items);
    expect(applyBulkQuota(items, 6).map((item) => item.quota)).toEqual([6, 6]);
  });

  it.each([null, 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('does not fill invalid quota %s', (quota) => {
    const items = [row(1)];
    expect(bulkQuotaError(items, quota)).toBeTruthy();
    expect(applyBulkQuota(items, quota)).toBe(items);
  });
});
