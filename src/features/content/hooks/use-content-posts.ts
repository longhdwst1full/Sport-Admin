import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ADMIN_TABLE_DEFAULT_PAGE_SIZE } from '@/foundation/table';
import {
  getListAdminPostsQueryKey,
  getListAdminSocialPostsQueryKey,
  updateAdminPost,
  useDeleteAdminPost,
  useListAdminSocialPosts,
} from '@/generated/api/content/content';
import { AnyContentPostType, type SocialPostSummaryDto } from '@/generated/api/content/content.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { useUrlFilters } from '@/shared/hooks/use-url-filters';
import { CONTENT_TAB, LEGACY_SOCIAL_TAB } from '../constants/social.constants';
import { needsAttention } from '../model/social-actions.policy';
import { parseSocialFilters, toSocialListParams } from '../model/social-post-filters';

export const CONTENT_PAGE_SIZE = ADMIN_TABLE_DEFAULT_PAGE_SIZE;

/**
 * Dữ liệu màn bài viết: bộ lọc trên URL (tab, kênh, trạng thái, loại, nguồn, khoảng ngày), ô tìm kiếm debounce
 * chỉ sống trong màn, phân trang server (`listAdminSocialPosts`) và hai lệnh trên bài website (ẩn/hiện, lưu trữ).
 */
export function useContentPosts() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const { patch: updateParams } = useUrlFilters();
  const filters = parseSocialFilters(params);
  const legacyTab = params.get('tab') === LEGACY_SOCIAL_TAB;
  const search = useSearchState();
  const [page, setPage] = useListPageReset([
    search.debounced,
    filters.tab,
    filters.channel,
    filters.fbStatus,
    filters.tiktokStatus,
    filters.postType,
    filters.origin,
    filters.from,
    filters.to,
  ]);

  // Link cũ `?tab=facebook` → `?tab=social`, giữ nguyên các bộ lọc khác.
  useEffect(() => {
    if (!legacyTab) return;
    updateParams({ tab: CONTENT_TAB.SOCIAL });
  }, [legacyTab, updateParams]);

  const list = useListAdminSocialPosts(
    toSocialListParams(filters, { page, limit: CONTENT_PAGE_SIZE, search: search.debounced }),
    { query: { retry: false } },
  );
  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const total = list.data?.meta.total ?? 0;
  const pageStats = useMemo(
    () => ({
      facebook: rows.filter((row) => row.facebook).length,
      attention: rows.filter((row) => needsAttention(row.facebook?.status) || needsAttention(row.tiktok?.status)).length,
      website: rows.filter((row) => row.postType !== AnyContentPostType.SOCIAL && row.isPublished).length,
    }),
    [rows],
  );

  // CACHE: màn này đọc danh sách gộp; danh sách bài website vẫn invalidate cho màn khác.
  const invalidateLists = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getListAdminSocialPostsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() }),
    ]);

  // Cờ hiển thị tách khỏi trạng thái: ẩn tạm một bài viết không phải lưu trữ nó.
  const visibility = useMutation({
    mutationFn: ({ row, next }: { row: SocialPostSummaryDto; next: boolean }) =>
      updateAdminPost(row.id, { expectedVersion: row.version, isPublished: next }),
    onSuccess: async (_result, { next }) => {
      await invalidateLists();
      void message.success(next ? 'Đã hiện bài viết trên website' : 'Đã ẩn bài viết khỏi website');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

  const archive = useDeleteAdminPost({
    mutation: {
      onSuccess: async () => {
        await invalidateLists();
        void message.success('Đã lưu trữ bài viết và gỡ khỏi website.');
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể lưu trữ bài viết.')),
    },
  });

  return { filters, updateParams, search, page, setPage, list, rows, total, pageStats, visibility, archive };
}
