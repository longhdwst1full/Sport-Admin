import type { StatusPresentation } from '@/foundation/management/status-tag';

/** Hai màn con của "Thông báo email"; tab nằm trên URL (`?tab=templates`) để F5/gửi link giữ đúng màn. */
export const NOTIFICATION_TAB = {
  QUEUE: 'queue',
  TEMPLATES: 'templates',
} as const;

export type NotificationTab = (typeof NOTIFICATION_TAB)[keyof typeof NOTIFICATION_TAB];

export const NOTIFICATION_TABS: readonly NotificationTab[] = Object.values(NOTIFICATION_TAB);

export const NOTIFICATION_TAB_OPTIONS: { value: NotificationTab; label: string }[] = [
  { value: NOTIFICATION_TAB.QUEUE, label: 'Hàng đợi gửi' },
  { value: NOTIFICATION_TAB.TEMPLATES, label: 'Mẫu email' },
];

/** Đường dẫn màn "Mẫu email" — màn tham số hệ thống trỏ về đây thay vì cho sửa EMAIL_* tại chỗ. */
export const EMAIL_TEMPLATES_PATH = `/notifications?tab=${NOTIFICATION_TAB.TEMPLATES}`;

/** UX: xem trước gọi API sau khi người soạn ngừng gõ ngần này ms. */
export const EMAIL_PREVIEW_DEBOUNCE_MS = 500;

export const EMAIL_PREVIEW_VIEWPORT = {
  desktop: { label: 'Máy tính', width: 680 },
  mobile: { label: 'Điện thoại', width: 375 },
} as const;

export type EmailPreviewViewport = keyof typeof EMAIL_PREVIEW_VIEWPORT;

export const EMAIL_PREVIEW_VIEWPORT_OPTIONS = (Object.keys(EMAIL_PREVIEW_VIEWPORT) as EmailPreviewViewport[]).map(
  (value) => ({ value, label: EMAIL_PREVIEW_VIEWPORT[value].label }),
);

/** CONTRACT: khớp `EMAIL_SUBJECT_MAX_LENGTH` của API. */
export const EMAIL_SUBJECT_MAX_LENGTH = 200;

/** Trạng thái hiển thị của một mẫu (suy ra từ `isCustomized` ở mapper). */
export const EMAIL_TEMPLATE_STATE = {
  CUSTOM: 'CUSTOM',
  DEFAULT: 'DEFAULT',
} as const;

export type EmailTemplateState = (typeof EMAIL_TEMPLATE_STATE)[keyof typeof EMAIL_TEMPLATE_STATE];

export const emailTemplateStatePresentation: Record<EmailTemplateState, StatusPresentation> = {
  CUSTOM: { label: 'Đã tuỳ chỉnh', color: 'info' },
  DEFAULT: { label: 'Mặc định', color: 'neutral' },
};
