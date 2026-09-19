/** Factory dữ liệu tham số hệ thống cho e2e — khớp `SystemParameterDto`. */

export function systemParamSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    code: 'MAX_CART_ITEMS',
    groupCode: 'ORDER',
    label: 'Số lượng tối đa trong giỏ',
    valueType: 'NUMBER',
    value: '50',
    defaultValue: '50',
    description: 'Số lượng sản phẩm tối đa trong một giỏ hàng.',
    status: 'ACTIVE',
    isPublic: true,
    isSystem: true,
    isSecret: false,
    version: '1',
    updatedAt: '2026-09-01T10:00:00Z',
    ...overrides,
  };
}

export function systemParamListResponse(
  items = [systemParamSummary()],
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
