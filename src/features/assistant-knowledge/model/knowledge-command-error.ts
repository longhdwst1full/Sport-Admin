import { getApiErrorMessage, getApiErrorPayload } from '@/lib/api/error';
import { KNOWLEDGE_ERROR_CODE } from '../constants/knowledge.constants';

/**
 * SECURITY: API chặn phạm vi chi nhánh ở mọi route tri thức. Tài khoản theo chi nhánh chỉ quản lý tài
 * liệu của chi nhánh mình; tài liệu "tất cả chi nhánh" chỉ tài khoản GLOBAL được gắn/quản lý.
 */
const BRANCH_SCOPE_DENIED_MESSAGE =
  'Bạn không có quyền với chi nhánh này. Tài khoản theo chi nhánh chỉ quản lý tài liệu của chi nhánh mình; tài liệu áp dụng cho tất cả chi nhánh chỉ tài khoản toàn hệ thống được thao tác.';

/** Thông điệp khi gắn bài CMS; mã không có lời giải thích riêng dùng thông điệp của API. */
export function attachKnowledgeErrorMessage(error: unknown): string {
  switch (getApiErrorPayload(error)?.code) {
    case KNOWLEDGE_ERROR_CODE.ALREADY_ATTACHED:
      return 'Bài này đã được gắn với đối tượng/chi nhánh khác. V1 chưa hỗ trợ đổi phạm vi của tài liệu đã gắn.';
    case KNOWLEDGE_ERROR_CODE.SOURCE_NOT_VISIBLE:
      return 'Bài CMS đã lưu trữ hoặc không còn hiển thị nên không gắn được.';
    case KNOWLEDGE_ERROR_CODE.BRANCH_SCOPE_DENIED:
      return BRANCH_SCOPE_DENIED_MESSAGE;
    default:
      return getApiErrorMessage(error);
  }
}

/** Thông điệp khi xuất bản/lưu trữ một tài liệu đang hiển thị trong danh sách. */
export function knowledgeTransitionErrorMessage(error: unknown): string {
  switch (getApiErrorPayload(error)?.code) {
    case KNOWLEDGE_ERROR_CODE.VERSION_CONFLICT:
    case KNOWLEDGE_ERROR_CODE.INVALID_TRANSITION:
      return 'Tài liệu vừa được người khác thay đổi. Danh sách đã tải lại, vui lòng xem lại rồi thao tác.';
    case KNOWLEDGE_ERROR_CODE.NOT_FOUND:
      // SECURITY: API trả 404 cho cả tài liệu đã mất lẫn tài liệu ngoài phạm vi chi nhánh — không đoán lý do.
      return 'Không tìm thấy tài liệu trong phạm vi chi nhánh của bạn. Danh sách đã tải lại.';
    case KNOWLEDGE_ERROR_CODE.BRANCH_SCOPE_DENIED:
      return BRANCH_SCOPE_DENIED_MESSAGE;
    case KNOWLEDGE_ERROR_CODE.SOURCE_NOT_VISIBLE:
      return 'Bài CMS nguồn chưa xuất bản hoặc đang ẩn nên chưa xuất bản được cho trợ lý.';
    case KNOWLEDGE_ERROR_CODE.SOURCE_EMPTY:
      return 'Bài CMS nguồn không có nội dung để lập chỉ mục.';
    default:
      return getApiErrorMessage(error);
  }
}
