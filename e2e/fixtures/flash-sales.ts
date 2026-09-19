/** Factory dữ liệu flash sale cho e2e — khớp `FlashSaleCampaignSummaryDto`. */

export function flashSaleSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    code: 'FS-202609-001',
    name: 'Flash Sale Tháng 9',
    startsAt: '2026-09-15T00:00:00Z',
    endsAt: '2026-09-20T23:59:59Z',
    itemCount: 10,
    status: 'ACTIVE',
    version: 1,
    ...overrides,
  };
}

export function flashSaleListResponse(
  items = [flashSaleSummary()],
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
