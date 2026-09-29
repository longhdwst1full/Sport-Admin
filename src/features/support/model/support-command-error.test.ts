import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/fetcher';
import {
  SUPPORT_ERROR_CODE,
  SUPPORT_STALE_ERROR_CODES,
} from '../constants/support.constants';
import { supportCommandErrorMessage } from './support-command-error';

const apiError = (code: string, message = 'server message') =>
  new ApiError(409, { statusCode: 409, code, message });

describe('supportCommandErrorMessage', () => {
  it.each([
    SUPPORT_ERROR_CODE.VERSION_CONFLICT,
    SUPPORT_ERROR_CODE.CONCURRENT_UPDATE,
    SUPPORT_ERROR_CODE.INVALID_TRANSITION,
  ])('explains the reload for %s', (code) => {
    expect(supportCommandErrorMessage(apiError(code))).toContain('tải lại');
  });

  it('has specific messages for closed, idempotency and assignee errors', () => {
    expect(supportCommandErrorMessage(apiError(SUPPORT_ERROR_CODE.TICKET_CLOSED))).toContain('đã đóng');
    expect(supportCommandErrorMessage(apiError(SUPPORT_ERROR_CODE.IDEMPOTENCY_CONFLICT))).toContain('gửi lại');
    expect(supportCommandErrorMessage(apiError(SUPPORT_ERROR_CODE.ASSIGNEE_INVALID))).toContain('Người được chọn');
  });

  it('falls back to the API message for unknown codes', () => {
    expect(supportCommandErrorMessage(apiError('SUPPORT_OTHER', 'boom'))).toBe('boom');
  });

  it('falls back to Error message or default for non-API errors', () => {
    expect(supportCommandErrorMessage(new Error('network'))).toBe('network');
    expect(supportCommandErrorMessage('x')).toBe('Có lỗi xảy ra. Vui lòng thử lại.');
  });
});

describe('SUPPORT_STALE_ERROR_CODES (reload behavior)', () => {
  it('reloads on version/concurrent/transition/closed errors only', () => {
    expect([...SUPPORT_STALE_ERROR_CODES].sort()).toEqual(
      [
        SUPPORT_ERROR_CODE.VERSION_CONFLICT,
        SUPPORT_ERROR_CODE.CONCURRENT_UPDATE,
        SUPPORT_ERROR_CODE.INVALID_TRANSITION,
        SUPPORT_ERROR_CODE.TICKET_CLOSED,
      ].sort(),
    );
  });

  it('does not reload for idempotency (the key is dropped instead) or assignee errors', () => {
    expect(SUPPORT_STALE_ERROR_CODES.has(SUPPORT_ERROR_CODE.IDEMPOTENCY_CONFLICT)).toBe(false);
    expect(SUPPORT_STALE_ERROR_CODES.has(SUPPORT_ERROR_CODE.ASSIGNEE_INVALID)).toBe(false);
  });
});
