import { Descriptions, Drawer, Empty, Rate, Tag, Typography } from 'antd';
import type { ProductReviewDto } from '@/generated/api/reviews/reviews.schemas';

const STATUS_PRESENTATION: Record<string, { color: string; label: string }> = {
  // Không còn bước chờ duyệt: đánh giá hiển thị ngay, Admin chỉ gỡ khi cần.
  APPROVED: { color: 'green', label: 'Đang hiển thị' },
  REJECTED: { color: 'red', label: 'Đã ẩn' },
};

const AUTHOR_TYPE_LABELS: Record<string, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
};

function formatDateTime(value?: string): string {
  return value ? new Date(value).toLocaleString('vi-VN') : '—';
}

export function ReviewDetailDrawer({
  review,
  onClose,
}: {
  review?: ProductReviewDto;
  onClose: () => void;
}) {
  const status = review ? STATUS_PRESENTATION[review.status] : undefined;

  return (
    <Drawer
      open={Boolean(review)}
      onClose={onClose}
      width={680}
      destroyOnClose
      title={review ? `Đánh giá #${review.id}` : 'Chi tiết đánh giá'}
    >
      {review && (
        <>
          <Descriptions bordered size="small" column={2}>
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
          </section>
        </>
      )}
    </Drawer>
  );
}
