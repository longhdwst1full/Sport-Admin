import { describe, expect, it } from 'vitest';
import type { EmailTemplateDto } from '@/generated/api/notifications/notifications.schemas';
import {
  insertAtSelection,
  isEmailTemplateEditable,
  toEmailTemplateForm,
  toEmailTemplateRow,
  toEmailTemplateVariables,
  toResetEmailTemplatePayload,
  toUpdateEmailTemplatePayload,
} from './email-template.mapper';

const dto: EmailTemplateDto = {
  eventType: 'order.placed',
  label: 'Đã nhận đơn hàng',
  sendWhen: 'Ngay sau khi khách đặt đơn thành công.',
  variables: [{ name: 'orderNo', label: 'Mã đơn hàng', example: 'DH2610-0012', isMoney: false }],
  subject: '',
  intro: '',
  defaultSubjectExample: 'Đã nhận đơn hàng DH2610-0012',
  isCustomized: false,
  subjectParameterCode: 'EMAIL_SUBJECT_ORDER_PLACED',
  introParameterCode: 'EMAIL_INTRO_ORDER_PLACED',
  subjectVersion: '2',
  introVersion: '5',
  updatedAt: '2026-10-01T02:00:00.000Z',
};

describe('email template mapper', () => {
  it('row dùng ví dụ tiêu đề mặc định khi chưa tuỳ chỉnh', () => {
    expect(toEmailTemplateRow(dto)).toMatchObject({
      subjectPreview: 'Đã nhận đơn hàng DH2610-0012',
      isCustomized: false,
      updatedAtLabel: '—',
      editable: true,
    });
    expect(toEmailTemplateRow({ ...dto, subject: 'Đơn {{orderNo}}', isCustomized: true }).subjectPreview).toBe(
      'Đơn {{orderNo}}',
    );
  });

  it('không sửa được khi tham số chưa có version', () => {
    expect(isEmailTemplateEditable({ subjectVersion: null, introVersion: '1' })).toBe(false);
  });

  it('biến có token {{name}}', () => {
    expect(toEmailTemplateVariables(dto)[0].token).toBe('{{orderNo}}');
  });

  it('mẫu chữ thuần cũ được đổi thành HTML cho editor; HTML giữ nguyên', () => {
    expect(toEmailTemplateForm({ subject: 'S', intro: 'Dòng 1 & 2\nDòng 2' }).intro).toBe('Dòng 1 &amp; 2<br>Dòng 2');
    expect(toEmailTemplateForm({ subject: 'S', intro: '<p>Chào</p>' }).intro).toBe('<p>Chào</p>');
  });

  it('payload lưu trim và mang version của cả hai tham số; khôi phục = rỗng', () => {
    expect(toUpdateEmailTemplatePayload({ subject: '  Đơn {{orderNo}} ', intro: ' <p>x</p> ' }, dto)).toEqual({
      subject: 'Đơn {{orderNo}}',
      intro: '<p>x</p>',
      subjectVersion: '2',
      introVersion: '5',
    });
    expect(toResetEmailTemplatePayload(dto)).toEqual({ subject: '', intro: '', subjectVersion: '2', introVersion: '5' });
  });

  it('chèn biến tại vùng chọn của ô tiêu đề', () => {
    expect(insertAtSelection('Đơn  đã nhận', '{{orderNo}}', 4, 4)).toEqual({
      value: 'Đơn {{orderNo}} đã nhận',
      caret: 15,
    });
    expect(insertAtSelection('abc', '{{x}}', 1, 3)).toEqual({ value: 'a{{x}}', caret: 6 });
    expect(insertAtSelection('abc', '{{x}}', null, null)).toEqual({ value: 'abc{{x}}', caret: 8 });
  });
});
