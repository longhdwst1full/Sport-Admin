import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  approveAdminFacebookPost,
  approveAdminTikTokPost,
  cancelAdminFacebookPost,
  cancelAdminTikTokPost,
  createAdminFacebookDraft,
  createAdminSocialPost,
  createAdminTikTokDraft,
  deleteAdminFacebookPost,
  deleteAdminTikTokPost,
  getGetAdminSocialPostQueryKey,
  getListAdminPostsQueryKey,
  getListAdminSocialPostsQueryKey,
  reconcileAdminFacebookPost,
  reconcileAdminTikTokPost,
  rejectAdminFacebookPost,
  rejectAdminTikTokPost,
  retryAdminFacebookPost,
  retryAdminTikTokPost,
  submitAdminFacebookPost,
  submitAdminTikTokPost,
  updateAdminFacebookCaption,
  updateAdminFacebookDraft,
  updateAdminTikTokDraft,
} from '@/generated/api/content/content';
import type {
  FacebookReconcileResolution,
  SocialChannel as ApiSocialChannel,
  SocialPostDetailDto,
  TikTokOptionsInputDto,
} from '@/generated/api/content/content.schemas';
import { getApiErrorPayload } from '@/lib/api/error';
import { nextIdempotencyKey } from '@/shared/utils/idempotency';
import { SOCIAL_CHANNEL, SOCIAL_ERROR_CODE, SOCIAL_STALE_ERROR_CODES, type SocialChannel } from '../constants/social.constants';
import {
  toCreateFacebookDraftDto,
  toCreateSocialPostDto,
  toCreateTikTokDraftDto,
  toUpdateFacebookDraftDto,
  toUpdateTikTokDraftDto,
  type SocialPostFormValues,
} from '../model/social-post-form.mapper';

/** Nội dung lệnh theo đúng field của DTO; `expectedVersion` do hook gắn từ bài đang hiển thị. */
export type SocialCommand =
  | { action: 'submit' }
  | { action: 'approve'; body: { scheduledAt?: string; asReel?: boolean } }
  | { action: 'retry'; body: { scheduledAt?: string; asReel?: boolean } }
  | { action: 'reject'; body: { reason: string } }
  | { action: 'reconcile'; body: { externalPostId?: string; resolution?: FacebookReconcileResolution } }
  | { action: 'cancel'; body: { reason?: string } }
  | { action: 'delete'; body: { reason?: string } }
  | { action: 'editCaption'; body: { body?: string } };

/** Lệnh gọi Facebook/TikTok và bắt buộc `Idempotency-Key` theo contract (cả hai kênh cùng bộ approve/retry/delete). */
const IDEMPOTENT_ACTIONS: ReadonlySet<SocialCommand['action']> = new Set(['approve', 'retry', 'delete']);

function useSocialCacheSync() {
  const queryClient = useQueryClient();
  return {
    saved: async (saved: SocialPostDetailDto) => {
      // CACHE: ghi thẳng chi tiết mới; danh sách lọc theo trạng thái nên invalidate (cả list bài website).
      queryClient.setQueryData(getGetAdminSocialPostQueryKey(saved.id), saved);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminSocialPostsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() }),
      ]);
    },
    stale: async (error: unknown, postId?: string) => {
      const code = getApiErrorPayload(error)?.code;
      if (!code || !SOCIAL_STALE_ERROR_CODES.has(code)) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminSocialPostsQueryKey() }),
        postId ? queryClient.invalidateQueries({ queryKey: getGetAdminSocialPostQueryKey(postId) }) : Promise.resolve(),
      ]);
    },
  };
}

/**
 * Chạy một lệnh trên bản đăng `channel` của bài. Facebook: gửi duyệt, duyệt/hẹn giờ, từ chối, đăng lại, đối soát,
 * huỷ, xoá, sửa caption. TikTok: như Facebook nhưng không hẹn giờ/Reel và không sửa caption sau khi đăng.
 *
 * CONCURRENCY: body luôn mang `expectedVersion` của lần tải gần nhất; mã "stale" làm tải lại chi tiết/danh sách.
 *
 * IDEMPOTENCY: approve/retry/delete gửi `Idempotency-Key`. Bấm lại cùng nội dung sau lỗi mạng dùng lại key cũ
 * để API trả kết quả cũ (không đăng Facebook hai lần); đổi nội dung thì sinh key mới; thành công hoặc 409 thì
 * xoá key để lệnh kế tiếp là giao dịch mới.
 */
