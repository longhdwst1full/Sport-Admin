import type { AdminCustomerSummaryDto } from '../../src/generated/api/customers/customers.schemas';

/** DTO của API thật; mỗi spec chỉ thay trường liên quan đến hành vi cần kiểm. */
export function customerSummary(
  overrides: Partial<AdminCustomerSummaryDto> = {},
): AdminCustomerSummaryDto {
  return {
    id: '101',
    customerNo: 'KH-000101',
    name: 'Nguyễn Minh Anh',
    email: 'minh.anh@example.com',
    phone: '+84912345678',
    status: 'ACTIVE',
    kind: 'GUEST',
    marketingConsent: false,
    orderCount: 0,
    lifetimeValue: '0',
    lastOrderAt: null,
    avatarAssetId: null,
    avatarUrl: null,
    createdAt: '2026-09-18T00:00:00.000Z',
    version: 1,
    ...overrides,
  };
}

export function customerListResponse(items = [customerSummary()]) {
  return { items, page: 1, limit: 20, total: items.length };
}
