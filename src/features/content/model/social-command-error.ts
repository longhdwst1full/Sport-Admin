import { getApiErrorMessage, getApiErrorPayload } from '@/lib/api/error';
import { SOCIAL_CONTENT_EDIT_DETAIL, SOCIAL_ERROR_CODE } from '../constants/social.constants';

const MESSAGES: Record<string, string> = {
  [SOCIAL_ERROR_CODE.POST_NOT_FOUND]: 'Bài viết không còn tồn tại. Danh sách đã được tải lại.',
  [SOCIAL_ERROR_CODE.NOT_FACEBOOK_POST]: 'Bài viết chưa có bản đăng Facebook.',
  [SOCIAL_ERROR_CODE.ALREADY_FACEBOOK_POST]: 'Bài viết đã có bản đăng Facebook đang dùng.',
  [SOCIAL_ERROR_CODE.POST_ARCHIVED]: 'Bài viết đã lưu trữ, không thể đăng Facebook.',
  [SOCIAL_ERROR_CODE.INVALID_TRANSITION]:
    'Trạng thái bài Facebook vừa thay đổi nên thao tác này không còn hợp lệ. Dữ liệu đã tải lại.',
  [SOCIAL_ERROR_CODE.VERSION_STALE]: 'Bài viết vừa được người khác thay đổi. Dữ liệu đã tải lại, vui lòng xem lại rồi thao tác.',
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
  [SOCIAL_ERROR_CODE.DELETE_NEEDS_RECONCILE]: 'Chưa rõ bài đã lên Facebook chưa — hãy Đối soát trước khi xoá',
  [SOCIAL_ERROR_CODE.DELETE_REASON_REQUIRED]: 'Cần nhập lý do khi xoá bài đã lên Facebook.',
  [SOCIAL_ERROR_CODE.PUBLISH_PERMISSION_REQUIRED]: 'Xoá bài đã lên Facebook cần quyền đăng bài Facebook.',
  [SOCIAL_ERROR_CODE.STORAGE_DISABLED]: 'Chức năng tạm thời không khả dụng.',
  [SOCIAL_ERROR_CODE.CONTENT_EDIT_NOT_ALLOWED]:
    'Không sửa được nội dung ở đây: bài website sửa nội dung ở màn bài viết; ở đây chỉ đổi media/thiết lập đăng.',
  [SOCIAL_ERROR_CODE.ALREADY_TIKTOK_POST]: 'Bài viết đã có bản đăng TikTok đang dùng.',
  [SOCIAL_ERROR_CODE.TIKTOK_NOT_CONFIGURED]:
    'Chưa cấu hình app TikTok (TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI) trong Tham số hệ thống.',
  [SOCIAL_ERROR_CODE.TIKTOK_NOT_CONNECTED]:
    'Chưa kết nối tài khoản TikTok hoặc phiên kết nối đã hết hạn. Kết nối lại tài khoản TikTok ở tab Mạng xã hội.',
  [SOCIAL_ERROR_CODE.TIKTOK_ERROR]: 'TikTok từ chối hoặc không phản hồi yêu cầu. Thử lại sau ít phút.',
  [SOCIAL_ERROR_CODE.TIKTOK_STATE_INVALID]:
    'Phiên kết nối TikTok không hợp lệ hoặc đã hết hạn (chỉ người bấm "Kết nối" mới hoàn tất được). Bấm kết nối lại.',
  [SOCIAL_ERROR_CODE.TIKTOK_OPTIONS_INVALID]:
    'Thiết lập TikTok không còn hợp lệ với tài khoản (quyền riêng tư, tương tác hoặc thời lượng video). Sửa nháp TikTok rồi thử lại.',
  [SOCIAL_ERROR_CODE.TIKTOK_CAPTION_TOO_LONG]: 'Nội dung bài (caption TikTok) tối đa 2.200 ký tự.',
  [SOCIAL_ERROR_CODE.DASHBOARD_RANGE_INVALID]: 'Khoảng ngày không hợp lệ: ngày bắt đầu không sau ngày kết thúc, tối đa 90 ngày.',
};

/** Caption dùng chung các kênh: kênh còn lại đã rời nháp thì không sửa caption được. */
const CONTENT_EDIT_DETAIL_MESSAGES: Record<string, string> = {
  [SOCIAL_CONTENT_EDIT_DETAIL.FACEBOOK_NOT_DRAFT]:
    'Bản Facebook đã rời nháp nên nội dung (caption chung) không sửa được nữa. Chỉ đổi video/thiết lập TikTok.',
  [SOCIAL_CONTENT_EDIT_DETAIL.TIKTOK_NOT_DRAFT]:
    'Bản TikTok đã rời nháp nên nội dung (caption chung) không sửa được nữa. Chỉ đổi media Facebook.',
};

/** UX: mã lỗi ổn định → thông điệp tiếng Việt; mã lạ dùng thông điệp của API. */
export function socialCommandErrorMessage(error: unknown): string {
  const payload = getApiErrorPayload(error);
  const code = payload?.code;
  if (code === SOCIAL_ERROR_CODE.CONTENT_EDIT_NOT_ALLOWED) {
    const detail = payload?.details?.find((item) => CONTENT_EDIT_DETAIL_MESSAGES[item.code]);
    if (detail) return CONTENT_EDIT_DETAIL_MESSAGES[detail.code];
  }
  return (code && MESSAGES[code]) || getApiErrorMessage(error);
}

/** Lỗi 503 khi chưa cấu hình Page → hiện gợi ý dẫn tới Tham số hệ thống. */
export function isFacebookNotConfigured(error: unknown): boolean {
  return getApiErrorPayload(error)?.code === SOCIAL_ERROR_CODE.NOT_CONFIGURED;
}