export function useSocialPostCommand(
  post: Pick<SocialPostDetailDto, 'id' | 'version'> | undefined,
  channel: SocialChannel = SOCIAL_CHANNEL.FACEBOOK,
) {
  const sync = useSocialCacheSync();
  const idempotencyRef = useRef<{ signature: string; key: string } | undefined>(undefined);

  return useMutation<SocialPostDetailDto, unknown, SocialCommand>({
    retry: false,
    mutationFn: (command) => {
      if (!post) throw new Error('Chưa tải được bài viết');
      const { id } = post;
      const expectedVersion = post.version;
      let options: { headers: Record<string, string> } | undefined;
      if (IDEMPOTENT_ACTIONS.has(command.action)) {
        idempotencyRef.current = nextIdempotencyKey(
          idempotencyRef.current,
          JSON.stringify({ id, expectedVersion, channel, command }),
        );
        options = { headers: { 'Idempotency-Key': idempotencyRef.current.key } };
      }
      if (channel === SOCIAL_CHANNEL.TIKTOK) return runTikTokCommand(id, expectedVersion, command, options);
      switch (command.action) {
        case 'submit':
          return submitAdminFacebookPost(id, { expectedVersion });
        case 'approve':
          return approveAdminFacebookPost(id, { ...command.body, expectedVersion }, options);
        case 'retry':
          return retryAdminFacebookPost(id, { ...command.body, expectedVersion }, options);
        case 'reject':
          return rejectAdminFacebookPost(id, { ...command.body, expectedVersion });
        case 'reconcile':
          return reconcileAdminFacebookPost(id, { ...command.body, expectedVersion });
        case 'cancel':
          return cancelAdminFacebookPost(id, { ...command.body, expectedVersion });
        case 'delete':
          return deleteAdminFacebookPost(id, { ...command.body, expectedVersion }, options);
        case 'editCaption':
          return updateAdminFacebookCaption(id, { ...command.body, expectedVersion });
      }
    },
    onSuccess: async (saved) => {
      idempotencyRef.current = undefined;
      await sync.saved(saved);
    },
    onError: async (error) => {
      const code = getApiErrorPayload(error)?.code;
      if (code === SOCIAL_ERROR_CODE.IDEMPOTENCY_CONFLICT || (code && SOCIAL_STALE_ERROR_CODES.has(code))) {
        idempotencyRef.current = undefined;
      }
      await sync.stale(error, post?.id);
    },
  });
}

/** TikTok: approve/retry chỉ mang `expectedVersion` (không hẹn giờ/Reel); không có sửa caption. */
function runTikTokCommand(
  id: string,
  expectedVersion: number,
  command: SocialCommand,
  options: { headers: Record<string, string> } | undefined,
): Promise<SocialPostDetailDto> {
  switch (command.action) {
    case 'submit':
      return submitAdminTikTokPost(id, { expectedVersion });
    case 'approve':
      return approveAdminTikTokPost(id, { expectedVersion }, options);
    case 'retry':
      return retryAdminTikTokPost(id, { expectedVersion }, options);
    case 'reject':
      return rejectAdminTikTokPost(id, { ...command.body, expectedVersion });
    case 'reconcile':
      return reconcileAdminTikTokPost(id, { ...command.body, expectedVersion });
    case 'cancel':
      return cancelAdminTikTokPost(id, { ...command.body, expectedVersion });
    case 'delete':
      return deleteAdminTikTokPost(id, { ...command.body, expectedVersion }, options);
    case 'editCaption':
      throw new Error('TikTok không cho sửa caption sau khi đăng');
  }
}

/** Mục tiêu lưu của drawer soạn bài. */
export type SocialSaveTarget =
  | { mode: 'createSocial' }
  /** Mở bản nháp `channel` cho bài đã có (bài website: caption = nội dung bài). */
  | { mode: 'createDraft'; channel: SocialChannel; postId: string; version: number }
  /** `captionLocked`: kênh còn lại đã rời nháp — không gửi caption (API 400 SOCIAL_CONTENT_EDIT_NOT_ALLOWED). */
  | { mode: 'updateDraft'; channel: SocialChannel; postId: string; version: number; isSocial: boolean; captionLocked: boolean };

/** Dữ liệu lưu: giá trị form + kênh đã chọn (chỉ khi tạo bài) + thiết lập TikTok (khi có kênh TikTok). */
export interface SocialSaveInput {
  values: SocialPostFormValues;
  channels: ApiSocialChannel[];
  tiktok?: TikTokOptionsInputDto;
}

export function useSaveSocialPost(target: SocialSaveTarget) {
  const sync = useSocialCacheSync();
  return useMutation<SocialPostDetailDto, unknown, SocialSaveInput>({
    retry: false,
    mutationFn: ({ values, channels, tiktok }) => {
      switch (target.mode) {
        case 'createSocial':
          return createAdminSocialPost(toCreateSocialPostDto(values, channels, tiktok));
        case 'createDraft':
          return target.channel === SOCIAL_CHANNEL.TIKTOK
            ? createAdminTikTokDraft(target.postId, toCreateTikTokDraftDto(values, target.version, tiktok ?? {}))
            : createAdminFacebookDraft(target.postId, toCreateFacebookDraftDto(values, target.version));
        case 'updateDraft':
          return target.channel === SOCIAL_CHANNEL.TIKTOK
            ? updateAdminTikTokDraft(
                target.postId,
                toUpdateTikTokDraftDto(values, target.version, target.isSocial && !target.captionLocked, tiktok ?? {}),
              )
            : updateAdminFacebookDraft(
                target.postId,
                toUpdateFacebookDraftDto(values, target.version, target.isSocial, target.captionLocked),
              );
      }
    },
    onSuccess: (saved) => sync.saved(saved),
    onError: (error) => sync.stale(error, target.mode === 'createSocial' ? undefined : target.postId),
  });
}
