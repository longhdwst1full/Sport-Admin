import { EditOutlined, EyeOutlined, FileTextOutlined, MailOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Typography } from 'antd';
import { useState, type ReactNode } from 'react';
import { useCan } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage, StatusTag } from '@/foundation/management';
import { RefreshButton } from '@/foundation/table';
import type { EmailTemplateEventType } from '@/generated/api/notifications/notifications.schemas';
import { emailTemplateStatePresentation } from '../constants/email-template.constants';
import { useEmailTemplates } from '../hooks/use-email-templates';
import { EmailTemplateDrawer } from './email-template-drawer';
import { EmailTemplateHelp } from './email-template-help';

/**
 * Màn "Mẫu email": thẻ cho từng sự kiện gửi khách, bấm để soạn trong drawer có xem trước.
 *
 * PERMISSION: xem cần `system.parameter.view`; nút sửa/lưu/gửi thử chỉ hiện khi có `system.parameter.manage`
 * (API còn đòi phạm vi GLOBAL). Không có quyền sửa vẫn mở drawer ở chế độ xem để xem trước.
 */
export function EmailTemplatesView({ switcher }: { switcher: ReactNode }) {
  const canManage = useCan('system.parameter.manage');
  const { query, templates, rows } = useEmailTemplates();
  const [editingEvent, setEditingEvent] = useState<EmailTemplateEventType>();
  // Suy từ query để drawer luôn dùng version mới nhất sau khi danh sách được tải lại.
  const editing = templates.find((template) => template.eventType === editingEvent);
  const customized = rows.filter((row) => row.isCustomized).length;

  return (
    <ManagementPage
      eyebrow="Vận hành email"
      title="Thông báo email"
      description="Tuỳ chỉnh tiêu đề và đoạn mở đầu của email gửi khách. Bảng thông tin, số tiền và nút bấm do hệ thống tự dựng."
      actions={switcher}
      metrics={[
        { key: 'total', label: 'Mẫu email', value: rows.length, icon: <MailOutlined />, tone: 'blue' },
        { key: 'custom', label: 'Đã tuỳ chỉnh', value: customized, icon: <EditOutlined />, tone: 'green' },
        {
          key: 'default',
          label: 'Đang dùng mặc định',
          value: rows.length - customized,
          icon: <FileTextOutlined />,
          tone: 'orange',
        },
      ]}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <EmailTemplateHelp />
          </div>
          <RefreshButton onRefresh={query.refetch} loading={query.isFetching} />
        </div>
        {query.isError && (
          <QueryErrorAlert
            message="Không tải được danh sách mẫu email"
            error={query.error}
            retry={() => void query.refetch()}
          />
        )}
        {query.isPending ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Card key={index} loading className="!rounded-2xl" />
            ))}
          </div>
        ) : rows.length === 0 && !query.isError ? (
          <Empty description="Chưa có mẫu email" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {rows.map((row) => (
              <Card
                key={row.eventType}
                hoverable
                className="!rounded-2xl !border-slate-100"
                styles={{ body: { padding: 18, height: '100%' } }}
                onClick={() => setEditingEvent(row.eventType)}
              >
                <div className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <Typography.Text strong className="!text-[15px]">
                      {row.label}
                    </Typography.Text>
                    <StatusTag status={row.state} presentations={emailTemplateStatePresentation} />
                  </div>
                  <div className="text-[13px] leading-5 text-slate-500">{row.sendWhen}</div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wider text-slate-400">Tiêu đề</div>
                    <Typography.Text ellipsis={{ tooltip: row.subjectPreview }} className="!text-[13px]">
                      {row.subjectPreview}
                    </Typography.Text>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span>Cập nhật: {row.updatedAtLabel}</span>
                    <Button
                      size="small"
                      type={canManage ? 'primary' : 'default'}
                      ghost={canManage}
                      icon={canManage ? <SettingOutlined /> : <EyeOutlined />}
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingEvent(row.eventType);
                      }}
                    >
                      {canManage ? 'Soạn mẫu' : 'Xem'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      {editing && (
        <EmailTemplateDrawer
          key={editing.eventType}
          template={editing}
          canManage={canManage}
          onClose={() => setEditingEvent(undefined)}
        />
      )}
    </ManagementPage>
  );
}
