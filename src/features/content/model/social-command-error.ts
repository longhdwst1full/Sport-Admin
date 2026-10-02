import { getApiErrorMessage, getApiErrorPayload } from '@/lib/api/error';
import { SOCIAL_ERROR_CODE } from '../constants/social.constants';

const MESSAGES: Record<string, string> = {
  [SOCIAL_ERROR_CODE.POST_NOT_FOUND]: 'Bài viết không còn tồn tại. Danh sách đã được tải lại.',
  [SOCIAL_ERROR_CODE.NOT_FACEBOOK_POST]: 'Bài viết chưa có bản đăng Facebook.',
  [SOCIAL_ERROR_CODE.ALREADY_FACEBOOK_POST]: 'Bài viết đã có bản đăng Facebook đang dùng.',
  [SOCIAL_ERROR_CODE.POST_ARCHIVED]: 'Bài viết đã lưu trữ, không thể đăng Facebook.',
  [SOCIAL_ERROR_CODE.INVALID_TRANSITION]:
    'Trạng thái bài Facebook vừa thay đổi nên thao tác này không còn hợp lệ. Dữ liệu đã tải lại.',
  [SOCIAL_ERROR_CODE.VERSION_STALE]: 'Bài viết vừa được người khác thay đổi. Dữ liệu đã tải lại, vui lòng xem lại rồi thao tác.',
  [SOCIAL_ERROR_CODE.SELF_APPROVAL]: 'Bạn là người gửi duyệt bài này. Người duyệt/đăng phải là người khác.',
  [SOCIAL_ERROR_CODE.IDEMPOTENCY_KEY_INVALID]: 'Yêu cầu thiếu khoá chống gửi trùng. Vui lòng thử lại.',
  [SOCIAL_ERROR_CODE.IDEMPOTENCY_CONFLICT]: 'Yêu cầu trùng với một lệnh khác vừa gửi. Dữ liệu đã tải lại, vui lòng thử lại.',
  [SOCIAL_ERROR_CODE.MEDIA_INVALID]: 'Ảnh/video không khớp loại bài đăng (bài chữ không media, 1–10 ảnh, hoặc đúng 1 video).',
  [SOCIAL_ERROR_CODE.MEDIA_NOT_FOUND]: 'Có ảnh/video đã bị gỡ khỏi thư viện. Chọn lại media rồi thử lại.',
  [SOCIAL_ERROR_CODE.CONTENT_EMPTY]: 'Bài Facebook cần nội dung hoặc link.',
  [SOCIAL_ERROR_CODE.SCHEDULE_OUT_OF_WINDOW]: 'Giờ hẹn phải cách hiện tại từ 10 phút đến 30 ngày.',
  [SOCIAL_ERROR_CODE.NOT_CONFIGURED]: 'Chưa cấu hình Facebook Page (Page ID và Page access token) trong Tham số hệ thống.',
  [SOCIAL_ERROR_CODE.PAGE_MISMATCH]: 'Bài này đã đăng trên một Page khác Page đang cấu hình, không thể sửa/xoá từ đây.',
  [SOCIAL_ERROR_CODE.FACEBOOK_ERROR]: 'Facebook từ chối hoặc không phản hồi yêu cầu. Thử lại sau ít phút.',
  [SOCIAL_ERROR_CODE.RECONCILE_TOO_EARLY]: 'Lần đăng vẫn đang chạy. Đợi vài phút rồi đối soát lại.',
  [SOCIAL_ERROR_CODE.RECONCILE_INCONCLUSIVE]:
    'Không tự xác định được bài đã lên Page hay chưa. Kiểm tra trên Page rồi nhập ID bài, hoặc xác nhận "chưa đăng".',
  [SOCIAL_ERROR_CODE.STORAGE_DISABLED]: 'Chức năng tạm thời không khả dụng.',
};

/** UX: mã lỗi ổn định → thông điệp tiếng Việt; mã lạ dùng thông điệp của API. */
export function socialCommandErrorMessage(error: unknown): string {
  const code = getApiErrorPayload(error)?.code;
  return (code && MESSAGES[code]) || getApiErrorMessage(error);
}

/** Lỗi 503 khi chưa cấu hình Page → hiện gợi ý dẫn tới Tham số hệ thống. */
export function isFacebookNotConfigured(error: unknown): boolean {
  return getApiErrorPayload(error)?.code === SOCIAL_ERROR_CODE.NOT_CONFIGURED;
}
