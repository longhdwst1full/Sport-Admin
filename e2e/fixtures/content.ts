/** Factory dữ liệu bài viết / CMS cho e2e — khớp `ContentPostDto`. */

export function contentSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    title: 'Hướng dẫn chọn giày chạy bộ',
    slug: 'huong-dan-chon-giay-chay-bo',
    postType: 'BUYING_GUIDE',
    isPublished: true,
    excerpt: 'Cách chọn giày chạy bộ phù hợp cho người mới bắt đầu.',
    body: '<p>Nội dung hướng dẫn chi tiết...</p>',
    coverUrl: 'https://example.com/cover.jpg',
    relatedProductSlugs: [],
    publishedAt: '2026-09-01T10:00:00Z',
    status: 'PUBLISHED',
    version: 1,
    ...overrides,
  };
}

export function contentListResponse(
  items = [contentSummary()],
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
