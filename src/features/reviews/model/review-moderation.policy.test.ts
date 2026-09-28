import { describe, expect, it } from 'vitest';
import type { ProductReviewDto } from '@/generated/api/reviews/reviews.schemas';
import { canReplyToReview, getReviewMetrics } from './review-moderation.policy';

function review(id: string, status: ProductReviewDto['status'], rating: number): ProductReviewDto {
  return {
    id,
    productSlug: 'ta-tay-5kg',
    customerDisplayName: 'Khách đã mua',
    rating,
    title: 'Đánh giá',
    content: 'Nội dung đánh giá đủ dài.',
    verifiedPurchase: true,
    status,
    version: 0,
    comments: [],
    media: [],
    createdAt: '2026-09-28T00:00:00.000Z',
  };
}

describe('review moderation policy', () => {
  it('counts PENDING separately and computes average from actual data', () => {
    expect(getReviewMetrics([
      review('1', 'PENDING', 5),
      review('2', 'APPROVED', 3),
      review('3', 'REJECTED', 4),
    ])).toEqual({ total: 3, approved: 1, pending: 1, averageRating: '4.0' });
  });

  it('only exposes reply for APPROVED review with reply permission', () => {
    expect(canReplyToReview('APPROVED', true)).toBe(true);
    expect(canReplyToReview('PENDING', true)).toBe(false);
    expect(canReplyToReview('REJECTED', true)).toBe(false);
    expect(canReplyToReview('APPROVED', false)).toBe(false);
  });
});
