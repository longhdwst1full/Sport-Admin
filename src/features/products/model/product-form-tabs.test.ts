import { describe, expect, it, vi } from 'vitest';
import type { UseFormReturn } from 'react-hook-form';
import { ProductType } from '@/generated/api/catalog/catalog.schemas';
import type { ProductFormValues } from './product-form.mapper';
import { adjacentTab, productTabFields, validateProductTabs, visibleProductTabs } from './product-form-tabs';

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

  it('quy lỗi tồn đầu về tab Tồn kho, không về tab SKU', async () => {
    await expect(validateProductTabs(formWithFailingFields(['variants.1.openingQuantity'], 2))).resolves.toEqual({
      isValid: false,
      errorTab: 'stock',
    });
  });

  it('ưu tiên tab đứng trước khi nhiều tab cùng lỗi', async () => {
    await expect(
      validateProductTabs(formWithFailingFields(['name', 'specifications'])),
    ).resolves.toEqual({ isValid: false, errorTab: 'info' });
  });

  /** Khi Sửa, SKU và tồn kho là dữ liệu thật lưu riêng; dữ liệu giữ chỗ không được chặn nút Lưu. */
  it('không validate SKU, ảnh và tồn đầu ở chế độ Sửa', async () => {
    await expect(
      validateProductTabs(formWithFailingFields(['variants.0.name', 'images', 'initialWarehouseCode']), 'edit'),
    ).resolves.toEqual({ isValid: true });
  });

  it('chỉ xét tab đang hiển thị', async () => {
    await expect(
      validateProductTabs(formWithFailingFields(['specifications']), 'create', ['info', 'variants']),
    ).resolves.toEqual({ isValid: true });
  });
});

describe('tab theo loại sản phẩm', () => {
  it('chỉ hiện tab Combo cho sản phẩm combo', () => {
    expect(visibleProductTabs(ProductType.STANDARD)).not.toContain('bundle');
    expect(visibleProductTabs(ProductType.BUNDLE)).toContain('bundle');
  });

  it('liệt kê từng ô của mọi biến thể ở tab SKU khi tạo', () => {
    expect(productTabFields('variants', 'create', 2)).toContain('variants.1.price');
    expect(productTabFields('variants', 'edit', 2)).toEqual([]);
  });
});

describe('adjacentTab', () => {
  it('đi tới và lùi lại theo thứ tự tab đang hiển thị', () => {
    const tabs = visibleProductTabs(ProductType.STANDARD);
    expect(adjacentTab('info', 1, tabs)).toBe('variants');
    expect(adjacentTab('stock', 1, tabs)).toBe('review');
  });

  it('không có tab nào ngoài hai đầu', () => {
    expect(adjacentTab('info', -1)).toBeUndefined();
    expect(adjacentTab('review', 1)).toBeUndefined();
  });
});
