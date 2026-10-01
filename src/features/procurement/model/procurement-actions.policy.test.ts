import { describe, expect, it } from 'vitest';
import { goodsReceiptActions, purchaseOrderActions, supplierReturnActions } from './procurement-actions.policy';

describe('procurement action policy', () => {
  it('không cho sửa chứng từ đã ghi sổ hoặc đã đóng', () => {
    expect(goodsReceiptActions('POSTED')).toEqual([]);
    expect(purchaseOrderActions('CLOSED')).toEqual([]);
    expect(supplierReturnActions('CLOSED')).toEqual([]);
  });

  it('chỉ mở action phù hợp với trạng thái hiện tại', () => {
    expect(purchaseOrderActions('DRAFT')).toEqual(['edit', 'submit', 'cancel']);
    expect(goodsReceiptActions('DRAFT')).toEqual(['edit', 'post', 'cancel']);
    expect(supplierReturnActions('APPROVED')).toEqual(['ship', 'cancel']);
  });

  it('tách hai bước duyệt cho PO vượt ngưỡng tài chính', () => {
    expect(purchaseOrderActions({ status: 'SUBMITTED', approvalLevel: 'BRANCH_MANAGER' })).toEqual(['approve', 'cancel']);
    expect(purchaseOrderActions({ status: 'SUBMITTED', approvalLevel: 'OWNER_FINANCE' })).toEqual(['approve', 'cancel']);
    expect(
      purchaseOrderActions({ status: 'SUBMITTED', approvalLevel: 'OWNER_FINANCE', approvals: { approvedBy: { id: '1' } } }),
    ).toEqual(['approveFinance', 'cancel']);
  });
});
