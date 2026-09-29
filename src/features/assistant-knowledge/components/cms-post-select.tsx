import { useState } from 'react';
import { Select } from 'antd';
import { AsyncPagedSelect } from '@/foundation/inputs/async-paged-select';
import { listAdminPosts } from '@/generated/api/content/content';
import type { ContentPostSummaryDto, ContentPostType } from '@/generated/api/content/content.schemas';
import { formatDate } from '@/lib/format/datetime';
import { contentPostTypeLabels } from '../constants/knowledge.constants';

const postTypeOptions = Object.entries(contentPostTypeLabels).map(([value, label]) => ({ value, label }));

/**
 * Chọn bài CMS để gắn vào kho tri thức, dùng `listAdminPosts` đã có trong SDK content.
 *
 * CONTRACT: `listAdminPosts` chỉ lọc theo `postType` và phân trang, chưa có tìm theo tiêu đề; vì vậy ô
 * này tắt gõ tìm (lọc trên trang đã tải sẽ báo "không có" cho bài nằm ở trang sau) và cho lọc theo loại
 * bài + cuộn tải thêm. Bài đã lưu trữ bị khoá vì không nên đưa nội dung đã gỡ vào trợ lý; API vẫn là nơi
 * quyết định bài nào gắn được.
 */
export function CmsPostSelect({
  value,
  onChange,
  onSelectPost,
  disabled,
}: {
  value?: string;
  onChange?: (postId?: string) => void;
  onSelectPost?: (post: ContentPostSummaryDto) => void;
  disabled?: boolean;
}) {
  const [postType, setPostType] = useState<ContentPostType>();

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        allowClear
        className="min-w-44"
        value={postType}
        onChange={(next?: ContentPostType) => {
          setPostType(next);
          onChange?.(undefined);
        }}
        placeholder="Loại bài"
        options={postTypeOptions}
        disabled={disabled}
      />
      <AsyncPagedSelect<ContentPostSummaryDto>
        className="min-w-72 flex-1"
        placeholder="Chọn bài viết CMS"
        value={value}
        onChange={(next?: string) => onChange?.(next)}
        onSelectItem={onSelectPost}
        disabled={disabled}
        showSearch={false}
        queryKey={['assistant-knowledge', 'cms-posts', postType ?? 'ALL']}
        fetchPage={async ({ page, limit }) => {
          const result = await listAdminPosts({ page, limit, postType });
          return { items: result.items, hasMore: result.meta.hasMore };
        }}
        toOption={(post) => ({ value: post.id, label: post.title, disabled: post.status === 'ARCHIVED' })}
        renderOption={(post) => (
          <div>
            <div className="font-medium">{post.title}</div>
            <div className="text-xs text-slate-500">
              {contentPostTypeLabels[post.postType]} · {formatDate(post.publishedAt)}
              {post.status === 'ARCHIVED' && ' · Đã lưu trữ'}
              {!post.isPublished && post.status !== 'ARCHIVED' && ' · Đang ẩn'}
            </div>
          </div>
        )}
      />
    </div>
  );
}
