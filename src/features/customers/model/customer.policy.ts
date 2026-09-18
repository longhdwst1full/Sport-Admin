import type { CustomerRowView } from './customer.mapper';

type CustomerDeleteFacts = Pick<CustomerRowView, 'kind' | 'orderCount'>;

/**
 * Mirrors server delete invariants so Admin can disable an action guaranteed to fail.
 * Backend remains authoritative because these facts may change after the list was loaded.
 */
export function getCustomerDeleteBlockReason(customer: CustomerDeleteFacts): string | undefined {
  if (customer.orderCount > 0) return 'Khách đã có đơn nên chỉ ngừng được, không xoá';
  if (customer.kind === 'MEMBER') {
    return 'Khách có tài khoản đăng nhập nên chỉ ngừng được, không xoá';
  }
  return undefined;
}
