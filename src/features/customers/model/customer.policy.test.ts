import { describe, expect, it } from 'vitest';
import { getCustomerDeleteBlockReason } from './customer.policy';

describe('getCustomerDeleteBlockReason', () => {
  it('blocks customers referenced by orders', () => {
    expect(getCustomerDeleteBlockReason({ kind: 'GUEST', orderCount: 1 })).toContain('đã có đơn');
  });

  it('blocks members even when they have no order', () => {
    expect(getCustomerDeleteBlockReason({ kind: 'MEMBER', orderCount: 0 })).toContain(
      'tài khoản đăng nhập',
    );
  });

  it('allows an unreferenced guest profile', () => {
    expect(getCustomerDeleteBlockReason({ kind: 'GUEST', orderCount: 0 })).toBeUndefined();
  });
});
