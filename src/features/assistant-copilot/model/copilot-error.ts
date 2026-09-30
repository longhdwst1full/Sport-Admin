import { ApiError } from '@/lib/api/fetcher';
import { getApiErrorMessage, getApiErrorPayload } from '@/lib/api/error';
import { ACTION_DRAFT_ERROR_CODE, actionDraftFailureMessages, COPILOT_ERROR_CODE } from '../constants/copilot.constants';

export type CopilotErrorKind = 'unavailable' | 'quota' | 'forbidden' | 'conversation-gone' | 'other';

const status = (error: unknown) => (error instanceof ApiError ? error.status : undefined);

/** Phân loại để UI chọn phản ứng: cảnh báo (tạm ngưng/hết lượt), mở hội thoại mới (hội thoại mất). */
export function copilotErrorKind(error: unknown): CopilotErrorKind {
  const code = getApiErrorPayload(error)?.code;
  if (code === COPILOT_ERROR_CODE.UNAVAILABLE || status(error) === 503) return 'unavailable';
  if (code === COPILOT_ERROR_CODE.QUOTA_EXCEEDED || status(error) === 429) return 'quota';
  if (code === COPILOT_ERROR_CODE.CONVERSATION_NOT_FOUND || code === COPILOT_ERROR_CODE.CONVERSATION_CLOSED) {
    return 'conversation-gone';
  }
  if (status(error) === 403) return 'forbidden';
  return 'other';
}

/** Thông điệp tiếng Việt cho lỗi hội thoại (tạo, gửi, tải tin). */
export function copilotErrorMessage(error: unknown): string {
  const code = getApiErrorPayload(error)?.code;
  switch (copilotErrorKind(error)) {
    case 'unavailable':
      return 'Trợ lý đang tạm ngưng';
    case 'quota':
      return 'Bạn đã dùng hết lượt hỏi trợ lý cho khoảng thời gian này. Vui lòng thử lại sau.';
    case 'conversation-gone':
      return 'Hội thoại đã kết thúc hoặc không còn. Hãy mở hội thoại mới.';
    case 'forbidden':
      if (code === COPILOT_ERROR_CODE.BRANCH_SCOPE_DENIED) return 'Dữ liệu này nằm ngoài phạm vi chi nhánh của bạn.';
      if (code === COPILOT_ERROR_CODE.STAFF_USER_REQUIRED) return 'Copilot chỉ dùng được với tài khoản nhân viên thật.';
      return 'Bạn không có quyền dùng trợ lý hoặc xem dữ liệu được hỏi.';
    default:
      break;
  }
  switch (code) {
    case COPILOT_ERROR_CODE.INPUT_TOO_LONG:
      return 'Tin nhắn quá dài. Hãy rút gọn câu hỏi.';
    case COPILOT_ERROR_CODE.INPUT_EMPTY:
      return 'Hãy nhập câu hỏi.';
    case COPILOT_ERROR_CODE.CONTENT_INVALID:
      return 'Tin nhắn chứa ký tự không hợp lệ.';
    case COPILOT_ERROR_CODE.TURN_IN_PROGRESS:
      return 'Trợ lý đang trả lời tin trước. Vui lòng đợi rồi gửi lại.';
    case COPILOT_ERROR_CODE.IDEMPOTENCY_KEY_REUSED:
      return 'Tin trước đó chưa khớp với nội dung vừa gửi. Vui lòng gửi lại.';
    default:
      return getApiErrorMessage(error);
  }
}

/** Thông điệp khi xác nhận/từ chối bản nháp; mã "stale" đi kèm việc tải lại bản nháp. */
export function actionDraftErrorMessage(error: unknown): string {
  switch (getApiErrorPayload(error)?.code) {
    case ACTION_DRAFT_ERROR_CODE.EXPIRED:
      return 'Bản nháp đã hết hạn. Hãy hỏi lại trợ lý để lập bản nháp mới.';
    case ACTION_DRAFT_ERROR_CODE.NOT_PENDING:
    case ACTION_DRAFT_ERROR_CODE.VERSION_CONFLICT:
      return 'Bản nháp vừa được xử lý ở nơi khác. Đã tải lại trạng thái mới nhất.';
    case ACTION_DRAFT_ERROR_CODE.PAYLOAD_HASH_MISMATCH:
      return 'Nội dung bản nháp đã thay đổi so với bản đang hiển thị. Đã tải lại, vui lòng xem lại.';
    case ACTION_DRAFT_ERROR_CODE.EXECUTION_IN_PROGRESS:
      return 'Bản nháp đang được thực hiện. Vui lòng đợi vài giây rồi tải lại.';
    case ACTION_DRAFT_ERROR_CODE.PERMISSION_DENIED:
      return 'Bạn không có quyền điều chỉnh tồn tại kho/chi nhánh này.';
    case ACTION_DRAFT_ERROR_CODE.NOT_FOUND:
      return 'Không tìm thấy bản nháp trong phạm vi của bạn.';
    default:
      if (status(error) === 403 && getApiErrorPayload(error)?.code !== COPILOT_ERROR_CODE.STAFF_USER_REQUIRED) {
        return 'Bạn không có quyền điều chỉnh tồn tại kho/chi nhánh này.';
      }
      return copilotErrorMessage(error);
  }
}

/** Thông điệp cho bản nháp FAILED (API trả 200 kèm `errorCode`). */
export function actionDraftFailureMessage(errorCode: string | undefined): string {
  if (!errorCode) return 'Không rõ nguyên nhân.';
  return actionDraftFailureMessages[errorCode] ?? `Không điều chỉnh được (mã ${errorCode}).`;
}
