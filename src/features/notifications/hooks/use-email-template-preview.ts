import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { previewAdminEmailTemplate } from '@/generated/api/notifications/notifications';
import type { EmailTemplateEventType } from '@/generated/api/notifications/notifications.schemas';
import { EMAIL_PREVIEW_DEBOUNCE_MS } from '../constants/email-template.constants';
import { toEmailTemplateContentPayload, type EmailTemplateFormValues } from '../model/email-template.mapper';

/**
 * Xem trước trực tiếp: POST preview của API (không ghi DB) chạy như một query theo nội dung đã debounce,
 * để AbortSignal huỷ lượt cũ và kết quả trước vẫn hiện trong lúc chờ lượt mới.
 *
 * CACHE: key nằm ngoài family của generated list nên không bị invalidate khi lưu; `gcTime` ngắn vì bản
 * xem trước chỉ có ý nghĩa trong lúc drawer mở.
 */
export function useEmailTemplatePreview(eventType: EmailTemplateEventType | undefined, values: EmailTemplateFormValues) {
  const [debounced] = useDebounce(toEmailTemplateContentPayload(values), EMAIL_PREVIEW_DEBOUNCE_MS, {
    equalityFn: (left, right) => left.subject === right.subject && left.intro === right.intro,
  });
  return useQuery({
    queryKey: ['notifications', 'email-template-preview', eventType, debounced.subject, debounced.intro],
    queryFn: ({ signal }) => previewAdminEmailTemplate(eventType!, debounced, signal),
    enabled: Boolean(eventType),
    placeholderData: keepPreviousData,
    gcTime: 60_000,
    retry: false,
  });
}
