/** Factory dữ liệu đơn hàng cho e2e — khớp `AdminOrderSummaryDto`. */

export function orderSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    orderNo: 'ORD-20260901-001',
    status: 'CONFIRMED',
    paymentStatus: 'SUCCESS',
    fulfillmentStatus: 'READY_TO_SHIP',
    paymentMethod: 'BANK_TRANSFER',
    shippingMethod: 'STANDARD',
    branchId: '1',
    branchName: 'Chi nhánh Cầu Giấy',
    warehouseName: 'Kho Cầu Giấy',
    grandTotal: '1500000',
    itemCount: 2,
    recipient: {
      name: 'Nguyễn Văn A',
      phone: '0901234567',
      address: 'Số 123 Đường Cầu Giấy, Hà Nội',
    },
    placedAt: '2026-09-01T10:00:00Z',
    version: 1,
    ...overrides,
  };
}

export function orderListResponse(
  items = [orderSummary()],
  meta: Partial<{ page: number; limit: number; total: number; totalPages: number }> = {},
) {
  const limit = meta.limit ?? 20;
  const page = meta.page ?? 1;
  const total = meta.total ?? items.length;
  return {
    items,
    page,
    limit,
    total,
    meta: {
      page,
      limit,
      total,
      totalPages: meta.totalPages ?? Math.max(1, Math.ceil(total / limit)),
    },
  };
}
