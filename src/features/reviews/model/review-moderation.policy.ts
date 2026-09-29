import type { ProductReviewDto } from '@/generated/api/reviews/reviews.schemas';

// Đánh giá của khách đã mua vào thẳng APPROVED và hiển thị ngay (hậu kiểm); PENDING chỉ còn ở dữ
// liệu cũ trước khi đổi hành vi, không còn là trạng thái mới nào đi vào nữa.
export const REVIEW_STATUS_PRESENTATION: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'gold', label: 'Chờ duyệt (dữ liệu cũ)' },
  APPROVED: { color: 'green', label: 'Đang hiển thị' },
  REJECTED: { color: 'red', label: 'Đã ẩn' },
};

export function getReviewMetrics(items: readonly ProductReviewDto[]) {
  const total = items.length;
  const approved = items.filter((item) => item.status === 'APPROVED').length;
  const hidden = items.filter((item) => item.status === 'REJECTED').length;
  const averageRating = total > 0
    ? (items.reduce((sum, item) => sum + item.rating, 0) / total).toFixed(1)
    : '0.0';
  return { total, approved, hidden, averageRating };
}

/** UI affordance only; API still authorizes `catalog.review.reply` and validates status/version. */
export function canReplyToReview(status: ProductReviewDto['status'], hasPermission: boolean): boolean {
  return hasPermission && status === 'APPROVED';
}
