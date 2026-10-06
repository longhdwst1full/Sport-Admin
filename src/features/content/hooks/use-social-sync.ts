import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import {
  getGetAdminSocialDashboardQueryKey,
  getListAdminPostsQueryKey,
  getListAdminSocialPostsQueryKey,
  getListAdminSocialTopPostsQueryKey,
  useRunAdminSocialSync,
} from '@/generated/api/content/content';
import { SocialSyncFacebookSkip, SocialSyncTikTokSkip, type SocialSyncRunDto } from '@/generated/api/content/content.schemas';
import { getApiErrorPayload } from '@/lib/api/error';
import { socialCommandErrorMessage } from '../model/social-command-error';

const TOO_MANY_REQUESTS = 429;

/** Tóm tắt kết quả một lượt đồng bộ cho toast (chỉ các số khác 0). */
export function describeSocialSync(result: SocialSyncRunDto): string {
  const parts = [
    [result.imported, 'nhập bài mới từ Page'],
    [result.scheduledPublished, 'bài hẹn giờ đã lên'],
    [result.reconciled + result.videosResolved, 'bài đã đối soát'],
    [result.tiktokPublished, 'video TikTok đã đăng'],
    [result.metricsRefreshed + result.tiktokMetricsRefreshed, 'bài được cập nhật chỉ số'],
  ]
    .filter(([count]) => Number(count) > 0)
    .map(([count, label]) => `${count} ${label}`);
  const summary = parts.length > 0 ? `Đã đồng bộ: ${parts.join(', ')}.` : 'Đã đồng bộ, không có thay đổi mới.';
  return result.hasMore ? `${summary} Còn việc dở, lượt tự động sau sẽ chạy tiếp.` : summary;
}

/**
 * "Đồng bộ ngay" (`runAdminSocialSync`, quyền `social.post.publish`): chạy một lượt job social-sync rồi làm mới
 * dashboard + danh sách bài. UX: kết quả và lỗi (409 SOCIAL_SYNC_RUNNING, 429) báo bằng toast.
 */
export function useSocialSync() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const mutation = useRunAdminSocialSync({
    mutation: {
      onSuccess: async (result) => {
        const facebookOff = result.skipped === SocialSyncFacebookSkip.DISABLED;
        const tiktokOff = result.tiktokSkipped === SocialSyncTikTokSkip.DISABLED;
        if (facebookOff && tiktokOff) {
          void message.info('Job đồng bộ mạng xã hội đang tắt (FACEBOOK_SYNC_JOB_ENABLED / TIKTOK_SYNC_JOB_ENABLED).');
          return;
        }
        if (result.errors.length > 0) {
          void message.warning(`${describeSocialSync(result)} Có ${result.errors.length} bước lỗi: ${result.errors[0]}`);
        } else {
          void message.success(describeSocialSync(result));
        }
        // CACHE: số liệu và trạng thái bản đăng có thể đã đổi → tải lại dashboard, top bài và các danh sách bài.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetAdminSocialDashboardQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListAdminSocialTopPostsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListAdminSocialPostsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() }),
        ]);
      },
      onError: (error) => {
        void message.error(
          getApiErrorPayload(error)?.statusCode === TOO_MANY_REQUESTS
            ? 'Bấm đồng bộ quá nhanh (tối đa 2 lần mỗi phút). Thử lại sau ít giây.'
            : socialCommandErrorMessage(error),
        );
      },
    },
  });
  return { run: () => mutation.mutate(), isRunning: mutation.isPending };
}
