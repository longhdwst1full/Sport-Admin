/** Factory dữ liệu catalog cho e2e — khớp `ProductListResponseDto` / `CategoryListDto`. */

export function productSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    defaultVariantId: '11',
    defaultVariantSku: 'SKU-001',
    productNo: 'P-0001',
    name: 'Giày chạy bộ E2E',
    slug: 'giay-chay-bo-e2e',
    brand: 'BaoAn',
    primaryCategory: 'Giày',
    productType: 'SIMPLE',
    status: 'PUBLISHED',
    version: 1,
    minPrice: '990000',
    currency: 'VND',
    imageUrl: null,
    ...overrides,
  };
}

export function productListResponse(
  items = [productSummary()],
  meta: Partial<{ page: number; limit: number; total: number; totalPages: number }> = {},
) {
  const limit = meta.limit ?? 20;
  const total = meta.total ?? items.length;
  return {
    items,
    meta: {
      page: meta.page ?? 1,
      limit,
      total,
      totalPages: meta.totalPages ?? Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export function categoryListResponse(
  items = [
    {
      id: '1',
      code: 'GIAY',
      name: 'Giày',
      slug: 'giay',
      path: '/giay',
      depth: 0,
      sortOrder: 1,
      status: 'ACTIVE',
      version: 1,
    },
  ],
) {
  return { items, total: items.length };
}
