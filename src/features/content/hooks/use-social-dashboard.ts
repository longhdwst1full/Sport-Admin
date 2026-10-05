import { useCallback, useMemo } from 'react';
import { useGetAdminSocialDashboard, useListAdminSocialTopPosts } from '@/generated/api/content/content';
import { SocialTopPostSort } from '@/generated/api/content/content.schemas';
import {
  SOCIAL_TOP_POSTS_LIMIT,
  toDashboardChannelFilter,
  toSocialDashboardViewModel,
  type SocialDashboardFilters,
  type SocialDashboardViewModel,
} from '../model/social-dashboard';

export interface SocialDashboardState {
  data: SocialDashboardViewModel;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Nguồn dữ liệu của "Dashboard mạng xã hội": `getAdminSocialDashboard` (KPI + chuỗi theo ngày) và
 * `listAdminSocialTopPosts` (bài nổi bật theo lượt xem) cùng khoảng ngày VN/kênh; mapper → view-model (`source: 'api'`).
 * Quyền `cms.content.view`.
 */
export function useSocialDashboard(filters: SocialDashboardFilters): SocialDashboardState {
  const channel = toDashboardChannelFilter(filters.channel);
  const dashboard = useGetAdminSocialDashboard(
    { from: filters.from, to: filters.to, channel },
    { query: { retry: false } },
  );
  const topPosts = useListAdminSocialTopPosts(
    { from: filters.from, to: filters.to, channel, sort: SocialTopPostSort.VIEWS, limit: SOCIAL_TOP_POSTS_LIMIT },
    { query: { retry: false } },
  );
  const { refetch: refetchDashboard } = dashboard;
  const { refetch: refetchTopPosts } = topPosts;
  const refetch = useCallback(() => {
    void refetchDashboard();
    void refetchTopPosts();
  }, [refetchDashboard, refetchTopPosts]);

  const data = useMemo(
    () => toSocialDashboardViewModel(dashboard.data, topPosts.data?.items),
    [dashboard.data, topPosts.data],
  );

  return {
    data,
    isLoading: dashboard.isLoading || topPosts.isLoading,
    isFetching: dashboard.isFetching || topPosts.isFetching,
    error: dashboard.error ?? topPosts.error ?? null,
    refetch,
  };
}
