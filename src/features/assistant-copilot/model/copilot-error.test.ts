import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/fetcher';
import { ACTION_DRAFT_ERROR_CODE, ACTION_DRAFT_FAILURE_CODE, COPILOT_ERROR_CODE } from '../constants/copilot.constants';
import {
  actionDraftErrorMessage,
  actionDraftFailureMessage,
  copilotErrorKind,
  copilotErrorMessage,
} from './copilot-error';

const apiError = (status: number, code: string, message = 'server message') =>
  new ApiError(status, { statusCode: status, code, message });

describe('copilotErrorKind / copilotErrorMessage', () => {
  it('maps ASSISTANT_UNAVAILABLE (503) to "Trợ lý đang tạm ngưng"', () => {
    const error = apiError(503, COPILOT_ERROR_CODE.UNAVAILABLE);
    expect(copilotErrorKind(error)).toBe('unavailable');
    expect(copilotErrorMessage(error)).toBe('Trợ lý đang tạm ngưng');
  });

  it('treats any 503 as unavailable even without a payload code', () => {
    expect(copilotErrorKind(new ApiError(503, undefined))).toBe('unavailable');
  });

  it('maps quota (code or 429) to a retry-later message', () => {
    expect(copilotErrorKind(apiError(429, COPILOT_ERROR_CODE.QUOTA_EXCEEDED))).toBe('quota');
    expect(copilotErrorKind(new ApiError(429, undefined))).toBe('quota');
    expect(copilotErrorMessage(apiError(429, COPILOT_ERROR_CODE.QUOTA_EXCEEDED))).toContain('hết lượt');
  });

  it('maps 403 to a permission message, with a branch-scope variant', () => {
    expect(copilotErrorKind(apiError(403, 'FORBIDDEN'))).toBe('forbidden');
    expect(copilotErrorMessage(apiError(403, 'FORBIDDEN'))).toContain('không có quyền');
    expect(copilotErrorMessage(apiError(403, COPILOT_ERROR_CODE.BRANCH_SCOPE_DENIED))).toContain('phạm vi chi nhánh');
  });

  it('detects a closed or missing conversation', () => {
    expect(copilotErrorKind(apiError(409, COPILOT_ERROR_CODE.CONVERSATION_CLOSED))).toBe('conversation-gone');
    expect(copilotErrorKind(apiError(404, COPILOT_ERROR_CODE.CONVERSATION_NOT_FOUND))).toBe('conversation-gone');
  });

  it('explains a non-staff principal', () => {
    expect(copilotErrorMessage(apiError(403, COPILOT_ERROR_CODE.STAFF_USER_REQUIRED))).toContain('nhân viên thật');
  });

  it('has specific messages for input and turn errors, and falls back to the API message', () => {
    expect(copilotErrorMessage(apiError(400, COPILOT_ERROR_CODE.INPUT_TOO_LONG))).toContain('quá dài');
    expect(copilotErrorMessage(apiError(409, COPILOT_ERROR_CODE.TURN_IN_PROGRESS))).toContain('đang trả lời');
    expect(copilotErrorMessage(apiError(400, 'OTHER', 'boom'))).toBe('boom');
  });
});

describe('actionDraftErrorMessage', () => {
  it('explains expiry, concurrent decisions and payload changes', () => {
    expect(actionDraftErrorMessage(apiError(409, ACTION_DRAFT_ERROR_CODE.EXPIRED))).toContain('hết hạn');
    expect(actionDraftErrorMessage(apiError(409, ACTION_DRAFT_ERROR_CODE.NOT_PENDING))).toContain('tải lại');
    expect(actionDraftErrorMessage(apiError(409, ACTION_DRAFT_ERROR_CODE.VERSION_CONFLICT))).toContain('tải lại');
    expect(actionDraftErrorMessage(apiError(409, ACTION_DRAFT_ERROR_CODE.PAYLOAD_HASH_MISMATCH))).toContain('xem lại');
    expect(actionDraftErrorMessage(apiError(409, ACTION_DRAFT_ERROR_CODE.EXECUTION_IN_PROGRESS))).toContain('đang được thực hiện');
  });

  it('maps ASSISTANT_DRAFT_PERMISSION_DENIED and not-found', () => {
    expect(actionDraftErrorMessage(apiError(403, ACTION_DRAFT_ERROR_CODE.PERMISSION_DENIED))).toContain('điều chỉnh tồn');
    expect(actionDraftErrorMessage(apiError(404, ACTION_DRAFT_ERROR_CODE.NOT_FOUND))).toContain('Không tìm thấy');
  });

  it('maps 403 to the stock-adjust permission message', () => {
    expect(actionDraftErrorMessage(apiError(403, 'FORBIDDEN'))).toContain('điều chỉnh tồn');
  });

  it('delegates assistant-level errors (e.g. unavailable)', () => {
    expect(actionDraftErrorMessage(apiError(503, COPILOT_ERROR_CODE.UNAVAILABLE))).toBe('Trợ lý đang tạm ngưng');
  });
});

describe('actionDraftFailureMessage', () => {
  it('explains a stock change (FAILED errorCode) and suggests asking again', () => {
    expect(actionDraftFailureMessage(ACTION_DRAFT_FAILURE_CODE.STOCK_CHANGED)).toContain('Tồn kho đã thay đổi');
  });

  it('shows the raw code for unknown failures and a default when absent', () => {
    expect(actionDraftFailureMessage('INVENTORY_X')).toContain('INVENTORY_X');
    expect(actionDraftFailureMessage(undefined)).toBe('Không rõ nguyên nhân.');
  });
});
