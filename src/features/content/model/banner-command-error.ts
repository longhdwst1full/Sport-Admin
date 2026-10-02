import { getApiErrorMessage, getApiErrorPayload } from '@/lib/api/error';
import { BANNER_ERROR_CODE } from '../constants/banner.constants';

/** UX: lỗi nghiệp vụ hay gặp có lời giải thích theo mã ổn định; còn lại dùng thông điệp của API. */
export function bannerCommandErrorMessage(error: unknown): string {
  switch (getApiErrorPayload(error)?.code) {
    case BANNER_ERROR_CODE.VERSION_STALE:
      return 'Banner vừa được người khác thay đổi. Dữ liệu đã tải lại, vui lòng xem lại rồi thao tác.';
    case BANNER_ERROR_CODE.ARCHIVED:
      return 'Banner đã lưu trữ, không thể thay đổi nữa.';
    case BANNER_ERROR_CODE.MEDIA_INACTIVE:
      return 'Ảnh banner đã bị gỡ khỏi thư viện. Tải ảnh khác rồi thử lại.';
    default:
      return getApiErrorMessage(error);
  }
}
