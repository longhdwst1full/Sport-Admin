import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/fetcher';
import { SOCIAL_ERROR_CODE } from '../constants/social.constants';
import { isFacebookNotConfigured, socialCommandErrorMessage } from './social-command-error';

const apiError = (code: string, status = 409, message = 'server message') =>
  new ApiError(status, { statusCode: status, code, message });

describe('socialCommandErrorMessage', () => {
  it('has a Vietnamese message for every stable SOCIAL_* code', () => {
    for (const code of Object.values(SOCIAL_ERROR_CODE)) {
      expect(socialCommandErrorMessage(apiError(code))).not.toBe('server message');
    }
  });

  it('explains reload cases', () => {
    expect(socialCommandErrorMessage(apiError(SOCIAL_ERROR_CODE.VERSION_STALE))).toContain('tải lại');
  });

  it('falls back to the API message for unknown codes', () => {
    expect(socialCommandErrorMessage(apiError('SOCIAL_OTHER', 400, 'boom'))).toBe('boom');
  });
});

describe('isFacebookNotConfigured', () => {
  it('detects the 503 configuration error only', () => {
    expect(isFacebookNotConfigured(apiError(SOCIAL_ERROR_CODE.NOT_CONFIGURED, 503))).toBe(true);
    expect(isFacebookNotConfigured(apiError(SOCIAL_ERROR_CODE.FACEBOOK_ERROR, 502))).toBe(false);
    expect(isFacebookNotConfigured(new Error('x'))).toBe(false);
  });
});
