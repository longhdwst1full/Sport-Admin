import { describe, expect, it } from 'vitest';
import type { ProductSummaryDto } from '@/generated/api/catalog/catalog.schemas';
import { toProductListRow } from './product-list.mapper';

describe('toProductListRow', () => {
  it('chuẩn hóa dữ liệu trình bày mà không sửa DTO', () => {
    const dto = {
      id: '12',
      slug: 'may-chay-bo',
      name: 'Máy chạy bộ',
      productNo: 'SP000012',
      brand: 'DCTD',
      primaryCategory: 'Cardio',
      imageUrl: null,
      minPrice: '12500000.00',
      productType: 'STANDARD',
      status: 'PUBLISHED',
      isPublished: true,
      version: 3,
    } as ProductSummaryDto;

    const row = toProductListRow(dto);

    expect(row.secondaryLabel).toBe('SP000012 · DCTD · Cardio');
    expect(row.priceLabel).toContain('12.500.000');
    expect(row).not.toHaveProperty('imageUrl');
    expect(dto.imageUrl).toBeNull();
  });
});
