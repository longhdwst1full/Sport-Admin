/**
 * Tham số mẫu email (NOT-02): `EMAIL_SUBJECT_<EVENT>` / `EMAIL_INTRO_<EVENT>`. Chúng được soạn ở màn
 * "Mẫu email" (CKEditor + xem trước + gửi thử); màn tham số chỉ hiển thị và trỏ sang đó để không có hai
 * nơi sửa cùng một giá trị. API vẫn nhận PATCH tham số như cũ — đây chỉ là quyết định giao diện.
 */
const EMAIL_TEMPLATE_PARAMETER_PREFIXES = ['EMAIL_SUBJECT_', 'EMAIL_INTRO_'] as const;

export function isEmailTemplateParameter(code: string): boolean {
  return EMAIL_TEMPLATE_PARAMETER_PREFIXES.some((prefix) => code.startsWith(prefix));
}

/** WORKAROUND: đặt cục bộ thay vì import barrel `features/notifications` (kéo cả màn đó vào chunk này). */
export const EMAIL_TEMPLATES_PATH = '/notifications?tab=templates';
