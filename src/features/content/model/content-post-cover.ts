import type { ContentPostDto } from '@/generated/api/content/content.schemas';

export interface CoverDraft {
  coverUrl: string;
  /** Có khi ảnh bìa là asset thư viện (vừa upload hoặc bài đã gắn); dán URL tay thì bỏ trống. */
  coverAssetId?: string;
}

export type CoverPayload = { coverAssetId: string } | { coverUrl: string } | Record<string, never>;

/**
 * Trường ảnh bìa gửi lên createAdminPost/updateAdminPost.
 *
 * CONTRACT: asset thư viện gửi `coverAssetId` (API tự lấy URL của asset); chỉ URL dán tay mới gửi `coverUrl`.
 * Khi sửa (`current` có giá trị), ảnh bìa không đổi thì không gửi gì — bài cũ có URL ngoài allowlist host của API
 * (400 CMS_COVER_URL_NOT_ALLOWED) vẫn sửa được phần khác.
 */
export function toCoverPayload(draft: CoverDraft, current?: Pick<ContentPostDto, 'coverUrl' | 'coverAssetId'>): CoverPayload {
  const coverUrl = draft.coverUrl.trim();
  const coverAssetId = draft.coverAssetId || undefined;
  if (current && coverUrl === current.coverUrl && (coverAssetId ?? null) === (current.coverAssetId ?? null)) return {};
  return coverAssetId ? { coverAssetId } : { coverUrl };
}
