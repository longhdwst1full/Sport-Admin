import { describe, expect, it } from 'vitest';
import { availableStockTransferActions } from './stock-transfer-actions.policy';

const all = new Set(['inventory.transfer.create', 'inventory.transfer.ship', 'inventory.transfer.receive']);

describe('availableStockTransferActions', () => {
  it('DRAFT: sửa, gửi và huỷ khi có quyền tạo phiếu', () => {
    expect(availableStockTransferActions('DRAFT', all)).toEqual(['cancel', 'edit', 'submit']);
  });

  it('SUBMITTED: huỷ cần quyền tạo, xuất cần quyền ship; không còn sửa', () => {
    expect(availableStockTransferActions('SUBMITTED', all)).toEqual(['cancel', 'ship']);
    expect(availableStockTransferActions('SUBMITTED', new Set(['inventory.transfer.ship']))).toEqual(['ship']);
  });

  it('SHIPPED/RECEIVED/CANCELLED không cho huỷ hay sửa', () => {
    expect(availableStockTransferActions('SHIPPED', all)).toEqual(['receive']);
    expect(availableStockTransferActions('RECEIVED', all)).toEqual([]);
    expect(availableStockTransferActions('CANCELLED', all)).toEqual([]);
  });

  it('không có quyền thì không có thao tác nào', () => {
    for (const status of ['DRAFT', 'SUBMITTED', 'SHIPPED'] as const) {
      expect(availableStockTransferActions(status, new Set())).toEqual([]);
    }
  });
});
