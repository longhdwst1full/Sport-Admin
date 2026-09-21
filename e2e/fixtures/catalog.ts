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
    productType: 'STANDARD',
    status: 'PUBLISHED',
    isPublished: true,
    version: 1,
    minPrice: '990000',
    currency: 'VND',
    imageUrl: null,
    ...overrides,
  };
}

export function productDetail(overrides: Record<string, unknown> = {}) {
  return productSummary({
    brandId: '1',
    primaryCategoryId: '1',
    shortDescription: 'Sản phẩm dùng cho kiểm thử giao diện quản trị',
    description: '<p>Mô tả sản phẩm</p>',
    categoryIds: ['1'],
    categories: [{ id: '1', name: 'Giày', isPrimary: true }],
    variants: [
      {
        id: '11',
        sku: 'SKU-001',
        name: 'Mặc định',
        weightGrams: 850,
        lengthMm: 300,
        widthMm: 120,
        heightMm: 110,
        status: 'ACTIVE',
        version: 0,
        effectivePrice: '990000.00',
        effectivePriceId: '21',
        effectivePriceVersion: 0,
        bundle: null,
      },
    ],
    media: [],
    ...overrides,
  });
}

export function productListResponse(
  items = [productSummary()],
  meta: Partial<{ page: number; limit: number; total: number; totalPages: number }> = {},
) {
  const limit = meta.limit ?? 30;
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
