import { Image } from 'antd';
import type { ReactNode } from 'react';
import { IMAGE_FALLBACK_SRC } from '@/features/media';

/**
 * Ô "Bài viết" dùng chung cho bảng bài viết và bảng bài nổi bật của dashboard: ảnh bìa 48px (tải lười, có ảnh
 * dự phòng), tiêu đề cắt dòng và dòng phụ do nơi gọi truyền vào. Có `onOpen` thì tiêu đề là nút mở chi tiết.
 */
export function SocialPostTitleCell({
  title,
  imageUrl,
  onOpen,
  children,
}: {
  title: string;
  imageUrl?: string | null;
  onOpen?: () => void;
  children?: ReactNode;
}) {
  const titleClass = 'block max-w-[260px] truncate text-left text-xs font-semibold text-slate-800';
  return (
    <div className="flex items-center gap-3">
      <Image
        width={48}
        height={48}
        loading="lazy"
        className="rounded-lg border border-slate-200 object-cover"
        src={imageUrl ?? IMAGE_FALLBACK_SRC}
        fallback={IMAGE_FALLBACK_SRC}
        alt={title}
        preview={false}
      />
      <div className="min-w-0">
        {onOpen ? (
          <button type="button" className={`${titleClass} hover:text-blue-600`} onClick={onOpen}>
            {title}
          </button>
        ) : (
          <div className={titleClass}>{title}</div>
        )}
        {children}
      </div>
    </div>
  );
}
