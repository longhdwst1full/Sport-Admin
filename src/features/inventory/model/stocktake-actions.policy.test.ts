import { describe, expect, it } from 'vitest';
import { availableStocktakeActions } from './stocktake-actions.policy';

const manage = new Set(['inventory.stocktake.manage']);

describe('availableStocktakeActions', () => {
  it('DRAFT: nhập đếm, nộp và huỷ', () => {
    expect(availableStocktakeActions('DRAFT', manage)).toEqual(['cancel', 'count', 'submit']);
  });

  it('SUBMITTED: chỉ còn duyệt và huỷ, không nhập đếm nữa', () => {
    expect(availableStocktakeActions('SUBMITTED', manage)).toEqual(['cancel', 'approve']);
  });

  it('APPROVED không có thao tác nào vì sổ kho là append-only', () => {
    expect(availableStocktakeActions('APPROVED', manage)).toEqual([]);
  });

  it('CANCELLED không có thao tác nào', () => {
    expect(availableStocktakeActions('CANCELLED', manage)).toEqual([]);
  });

  it('không có quyền thì không có thao tác nào', () => {
    for (const status of ['DRAFT', 'SUBMITTED', 'APPROVED', 'CANCELLED'] as const) {
      expect(availableStocktakeActions(status, new Set())).toEqual([]);
    }
  });
});
