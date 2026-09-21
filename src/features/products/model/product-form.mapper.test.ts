import { describe, expect, it } from 'vitest';
import { CreateProductDtoProductType } from '@/generated/api/catalog/models';
import type { ProductDetailDto } from '@/generated/api/catalog/models';
import { toOpeningStockItems } from './product-opening-stock.mapper';
import { emptyVariant, toCreateProductDto } from './product-form.mapper';

describe('product form mapper', () => {
  it('maps product and multiple initial variants into the generated create contract', () => {
    const payload = toCreateProductDto({
      productType: CreateProductDtoProductType.STANDARD,
      name: '  Giày chạy bộ  ',
      brandId: '2',
      categoryIds: ['3'],
      primaryCategoryId: '3',
      shortDescription: '  Mô tả ngắn  ',
      description: '  <p>Chi tiết</p>  ',
      images: [],
      variants: [
        { ...emptyVariant(), name: ' Đen - 40 ', barcode: ' BAR-40 ', weightGrams: 850, openingQuantity: 8 },
        { ...emptyVariant(), name: 'Đen - 41', lengthMm: 300 },
      ],
    });

    expect(payload).toEqual({
      productType: 'STANDARD',
      name: 'Giày chạy bộ',
      brandId: '2',
      categoryIds: ['3'],
      primaryCategoryId: '3',
      shortDescription: 'Mô tả ngắn',
      description: '<p>Chi tiết</p>',
      variants: [
        { name: 'Đen - 40', barcode: 'BAR-40', weightGrams: 850 },
        { name: 'Đen - 41', weightGrams: 0, lengthMm: 300 },
      ],
    });
  });

  it('maps initial quantities to generated SKUs in identity order', () => {
    const createdProduct = {
      variants: [
        { id: '12', sku: 'SKU-SECOND' },
        { id: '11', sku: 'SKU-FIRST' },
      ],
    } as ProductDetailDto;

    expect(toOpeningStockItems([
      { ...emptyVariant(), name: 'Đen - 40', openingQuantity: 5 },
      { ...emptyVariant(), name: 'Đen - 41', openingQuantity: 0 },
    ], createdProduct)).toEqual([{ sku: 'SKU-FIRST', quantityDelta: 5 }]);
  });

  it('rejects an incomplete aggregate response instead of posting stock to the wrong SKU', () => {
    const createdProduct = {
      variants: [
        { id: '11', sku: 'SKU-FIRST' },
        { id: '12', sku: 'SKU-SECOND' },
      ],
    } as ProductDetailDto;

    expect(() => toOpeningStockItems([
      { ...emptyVariant(), name: 'Đen - 40', openingQuantity: 5 },
    ], createdProduct)).toThrow('Số SKU trả về không khớp');
  });
});
