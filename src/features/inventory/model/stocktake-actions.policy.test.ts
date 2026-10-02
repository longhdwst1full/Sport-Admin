import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/fetcher';
import {
  availableStocktakeActions,
  getStocktakeErrorMessage,
  isSelfApprovalError,
  stocktakeApproveGate,
} from './stocktake-actions.policy';

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

describe('stocktakeApproveGate', () => {
  it('SUBMITTED + canApprove=true: bật', () => {
    expect(stocktakeApproveGate('SUBMITTED', true)).toEqual({ disabled: false });
  });

  it('SUBMITTED + canApprove=false: khoá kèm tooltip', () => {
    expect(stocktakeApproveGate('SUBMITTED', false)).toEqual({
      disabled: true,
      tooltip: 'Người tạo phiếu không được tự duyệt — cần người khác duyệt.',
    });
  });

  it('trạng thái khác SUBMITTED: không áp gate', () => {
    expect(stocktakeApproveGate('DRAFT', false)).toEqual({ disabled: false });
    expect(stocktakeApproveGate('APPROVED', false)).toEqual({ disabled: false });
  });
});

describe('stocktake self-approval error', () => {
  const selfApproval = new ApiError(403, { statusCode: 403, code: 'STOCKTAKE_SELF_APPROVAL', message: 'raw' });
  const other = new ApiError(409, { statusCode: 409, code: 'STOCKTAKE_VERSION_STALE', message: 'Phiếu đã đổi' });

  it('map STOCKTAKE_SELF_APPROVAL sang thông điệp cố định', () => {
    expect(isSelfApprovalError(selfApproval)).toBe(true);
    expect(getStocktakeErrorMessage(selfApproval, 'fb')).toBe('Người tạo phiếu kiểm kê không được tự duyệt.');
  });

  it('lỗi khác giữ message của API', () => {
    expect(isSelfApprovalError(other)).toBe(false);
    expect(getStocktakeErrorMessage(other, 'fb')).toBe('Phiếu đã đổi');
  });
});
