import { useState } from 'react';
import { App, Button, Descriptions, Drawer, Empty, Image, Input, Rate, Tag, Typography } from 'antd';
import { useCan } from '@/core/auth/permissions';
import { useReplyAdminReview } from '@/generated/api/reviews/reviews';
import type { ProductReviewDto } from '@/generated/api/reviews/reviews.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { formatDateTime } from '@/lib/format/datetime';
import { canReplyToReview, REVIEW_STATUS_PRESENTATION } from '../model/review-moderation.policy';

const AUTHOR_TYPE_LABELS: Record<string, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
};

export function ReviewDetailDrawer({
  review,
  onClose,
  onReviewUpdated,
}: {
  review?: ProductReviewDto;
  onClose: () => void;
  onReviewUpdated: (review: ProductReviewDto) => void;
}) {
  const { message } = App.useApp();
  const canReply = useCan('catalog.review.reply');
  const [replyContent, setReplyContent] = useState('');
  const status = review ? REVIEW_STATUS_PRESENTATION[review.status] : undefined;
  const reply = useReplyAdminReview({
    mutation: {
      onSuccess: (updated) => {
        setReplyContent('');
        onReviewUpdated(updated);
        void message.success('Đã gửi phản hồi đến khách hàng.');
      },
      onError: (error) =>
        void message.error(getApiErrorMessage(error, 'Không thể gửi phản hồi đánh giá.')),
    },
  });

  function closeDrawer() {
    if (reply.isPending) return;
    setReplyContent('');
    onClose();
  }

  function submitReply() {
    const content = replyContent.trim();
    if (!review || content.length < 3) return;
    // CONCURRENCY: version trong drawer ngăn phản hồi ghi lên bản review vừa được người khác kiểm duyệt.
    reply.mutate({ id: review.id, data: { content, expectedVersion: review.version } });
  }

  return (
    <Drawer
      open={Boolean(review)}
      onClose={closeDrawer}
      width={680}
      destroyOnHidden
      title={review ? `Đánh giá #${review.id}` : 'Chi tiết đánh giá'}
    >
      {review && (
        <>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }}>
            <Descriptions.Item label="Khách hàng">{review.customerDisplayName}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={status?.color ?? 'default'}>{status?.label ?? review.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Điểm">
              <Rate disabled value={review.rating} className="!text-sm" />
            </Descriptions.Item>
            <Descriptions.Item label="Mua đã xác minh">
              {review.verifiedPurchase ? (
                <Tag color="blue">Có</Tag>
              ) : (
                <Tag color="default">Chưa gắn được với dòng đơn hàng</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Sản phẩm" span={2}>
              <Typography.Text code>{review.productSlug}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Gửi lúc">{formatDateTime(review.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Kiểm duyệt lúc">
              {formatDateTime(review.moderatedAt)}
            </Descriptions.Item>
            {review.moderationReason && (
              <Descriptions.Item label="Lý do kiểm duyệt" span={2}>
                {review.moderationReason}
              </Descriptions.Item>
            )}
          </Descriptions>

          <section className="mt-6">
            <Typography.Title level={5} className="!mb-2">
              {review.title}
            </Typography.Title>
            <Typography.Paragraph className="!mb-0 whitespace-pre-line text-slate-700">
              {review.content}
            </Typography.Paragraph>
          </section>

          {review.media.length > 0 && (
            <section className="mt-6">
              <Typography.Text strong className="text-sm">
                Ảnh từ khách hàng ({review.media.length})
              </Typography.Text>
              <Image.PreviewGroup>
                <div className="mt-3 flex flex-wrap gap-3">
                  {review.media.map((media) => (
                    <Image
                      key={media.id}
                      width={104}
                      height={104}
                      src={media.thumbnailUrl}
                      preview={{ src: media.url }}
                      className="rounded-xl object-cover"
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            </section>
          )}

          <section className="mt-6">
            <Typography.Text strong className="text-sm">
              Phản hồi ({review.comments.length})
            </Typography.Text>
            {review.comments.length === 0 ? (
              <Empty className="!my-4" description="Chưa có phản hồi nào" />
            ) : (
              <ul className="mt-3 space-y-3">
                {review.comments.map((comment) => (
                  <li
                    key={comment.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Typography.Text strong className="text-sm">
                        {comment.authorName}
                        <Tag className="ml-2" color={comment.authorType === 'STAFF' ? 'blue' : 'default'}>
                          {AUTHOR_TYPE_LABELS[comment.authorType] ?? comment.authorType}
                        </Tag>
                      </Typography.Text>
                      <Typography.Text type="secondary" className="text-xs">
                        {formatDateTime(comment.createdAt)}
                      </Typography.Text>
                    </div>
                    <Typography.Paragraph className="!mb-0 !mt-1 whitespace-pre-line text-sm text-slate-700">
                      {comment.content}
                    </Typography.Paragraph>
                  </li>
                ))}
              </ul>
            )}

            {canReplyToReview(review.status, canReply) && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <Typography.Text strong className="text-sm text-slate-800">
                  Phản hồi với tư cách cửa hàng
                </Typography.Text>
                <Input.TextArea
                  className="mt-2"
                  value={replyContent}
                  onChange={(event) => setReplyContent(event.target.value)}
                  maxLength={2000}
                  showCount
                  autoSize={{ minRows: 3, maxRows: 7 }}
                  placeholder="Nhập nội dung phản hồi (tối thiểu 3 ký tự)"
                  disabled={reply.isPending}
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    type="primary"
                    loading={reply.isPending}
                    disabled={replyContent.trim().length < 3}
                    onClick={submitReply}
                  >
                    Gửi phản hồi
                  </Button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </Drawer>
  );
}
