import { describe, expect, it, vi } from 'vitest';
import type { UseFormReturn } from 'react-hook-form';
import type { ProductFormValues } from './product-form.mapper';
import { PRODUCT_FORM_TABS, PRODUCT_TAB_LABELS, adjacentTab, productTabFields, validateProductTabs } from './product-form-tabs';

function formWithFailingFields(failing: string[], variantCount = 1): UseFormReturn<ProductFormValues> {
  return {
    getValues: vi.fn(() => Array.from({ length: variantCount }, () => ({}))),
    trigger: vi.fn((fields: string[]) =>
      Promise.resolve(!fields.some((field) => failing.includes(field))),
    ),
  } as unknown as UseFormReturn<ProductFormValues>;
}

describe('validateProductTabs', () => {
  it('hợp lệ khi không trường nào lỗi', async () => {
    await expect(validateProductTabs(formWithFailingFields([]))).resolves.toEqual({ isValid: true });
  });

  /** Nhảy tới tab lỗi đầu tiên, nếu không người dùng nhìn form hợp lệ mà không tạo được. */
  it('trả về tab lỗi đầu tiên theo thứ tự hiển thị', async () => {
    await expect(validateProductTabs(formWithFailingFields(['variants.0.sku']))).resolves.toEqual({
      isValid: false,
      errorTab: 'variants',
    });
  });

  it('quy lỗi tồn đầu về tab SKU, giá & tồn kho', async () => {
    await expect(validateProductTabs(formWithFailingFields(['variants.1.openingQuantity'], 2))).resolves.toEqual({
      isValid: false,
      errorTab: 'variants',
    });
  });

  it('quy lỗi kho nhập tồn đầu về tab SKU, giá & tồn kho', async () => {
    await expect(validateProductTabs(formWithFailingFields(['initialWarehouseCode']))).resolves.toEqual({
      isValid: false,
      errorTab: 'variants',
    });
  });

  it('quy lỗi thông số kỹ thuật về tab Thông tin', async () => {
    await expect(validateProductTabs(formWithFailingFields(['specifications']))).resolves.toEqual({
      isValid: false,
      errorTab: 'info',
    });
  });

  it('quy lỗi hình ảnh về tab Thông tin khi tạo', async () => {
    await expect(validateProductTabs(formWithFailingFields(['images']))).resolves.toEqual({
      isValid: false,
      errorTab: 'info',
    });
  });

  it('ưu tiên tab đứng trước khi nhiều tab cùng lỗi', async () => {
    await expect(
      validateProductTabs(formWithFailingFields(['variants.0.sku', 'specifications'])),
    ).resolves.toEqual({ isValid: false, errorTab: 'info' });
  });

  /** Khi Sửa, SKU và tồn kho là dữ liệu thật lưu riêng; dữ liệu giữ chỗ không được chặn nút Lưu. */
  it('không validate SKU, ảnh và tồn đầu ở chế độ Sửa', async () => {
    await expect(
      validateProductTabs(formWithFailingFields(['variants.0.name', 'images', 'initialWarehouseCode']), 'edit'),
    ).resolves.toEqual({ isValid: true });
  });

  /** Thông số vẫn là ô của form khi Sửa, nên vẫn chặn Lưu và nhảy về tab Thông tin. */
  it('vẫn validate thông số kỹ thuật ở chế độ Sửa', async () => {
    await expect(validateProductTabs(formWithFailingFields(['specifications']), 'edit')).resolves.toEqual({
      isValid: false,
      errorTab: 'info',
    });
  });

  it('chỉ xét các tab được truyền vào', async () => {
    await expect(
      validateProductTabs(formWithFailingFields(['specifications']), 'create', ['variants', 'review']),
    ).resolves.toEqual({ isValid: true });
  });
});

describe('bộ tab', () => {
  it('Tạo và Sửa dùng đúng ba tab gộp', () => {
    expect(PRODUCT_FORM_TABS).toEqual(['info', 'variants', 'review']);
    expect(PRODUCT_TAB_LABELS).toEqual({
      info: 'Thông tin',
      variants: 'SKU, giá & tồn kho',
      review: 'Kiểm tra xuất bản',
    });
  });

  it('liệt kê từng ô của mọi biến thể và tồn đầu ở tab SKU khi tạo', () => {
    const fields = productTabFields('variants', 'create', 2);
    expect(fields).toContain('variants.1.price');
    expect(fields).toContain('variants.1.openingQuantity');
    expect(fields).toContain('initialBranchId');
    expect(productTabFields('variants', 'edit', 2)).toEqual([]);
  });

  it('tab Thông tin gồm thông tin cơ bản, ảnh (chỉ khi tạo) và thông số', () => {
    expect(productTabFields('info', 'create', 1)).toEqual(expect.arrayContaining(['name', 'images', 'specifications']));
    expect(productTabFields('info', 'edit', 1)).not.toContain('images');
    expect(productTabFields('info', 'edit', 1)).toContain('specifications');
  });
});

describe('adjacentTab', () => {
  it('đi tới và lùi lại theo thứ tự tab', () => {
    expect(adjacentTab('info', 1)).toBe('variants');
    expect(adjacentTab('variants', 1)).toBe('review');
    expect(adjacentTab('review', -1)).toBe('variants');
  });

  it('không có tab nào ngoài hai đầu', () => {
    expect(adjacentTab('info', -1)).toBeUndefined();
    expect(adjacentTab('review', 1)).toBeUndefined();
  });
});
