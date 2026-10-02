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
  items: Array<Record<string, unknown>> = [contentSummary()],
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

/** Dòng danh sách gộp (`SocialPostSummaryDto`) của tab "Tất cả"/"Facebook". */
export function socialPostSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    postType: 'NEWS',
    title: 'Hướng dẫn chọn giày chạy bộ',
    excerpt: 'Cách chọn giày chạy bộ phù hợp cho người mới bắt đầu.',
    slug: 'huong-dan-chon-giay-chay-bo',
    status: 'PUBLISHED',
    isPublished: true,
    publishedAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    version: 1,
    coverUrl: 'https://example.com/cover.jpg',
    ...overrides,
  };
}

export function facebookSummary(overrides: Record<string, unknown> = {}) {
  return {
    status: 'PUBLISHED',
    publishType: 'PHOTOS',
    origin: 'ADMIN',
    postId: '111_222',
    publishAt: '2026-10-01T03:00:00Z',
    mediaCount: 1,
    metrics: { reach: 1520, engagements: 87 },
    ...overrides,
  };
}

/** Chi tiết `SocialPostDetailDto` cho drawer. */
export function socialPostDetail(overrides: Record<string, unknown> = {}, facebook: Record<string, unknown> = {}) {
  return {
    ...socialPostSummary({ id: '2', postType: 'SOCIAL', title: 'Flash sale cuối tuần', isPublished: false }),
    body: 'Giảm 30% toàn bộ giày chạy bộ',
    facebook: {
      ...facebookSummary({ status: 'PENDING_APPROVAL', postId: undefined, publishAt: undefined }),
      media: [{ id: '9', kind: 'IMAGE', url: 'https://example.com/a.jpg', active: true }],
      submittedBy: { id: '1', displayName: 'E2E Admin' },
      ...facebook,
    },
    ...overrides,
  };
}
