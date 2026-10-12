import { describe, expect, it } from 'vitest';
import { emptyVariant } from './product-form.mapper';
import { PRODUCT_FORM_DEFAULTS, productFormSchema, toProductFormErrorTarget } from './product-form.schema';

const validValues = {
  ...PRODUCT_FORM_DEFAULTS,
  name: 'Máy chạy bộ',
  categoryIds: ['1'],
  primaryCategoryId: '1',
  variants: [{ ...emptyVariant(), name: 'Đen' }],
};

const errorPaths = async (values: unknown) => {
  try {
    await productFormSchema.validate(values, { abortEarly: false });
    return [];
  } catch (error) {
    return (error as { inner: Array<{ path?: string }> }).inner.map(({ path }) => path);
  }
};

describe('productFormSchema — tồn đầu', () => {
  it('không bắt chi nhánh/kho khi không nhập tồn đầu', async () => {
    await expect(errorPaths(validValues)).resolves.toEqual([]);
  });

  it('báo lỗi riêng ở ô chi nhánh và ô kho khi có tồn đầu', async () => {
    const values = { ...validValues, variants: [{ ...validValues.variants[0], openingQuantity: 5 }] };
    const paths = await errorPaths(values);
    expect(paths).toContain('initialBranchId');
    expect(paths).toContain('initialWarehouseCode');
  });

  it('chặn quá 20 ảnh theo contract', async () => {
    const images = Array.from({ length: 21 }, (_, index) => ({ assetId: String(index + 1), url: `u${index}` }));
    await expect(errorPaths({ ...validValues, images })).resolves.toEqual(['images']);
  });
});

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
