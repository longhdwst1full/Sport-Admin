/** Factory dữ liệu IAM (users, roles, audit) cho e2e — khớp `UserDto` và `RoleDto`. */

export function userSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    displayName: 'Nguyễn Quản Trị',
    maskedEmail: 'ad***@baoansport.vn',
    userType: 'STAFF',
    status: 'ACTIVE',
    permissionVersion: 1,
    failedLoginAttempts: 0,
    mustChangePassword: false,
    assignments: [],
    ...overrides,
  };
}

export function userListResponse(
  items = [userSummary()],
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

export function roleSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    code: 'STAFF',
    name: 'Nhân viên bán hàng',
    description: 'Bán hàng tại quầy và xem đơn',
    status: 'ACTIVE',
    system: false,
    permissionCodes: ['order.view', 'pos.manage'],
    version: 1,
    ...overrides,
  };
}

export function roleListResponse(
  items = [roleSummary()],
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

export function auditLogSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    requestId: 'req-1',
    sequenceNo: 1,
    actorType: 'USER',
    actorUserId: '1',
    actorDisplayName: 'Nguyễn Quản Trị',
    action: 'CREATE',
    entityType: 'PRODUCT',
    entityId: '1',
    reason: 'Tạo sản phẩm mới',
    createdAt: '2026-09-01T10:00:00Z',
    ...overrides,
  };
}

export function auditLogListResponse(
  items = [auditLogSummary()],
  nextCursor: string | null = null,
) {
  return {
    items,
    nextCursor,
  };
}
