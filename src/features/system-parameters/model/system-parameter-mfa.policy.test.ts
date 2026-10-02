import { describe, expect, it } from 'vitest';
import { requiresMfaCode } from './system-parameter-mfa.policy';

describe('requiresMfaCode', () => {
  it('hỏi mã cho tham số bí mật', () => {
    expect(requiresMfaCode({ code: 'SEPAY_API_KEY', isSecret: true })).toBe(true);
  });

  it('hỏi mã cho ADMIN_MFA_ENFORCED dù không bí mật', () => {
    expect(requiresMfaCode({ code: 'ADMIN_MFA_ENFORCED', isSecret: false })).toBe(true);
  });

  it('không hỏi mã cho tham số nghiệp vụ thường', () => {
    expect(requiresMfaCode({ code: 'CART_MAX_ITEMS', isSecret: false })).toBe(false);
  });
});
