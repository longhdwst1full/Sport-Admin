import { describe, expect, it } from 'vitest';
import type { ProductDetailDto } from '@/generated/api/catalog/models';
import { buildPriceCommand } from './product-workflow.policy';

const product = (overrides: Partial<ProductDetailDto> = {}): ProductDetailDto => ({
  id: '00000000-0000-7000-8000-000000000001',
  productNo: 'SP-001',
  name: 'Product',
  slug: 'product',
  productType: 'STANDARD',
  status: 'DRAFT',
  isPublished: false,
  version: 0,
  currency: 'VND',
  categoryIds: [],
  variants: [],
  media: [],
  categories: [],
  ...overrides,
});

describe('product workflow policy', () => {


  it('builds an optimistic replace command when the current price identity is available', () => {
    const command = buildPriceCommand(product({
      variants: [{
        weightGrams: 0,
        id: '00000000-0000-7000-8000-000000000002',
        sku: 'SKU-01',
        name: 'SKU',
        status: 'ACTIVE',
        version: 0,
        effectivePrice: '100000.00',
        effectivePriceId: '00000000-0000-7000-8000-000000000003',
        effectivePriceVersion: 4,
      }],
    }), {
      variantId: '00000000-0000-7000-8000-000000000002',
      amount: '120000.00',
      startsAt: '2026-09-02T12:00',
    });

    expect(command).toMatchObject({
      kind: 'replace',
      data: {
        expectedCurrentPriceId: '00000000-0000-7000-8000-000000000003',
        expectedCurrentPriceVersion: 4,
      },
    });
  });
});
