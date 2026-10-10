import type { ProductReviewDto } from '@/generated/api/reviews/reviews.schemas';

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
