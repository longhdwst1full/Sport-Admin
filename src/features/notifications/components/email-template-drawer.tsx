import { MailOutlined, UndoOutlined } from '@ant-design/icons';
import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, App, Button, Form, Input, Popover, Space, type InputRef } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import * as yup from 'yup';
import { RichTextEditor, type RichTextEditorHandle } from '@/foundation/inputs/rich-text-editor';
import { FormDrawer } from '@/foundation/overlay';
import type { EmailTemplateDto } from '@/generated/api/notifications/notifications.schemas';
import { EMAIL_SUBJECT_MAX_LENGTH } from '../constants/email-template.constants';
import { useEmailTemplateCommands } from '../hooks/use-email-template-commands';
import { useEmailTemplatePreview } from '../hooks/use-email-template-preview';
import {
  insertAtSelection,
  isEmailTemplateEditable,
  toEmailTemplateContentPayload,
  toEmailTemplateForm,
  toEmailTemplateVariables,
  toResetEmailTemplatePayload,
  toUpdateEmailTemplatePayload,
  type EmailTemplateFormValues,
} from '../model/email-template.mapper';
import { EmailTemplateHelp } from './email-template-help';
import { EmailTemplatePreview } from './email-template-preview';
import { EmailTemplateVariableChips } from './email-template-variable-chips';

const schema: yup.ObjectSchema<EmailTemplateFormValues> = yup.object({
  subject: yup.string().max(EMAIL_SUBJECT_MAX_LENGTH, `Tiêu đề tối đa ${EMAIL_SUBJECT_MAX_LENGTH} ký tự`).defined(),
  intro: yup.string().defined(),
});

type InsertTarget = 'subject' | 'intro';

const TARGET_LABELS: Record<InsertTarget, string> = { subject: 'Tiêu đề', intro: 'Đoạn mở đầu' };

export interface EmailTemplateDrawerProps {
  /** Bản mới nhất từ query danh sách (version cập nhật sau khi refetch). */
  template: EmailTemplateDto;
  canManage: boolean;
  onClose: () => void;
}

/**
 * Soạn một mẫu email: form bên trái, xem trước trực tiếp bên phải.
 *
 * CONTRACT: form chỉ khởi tạo một lần khi mở (drawer được key theo `eventType`); refetch danh sách sau 409
 * chỉ đổi version dùng để lưu, không xoá nội dung đang soạn.
 */
