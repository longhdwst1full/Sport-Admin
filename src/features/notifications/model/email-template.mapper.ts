import type {
  EmailTemplateContentDto,
  EmailTemplateDto,
  EmailTemplateEventType,
  UpdateEmailTemplateDto,
} from '@/generated/api/notifications/notifications.schemas';
import { formatDateTime } from '@/lib/format/datetime';
import { plainTextToHtml } from '@/shared/utils';
import { EMAIL_TEMPLATE_STATE, type EmailTemplateState } from '../constants/email-template.constants';

/** Dòng ở danh sách "Mẫu email". */
export interface EmailTemplateRow {
  eventType: EmailTemplateEventType;
  label: string;
  sendWhen: string;
  isCustomized: boolean;
  state: EmailTemplateState;
  /** Tiêu đề đang áp dụng: tuỳ chỉnh, hoặc ví dụ tiêu đề mặc định. */
  subjectPreview: string;
  updatedAtLabel: string;
  /** Không có version = tham số chưa được đồng bộ vào DB, API sẽ không lưu được. */
  editable: boolean;
}

export interface EmailTemplateVariable {
  name: string;
  /** Chuỗi chèn vào mẫu, ví dụ `{{orderNo}}`. */
  token: string;
  label: string;
  example: string;
  isMoney: boolean;
}

/** Form chỉnh sửa (RHF). `intro` là HTML của CKEditor. */
export interface EmailTemplateFormValues {
  subject: string;
  intro: string;
}

const HTML_TAG = /<[a-z!/][^>]*>/i;

export function toEmailTemplateRow(dto: EmailTemplateDto): EmailTemplateRow {
  return {
    eventType: dto.eventType,
    label: dto.label,
    sendWhen: dto.sendWhen,
    isCustomized: dto.isCustomized,
    state: dto.isCustomized ? EMAIL_TEMPLATE_STATE.CUSTOM : EMAIL_TEMPLATE_STATE.DEFAULT,
    subjectPreview: dto.subject.trim() || dto.defaultSubjectExample,
    updatedAtLabel: dto.isCustomized ? formatDateTime(dto.updatedAt) : '—',
    editable: isEmailTemplateEditable(dto),
  };
}

export function isEmailTemplateEditable(dto: Pick<EmailTemplateDto, 'subjectVersion' | 'introVersion'>): boolean {
  return Boolean(dto.subjectVersion && dto.introVersion);
}

export function toEmailTemplateVariables(dto: EmailTemplateDto): EmailTemplateVariable[] {
  return dto.variables.map((variable) => ({ ...variable, token: `{{${variable.name}}}` }));
}

/**
 * CONTRACT: mẫu cũ (trước khi có CKEditor) là chữ thuần — đổi thành HTML để editor hiển thị đúng xuống
 * dòng; API vẫn chấp nhận cả hai dạng.
 */
export function toEmailTemplateForm(dto: Pick<EmailTemplateDto, 'subject' | 'intro'>): EmailTemplateFormValues {
  const intro = dto.intro.trim();
  return {
    subject: dto.subject,
    intro: intro && !HTML_TAG.test(intro) ? plainTextToHtml(intro) : intro,
  };
}

export function toEmailTemplateContentPayload(values: EmailTemplateFormValues): EmailTemplateContentDto {
  return { subject: values.subject.trim(), intro: values.intro.trim() };
}

/**
 * CONCURRENCY: gửi version đang xem của CẢ HAI tham số; người khác vừa sửa thì API trả 409 thay vì ghi đè.
 * Chỉ gọi khi `isEmailTemplateEditable(dto)`.
 */
export function toUpdateEmailTemplatePayload(
  values: EmailTemplateFormValues,
  dto: Pick<EmailTemplateDto, 'subjectVersion' | 'introVersion'>,
): UpdateEmailTemplateDto {
  return {
    ...toEmailTemplateContentPayload(values),
    subjectVersion: dto.subjectVersion ?? '0',
    introVersion: dto.introVersion ?? '0',
  };
}

/** Khôi phục mặc định = lưu rỗng cả tiêu đề và đoạn mở đầu (ngữ nghĩa của API). */
export function toResetEmailTemplatePayload(
  dto: Pick<EmailTemplateDto, 'subjectVersion' | 'introVersion'>,
): UpdateEmailTemplateDto {
  return toUpdateEmailTemplatePayload({ subject: '', intro: '' }, dto);
}

/** Chèn `token` vào ô chữ tại vùng chọn; trả giá trị mới và vị trí con trỏ sau token. */
export function insertAtSelection(
  value: string,
  token: string,
  selectionStart: number | null | undefined,
  selectionEnd: number | null | undefined,
): { value: string; caret: number } {
  const start = Math.min(Math.max(selectionStart ?? value.length, 0), value.length);
  const end = Math.min(Math.max(selectionEnd ?? start, start), value.length);
  return { value: `${value.slice(0, start)}${token}${value.slice(end)}`, caret: start + token.length };
}
