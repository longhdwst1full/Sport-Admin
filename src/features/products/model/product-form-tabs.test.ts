import { describe, expect, it, vi } from 'vitest';
import type { UseFormReturn } from 'react-hook-form';
import type { ProductFormValues } from './product-form.mapper';
import { adjacentTab, validateProductTabs } from './product-form-tabs';

function formWithFailingFields(failing: string[]): UseFormReturn<ProductFormValues> {
  return {
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
    await expect(validateProductTabs(formWithFailingFields(['variants']))).resolves.toEqual({
      isValid: false,
      errorTab: 'variants',
    });
  });

  it('ưu tiên tab đứng trước khi nhiều tab cùng lỗi', async () => {
    await expect(
      validateProductTabs(formWithFailingFields(['name', 'variants'])),
    ).resolves.toEqual({ isValid: false, errorTab: 'basic' });
  });
});

describe('adjacentTab', () => {
  it('đi tới và lùi lại theo thứ tự tab', () => {
    expect(adjacentTab('basic', 1)).toBe('media');
    expect(adjacentTab('variants', -1)).toBe('media');
  });

  it('không có tab nào ngoài hai đầu', () => {
    expect(adjacentTab('basic', -1)).toBeUndefined();
    expect(adjacentTab('review', 1)).toBeUndefined();
  });
});