export function EmailTemplateDrawer({ template, canManage, onClose }: EmailTemplateDrawerProps) {
  const { modal } = App.useApp();
  const editable = canManage && isEmailTemplateEditable(template);
  const form = useForm<EmailTemplateFormValues>({
    resolver: yupResolver(schema),
    defaultValues: toEmailTemplateForm(template),
  });
  const watched = useWatch({ control: form.control });
  const values: EmailTemplateFormValues = { subject: watched.subject ?? '', intro: watched.intro ?? '' };
  const preview = useEmailTemplatePreview(template.eventType, values);
  const variables = useMemo(() => toEmailTemplateVariables(template), [template]);
  const { save, sendTest } = useEmailTemplateCommands({ onSaved: onClose });

  const subjectRef = useRef<InputRef>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [target, setTarget] = useState<InsertTarget>('intro');
  const [testEmail, setTestEmail] = useState('');
  const [testOpen, setTestOpen] = useState(false);

  function insertVariable(token: string) {
    if (target === 'intro') {
      editorRef.current?.insertText(token);
      editorRef.current?.focus();
      return;
    }
    const input = subjectRef.current?.input;
    const next = insertAtSelection(form.getValues('subject'), token, input?.selectionStart, input?.selectionEnd);
    form.setValue('subject', next.value, { shouldDirty: true, shouldValidate: true });
    // UX: đặt lại con trỏ ngay sau biến vừa chèn để gõ tiếp được.
    requestAnimationFrame(() => {
      subjectRef.current?.focus();
      subjectRef.current?.input?.setSelectionRange(next.caret, next.caret);
    });
  }

  const submit = form.handleSubmit((formValues) =>
    save.mutate({ eventType: template.eventType, data: toUpdateEmailTemplatePayload(formValues, template) }),
  );

  function confirmReset() {
    modal.confirm({
      title: `Khôi phục mẫu “${template.label}” về mặc định?`,
      content:
        'Tiêu đề và đoạn mở đầu tuỳ chỉnh sẽ bị xoá; email gửi sau đó dùng nội dung mặc định của hệ thống. Có thể soạn lại bất cứ lúc nào.',
      okText: 'Khôi phục mặc định',
      okButtonProps: { danger: true },
      onOk: () => save.mutateAsync({ eventType: template.eventType, data: toResetEmailTemplatePayload(template) }),
    });
  }

  function sendTestEmail() {
    sendTest.mutate(
      {
        eventType: template.eventType,
        data: { ...toEmailTemplateContentPayload(form.getValues()), ...(testEmail.trim() ? { toEmail: testEmail.trim() } : {}) },
      },
      { onSuccess: () => setTestOpen(false) },
    );
  }

  return (
    <FormDrawer
      open
      size="xl"
      title={
        <div>
          <div>Mẫu email: {template.label}</div>
          <div className="text-xs font-normal text-slate-500">{template.sendWhen}</div>
        </div>
      }
      onClose={onClose}
      onSubmit={() => void submit()}
      submitting={save.isPending}
      submitDisabled={!editable}
      isDirty={() => form.formState.isDirty}
      footerExtra={
        canManage && (
          <Space wrap>
            <Popover
              open={testOpen}
              onOpenChange={setTestOpen}
              trigger="click"
              title="Gửi email thử với dữ liệu mẫu"
              content={
                <div className="flex w-72 flex-col gap-2">
                  <Input
                    type="email"
                    allowClear
                    value={testEmail}
                    onChange={(event) => setTestEmail(event.target.value)}
                    placeholder="Để trống = email tài khoản của bạn"
                    onPressEnter={sendTestEmail}
                  />
                  <div className="text-[11px] text-slate-500">Tiêu đề có tiền tố “[Thử]”; gửi nội dung đang soạn, chưa cần lưu.</div>
                  <Button type="primary" icon={<MailOutlined />} loading={sendTest.isPending} onClick={sendTestEmail}>
                    Gửi thử
                  </Button>
                </div>
              }
            >
              <Button icon={<MailOutlined />}>Gửi thử</Button>
            </Popover>
            <Button icon={<UndoOutlined />} disabled={!editable || !template.isCustomized} onClick={confirmReset}>
              Khôi phục mặc định
            </Button>
          </Space>
        )
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Form layout="vertical" component="div" className="flex min-w-0 flex-col gap-4">
          {!isEmailTemplateEditable(template) && (
            <Alert
              type="warning"
              showIcon
              message="Tham số của mẫu này chưa được đồng bộ vào cơ sở dữ liệu nên chưa lưu được. Khởi động lại API để đồng bộ danh mục tham số."
            />
          )}
          <Controller
            control={form.control}
            name="subject"
            render={({ field, fieldState }) => (
              <Form.Item
                className="!mb-0"
                label="Tiêu đề"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message ?? `Để trống = mặc định, ví dụ: “${template.defaultSubjectExample}”`}
              >
                <Input
                  {...field}
                  ref={subjectRef}
                  disabled={!editable}
                  maxLength={EMAIL_SUBJECT_MAX_LENGTH}
                  showCount
                  placeholder={template.defaultSubjectExample}
                  onFocus={() => setTarget('subject')}
                />
              </Form.Item>
            )}
          />
          <Controller
            control={form.control}
            name="intro"
            render={({ field }) => (
              <Form.Item
                className="!mb-0"
                label="Đoạn mở đầu"
                help="Chèn ngay sau “Chào {Tên khách},”, trước bảng thông tin. Để trống = không chèn."
              >
                <RichTextEditor
                  variant="email"
                  height={220}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={!editable}
                  placeholder="Ví dụ: Cảm ơn bạn đã tin chọn Bảo An Sport…"
                  handleRef={editorRef}
                  onFocus={() => setTarget('intro')}
                />
              </Form.Item>
            )}
          />
          <EmailTemplateVariableChips
            variables={variables}
            targetLabel={TARGET_LABELS[target]}
            disabled={!editable}
            onInsert={insertVariable}
          />
          <EmailTemplateHelp />
        </Form>
        <div className="min-w-0">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Xem trước (dữ liệu mẫu)
          </div>
          <EmailTemplatePreview
            preview={preview.data}
            updating={preview.isFetching}
            error={preview.error}
          />
        </div>
      </div>
    </FormDrawer>
  );
}
