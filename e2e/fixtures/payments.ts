/** Factory dữ liệu thanh toán cho e2e — khớp `AdminPaymentSummaryDto`. */

export function paymentSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    paymentRef: 'PAY-20260901-001',
    orderId: '1',
    orderNo: 'ORD-20260901-001',
    recipientName: 'Nguyễn Văn A',
    recipientPhone: '0901234567',
    method: 'BANK_TRANSFER',
    expectedAmount: '1500000',
    receivedAmount: '1500000',
    status: 'SUCCESS',
    createdAt: '2026-09-01T10:00:00Z',
    version: 1,
    ...overrides,
  };
}

export function paymentListResponse(
  items = [paymentSummary()],
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
