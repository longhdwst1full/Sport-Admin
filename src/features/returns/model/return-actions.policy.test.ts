import { describe, expect, it } from 'vitest';
import { availableReturnActions, nextIdempotencyKey } from './return-actions.policy';

const all = new Set([
  'return.decide',
  'return.receive',
  'payment.refund.request',
  'payment.refund.approve',
]);
const refund = (status: 'PENDING' | 'SUCCEEDED' | 'FAILED') => ({ status }) as never;

describe('availableReturnActions', () => {
  it('offers decisions only while the return waits for approval', () => {
    expect(availableReturnActions({ status: 'REQUESTED', refunds: [], refundableAmount: '0.00' }, all))
      .toEqual(['approve', 'reject', 'cancel']);
  });

  it('lets warehouse staff receive but not decide', () => {
    const staff = new Set(['return.receive']);
    expect(availableReturnActions({ status: 'APPROVED', refunds: [], refundableAmount: '0.00' }, staff))
      .toEqual(['receive']);
  });

  it('offers a refund only while money is still refundable', () => {
    expect(availableReturnActions({ status: 'RECEIVED', refunds: [], refundableAmount: '350000.00' }, all))
      .toEqual(['requestRefund', 'close']);
    expect(availableReturnActions({ status: 'RECEIVED', refunds: [], refundableAmount: '0.00' }, all))
      .toEqual(['close']);
  });

  it('forces the pending refund to be settled before anything else', () => {
    expect(availableReturnActions({ status: 'RECEIVED', refunds: [refund('PENDING')], refundableAmount: '0.00' }, all))
      .toEqual(['confirmRefund', 'failRefund']);
  });

  it('hides confirmation from staff who can only request refunds', () => {
    const cashier = new Set(['payment.refund.request']);
    expect(availableReturnActions({ status: 'RECEIVED', refunds: [refund('PENDING')], refundableAmount: '0.00' }, cashier))
      .toEqual([]);
  });

  it('offers nothing on a finished return', () => {
    for (const status of ['REJECTED', 'CANCELLED', 'CLOSED'] as const) {
      expect(availableReturnActions({ status, refunds: [], refundableAmount: '0.00' }, all)).toEqual([]);
    }
  });
});

describe('nextIdempotencyKey', () => {
  it('reuses the key for the same command and renews it when the command changes', () => {
    const first = nextIdempotencyKey(undefined, 'approve:1:3:SHOP', () => 'k1');
    expect(nextIdempotencyKey(first, 'approve:1:3:SHOP', () => 'k2')).toBe(first);
    expect(nextIdempotencyKey(first, 'approve:1:3:CUSTOMER', () => 'k2').key).toBe('k2');
  });
});
