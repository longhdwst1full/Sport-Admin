import { describe, expect, it } from 'vitest';
import { toProductFormErrorTarget } from './product-form.schema';

describe('toProductFormErrorTarget', () => {
  it('đổi tên trường giá của API sang ô giá của biến thể', () => {
    expect(toProductFormErrorTarget('variants.2.initialPriceAmount')).toEqual({ kind: 'field', path: 'variants.2.price' });
  });

  it('bỏ qua trường biến thể không có trên form', () => {
    expect(toProductFormErrorTarget('variants.0.internalCode')).toBeUndefined();
  });

  it('gom lỗi thông số vào khối thông số', () => {
    expect(toProductFormErrorTarget('specifications.1.values')).toEqual({ kind: 'specification' });
  });

  it('giữ trường gốc của form, bỏ trường lạ', () => {
    expect(toProductFormErrorTarget('name')).toEqual({ kind: 'field', path: 'name' });
    expect(toProductFormErrorTarget('slug')).toBeUndefined();
  });
});
