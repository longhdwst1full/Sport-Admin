/** Factory dữ liệu giao hàng / fulfillments cho e2e — khớp `AdminFulfillmentListDto`. */

export function fulfillmentSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    fulfillmentNo: 'FUL-20260901-001',
    orderId: '1',
    orderNo: 'ORD-20260901-001',
    warehouseId: '1',
    warehouseName: 'Kho Hà Nội',
    status: 'READY_TO_SHIP',
    carrierCode: 'GHN',
    trackingNo: 'GHN-123456789',
    recipientName: 'Nguyễn Văn A',
    recipientPhone: '0901234567',
    recipientEmail: 'a@example.com',
    createdAt: '2026-09-01T10:00:00.000Z',
    version: '1',
    ...overrides,
  };
}

export function fulfillmentListResponse(
  items = [fulfillmentSummary()],
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
