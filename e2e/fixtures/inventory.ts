/** Factory dữ liệu tồn kho cho e2e — khớp `InventoryBalanceDto`. */

export function inventorySummary(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    warehouseCode: 'WH-HN',
    sku: 'SKU-001',
    productName: 'Giày chạy bộ E2E',
    onHand: 50,
    reserved: 5,
    available: 45,
    reorderPoint: 10,
    status: 'IN_STOCK',
    ...overrides,
  };
}

export function inventoryListResponse(
  items = [inventorySummary()],
  meta: Partial<{ page: number; limit: number; total: number; totalPages: number }> = {},
) {
  const limit = meta.limit ?? 25;
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
