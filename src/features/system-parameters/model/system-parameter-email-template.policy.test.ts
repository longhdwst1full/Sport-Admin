import { describe, expect, it } from 'vitest';
import { isEmailTemplateParameter } from './system-parameter-email-template.policy';

describe('isEmailTemplateParameter', () => {
  it('nhận cặp tham số mẫu email, bỏ qua tham số khác cùng nhóm', () => {
    expect(isEmailTemplateParameter('EMAIL_SUBJECT_ORDER_PLACED')).toBe(true);
    expect(isEmailTemplateParameter('EMAIL_INTRO_REFUND_FAILED')).toBe(true);
    expect(isEmailTemplateParameter('NOTIFICATION_DISPATCH_JOB_ENABLED')).toBe(false);
  });
});
