import { describe, expect, it } from 'vitest';
import { ApiError } from './fetcher';
import { getApiErrorMessage, getApiFieldErrors } from './error';

describe('canonical API errors', () => {
  it('maps the generated v1 error envelope for form and notification use', () => {
    const error = new ApiError(400, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      requestId: 'request-123',
      details: [{ field: 'roleCode', code: 'IS_NOT_EMPTY', message: 'Role is required' }],
    });

    expect(getApiErrorMessage(error)).toBe('Request validation failed');
    expect(getApiFieldErrors(error)).toEqual({ roleCode: 'Role is required' });
  });
});

describe('transport errors without envelope', () => {
  it('falls back to the caller message instead of the internal English status text', () => {
    expect(getApiErrorMessage(new ApiError(502, '<html>Bad Gateway</html>'), 'Không thể tải dữ liệu.')).toBe(
      'Không thể tải dữ liệu.',
    );
    expect(getApiErrorMessage(new ApiError(0, undefined))).toBe('Có lỗi xảy ra. Vui lòng thử lại.');
  });
});
