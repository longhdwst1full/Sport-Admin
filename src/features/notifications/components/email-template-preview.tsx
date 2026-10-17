import { DesktopOutlined, MobileOutlined } from '@ant-design/icons';
import { Alert, Segmented, Skeleton, Tabs, Typography } from 'antd';
import { useState } from 'react';
import type { EmailTemplatePreviewDto } from '@/generated/api/notifications/notifications.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import {
  EMAIL_PREVIEW_VIEWPORT,
  EMAIL_PREVIEW_VIEWPORT_OPTIONS,
  type EmailPreviewViewport,
} from '../constants/email-template.constants';

const VIEWPORT_ICONS: Record<EmailPreviewViewport, React.ReactNode> = {
  desktop: <DesktopOutlined />,
  mobile: <MobileOutlined />,
};

export interface EmailTemplatePreviewProps {
  preview?: EmailTemplatePreviewDto;
  /** Đang chờ lượt xem trước mới (bản cũ vẫn hiện, chỉ làm mờ). */
  updating: boolean;
  error: unknown;
}

/**
 * Bản xem trước email với dữ liệu mẫu do API dựng.
 *
 * SECURITY: HTML render trong `<iframe sandbox>` không cấp quyền nào (không script, không same-origin, không
 * mở cửa sổ) — dù API đã làm sạch, bản xem trước không bao giờ chạy trong origin của Admin.
 */
export function EmailTemplatePreview({ preview, updating, error }: EmailTemplatePreviewProps) {
  const [viewport, setViewport] = useState<EmailPreviewViewport>('desktop');

  if (!preview) {
    return error ? (
      <Alert type="error" showIcon message="Không dựng được bản xem trước" description={getApiErrorMessage(error)} />
    ) : (
      <Skeleton active paragraph={{ rows: 12 }} />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {preview.unknownVariables.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`Biến không dùng được trong mẫu này: ${preview.unknownVariables.map((name) => `{{${name}}}`).join(', ')}`}
          description="Khi gửi, các biến này sẽ bị bỏ trống. Chỉ dùng biến trong danh sách “Chèn biến”."
        />
      )}
      {error !== null && error !== undefined && (
        <Alert type="error" showIcon message="Bản xem trước chưa cập nhật" description={getApiErrorMessage(error)} />
      )}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tiêu đề</div>
        <Typography.Text strong className="!text-[15px]">
          {preview.subject}
        </Typography.Text>
      </div>
      <Tabs
        size="small"
        className="min-h-0 flex-1"
        tabBarExtraContent={
          <Segmented<EmailPreviewViewport>
            size="small"
            value={viewport}
            onChange={setViewport}
            options={EMAIL_PREVIEW_VIEWPORT_OPTIONS.map((option) => ({
              ...option,
              icon: VIEWPORT_ICONS[option.value],
            }))}
          />
        }
        items={[
          {
            key: 'html',
            label: 'Email',
            children: (
              <div
                className={`flex justify-center overflow-auto rounded-xl bg-slate-100 p-3 transition-opacity ${updating ? 'opacity-60' : ''}`}
                aria-busy={updating}
              >
                <iframe
                  title="Xem trước email"
                  sandbox=""
                  srcDoc={preview.html}
                  className="h-[640px] rounded-lg border-0 bg-white shadow-sm"
                  style={{ width: EMAIL_PREVIEW_VIEWPORT[viewport].width, maxWidth: '100%' }}
                />
              </div>
            ),
          },
          {
            key: 'text',
            label: 'Bản chữ thuần',
            children: (
              <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm text-slate-700">
                {preview.text}
              </pre>
            ),
          },
        ]}
      />
    </div>
  );
}
