import { describe, expect, it } from 'vitest';
import { toLookupOptions, toVariantOptions } from './product-lookup-options';

describe('toLookupOptions', () => {
  it('đặt giá trị đang gán lên đầu và bỏ trùng', () => {
    expect(
      toLookupOptions(
        [{ id: 'b1', code: 'KS', label: 'Kingsport' }, { id: 'b2', code: 'EL', label: 'Elip' }],
        (item) => item.id,
        [{ value: 'b1', label: 'Kingsport' }],
      ),
    ).toEqual([
      { value: 'b1', label: 'Kingsport' },
      { value: 'b2', label: 'EL — Elip' },
    ]);
  });

  it('lấy giá trị theo code khi contract dùng mã', () => {
    expect(toLookupOptions([{ code: 'HN01', label: 'Kho HN' }], (item) => item.code)).toEqual([
      { value: 'HN01', label: 'HN01 — Kho HN' },
    ]);
  });

  it('chưa có dữ liệu thì trả rỗng', () => {
    expect(toLookupOptions(undefined, (item: { id: string; code: string; label: string }) => item.id)).toEqual([]);
  });
});

describe('toVariantOptions', () => {
  it('ghép SKU và tên biến thể', () => {
    expect(toVariantOptions([{ id: 'v1', sku: 'X900', name: 'Đen' }])).toEqual([{ value: 'v1', label: 'X900 — Đen' }]);
  });
});
