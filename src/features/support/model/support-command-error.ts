import { getApiErrorMessage, getApiErrorPayload } from '@/lib/api/error';
import { SUPPORT_ERROR_CODE } from '../constants/support.constants';

/** UX: lỗi nghiệp vụ hay gặp có lời giải thích cụ thể theo mã ổn định; còn lại dùng thông điệp của API. */
export function supportCommandErrorMessage(error: unknown): string {
  switch (getApiErrorPayload(error)?.code) {
    case SUPPORT_ERROR_CODE.VERSION_CONFLICT:
    case SUPPORT_ERROR_CODE.CONCURRENT_UPDATE:
    case SUPPORT_ERROR_CODE.INVALID_TRANSITION:
      return 'Ticket vừa được người khác cập nhật. Dữ liệu đã tải lại, vui lòng xem lại rồi thao tác.';
    case SUPPORT_ERROR_CODE.TICKET_CLOSED:
      return 'Ticket đã đóng, không thao tác thêm được.';
    case SUPPORT_ERROR_CODE.IDEMPOTENCY_CONFLICT:
      return 'Lệnh trước đó chưa khớp với nội dung vừa gửi. Vui lòng gửi lại.';
    case SUPPORT_ERROR_CODE.ASSIGNEE_INVALID:
      return 'Người được chọn không nhận được ticket này (ngoài phạm vi chi nhánh hoặc thiếu quyền hỗ trợ).';
    default:
      return getApiErrorMessage(error);
  }
}
