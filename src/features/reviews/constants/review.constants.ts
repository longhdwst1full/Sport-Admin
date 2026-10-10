import type { StatusPresentation } from '@/foundation/management';
import type { ColumnItem } from '@/foundation/table';
import type { ReviewCommentDtoAuthorType, ReviewModerationStatus } from '@/generated/api/reviews/reviews.schemas';
import { toOptions } from '@/shared/utils/options';

/** Cột bật/tắt được trong "Tuỳ chỉnh cột"; `id` trùng `key` của cột trong bảng đánh giá. */
export const REVIEW_COLUMN_ITEMS: ColumnItem[] = [
  { id: 'customer', label: 'Khách hàng', fixed: true },
  { id: 'rating', label: 'Đánh giá sao' },
  { id: 'content', label: 'Nội dung nhận xét' },
  { id: 'comments', label: 'Số phản hồi' },
  { id: 'status', label: 'Trạng thái' },
];

// Đánh giá của khách đã mua vào thẳng APPROVED và hiển thị ngay (hậu kiểm); PENDING chỉ còn ở dữ
// liệu cũ trước khi đổi hành vi, không còn là trạng thái mới nào đi vào nữa.
// APPROVED ở đây nghĩa là đang hiển thị công khai (đã xuất bản) nên dùng tone `success`, không phải `info`.
export const REVIEW_STATUS_PRESENTATION: Record<ReviewModerationStatus, StatusPresentation> = {
  PENDING: { color: 'warning', label: 'Chờ duyệt (dữ liệu cũ)' },
  APPROVED: { color: 'success', label: 'Đang hiển thị' },
  REJECTED: { color: 'danger', label: 'Đã ẩn' },
};

export const REVIEW_STATUS_OPTIONS = toOptions(REVIEW_STATUS_PRESENTATION);

export const REVIEW_AUTHOR_TYPE_LABELS: Record<ReviewCommentDtoAuthorType, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
};
