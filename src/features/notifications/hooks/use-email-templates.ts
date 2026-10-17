import { useMemo } from 'react';
import { useListAdminEmailTemplates } from '@/generated/api/notifications/notifications';
import { toEmailTemplateRow } from '../model/email-template.mapper';

/** Danh sách 13 mẫu email (không phân trang: số mẫu cố định theo sự kiện của hệ thống). */
export function useEmailTemplates() {
  const query = useListAdminEmailTemplates();
  const templates = useMemo(() => query.data?.items ?? [], [query.data]);
  const rows = useMemo(() => templates.map(toEmailTemplateRow), [templates]);
  return { query, templates, rows };
}
