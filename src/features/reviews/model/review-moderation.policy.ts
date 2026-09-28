import type { ProductReviewDto } from '@/generated/api/reviews/reviews.schemas';

export const REVIEW_STATUS_PRESENTATION: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'gold', label: 'Chờ duyệt' },
  APPROVED: { color: 'green', label: 'Đang hiển thị' },
  REJECTED: { color: 'red', label: 'Đã từ chối' },
};

export function getReviewMetrics(items: readonly ProductReviewDto[]) {
  const total = items.length;
  const approved = items.filter((item) => item.status === 'APPROVED').length;
  const pending = items.filter((item) => item.status === 'PENDING').length;
  const averageRating = total > 0
    ? (items.reduce((sum, item) => sum + item.rating, 0) / total).toFixed(1)
    : '0.0';
  return { total, approved, pending, averageRating };
}

/** UI affordance only; API still authorizes `catalog.review.reply` and validates status/version. */
export function canReplyToReview(status: ProductReviewDto['status'], hasPermission: boolean): boolean {
  return hasPermission && status === 'APPROVED';
}
