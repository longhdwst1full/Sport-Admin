/** Factory dữ liệu chi nhánh / tổ chức cho e2e — khớp `BranchDto`. */

export function branchSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    name: 'Showroom Hà Nội',
    code: 'HN-01',
    address: {
      addressLine: 'Số 234 Định Công',
      district: 'Hoàng Mai',
      province: 'Hà Nội',
    },
    phone: '0939987456',
    email: 'hanoi@baoansport.vn',
    status: 'ACTIVE',
    timezone: 'Asia/Ho_Chi_Minh',
    version: 1,
    ...overrides,
  };
}

export function branchListResponse(
  items = [branchSummary()],
  meta: Partial<{ page: number; limit: number; total: number; totalPages: number }> = {},
) {
  const limit = meta.limit ?? 20;
  const total = meta.total ?? items.length;
  return {
    items,
    total,
    meta: {
      page: meta.page ?? 1,
      limit,
      total,
      totalPages: meta.totalPages ?? Math.max(1, Math.ceil(total / limit)),
    },
  };
}
