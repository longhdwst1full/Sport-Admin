/** Factory dữ liệu đánh giá cho e2e — khớp `ProductReviewDto`. */

export function reviewSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    productSlug: 'giay-chay-bo-e2e',
    customerDisplayName: 'Nguyễn Văn B',
    rating: 5,
    title: 'Sản phẩm rất tốt',
    content: 'Giày êm, vừa vặn, giao hàng nhanh.',
    verifiedPurchase: true,
    status: 'APPROVED',
    version: 1,
    comments: [],
    createdAt: '2026-09-01T10:00:00Z',
    ...overrides,
  };
}

export function reviewListResponse(
  items = [reviewSummary()],
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
