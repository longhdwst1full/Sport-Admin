import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  approveAdminFacebookPost,
  cancelAdminFacebookPost,
  createAdminFacebookDraft,
  createAdminSocialPost,
  deleteAdminFacebookPost,
  getGetAdminSocialPostQueryKey,
  getListAdminPostsQueryKey,
  getListAdminSocialPostsQueryKey,
  reconcileAdminFacebookPost,
  rejectAdminFacebookPost,
  retryAdminFacebookPost,
  submitAdminFacebookPost,
  updateAdminFacebookCaption,
  updateAdminFacebookDraft,
} from '@/generated/api/content/content';
import type { FacebookReconcileResolution, SocialPostDetailDto } from '@/generated/api/content/content.schemas';
import { getApiErrorPayload } from '@/lib/api/error';
import { nextIdempotencyKey } from '@/shared/utils/idempotency';
import { SOCIAL_ERROR_CODE, SOCIAL_STALE_ERROR_CODES } from '../constants/social.constants';
import {
  toCreateFacebookDraftDto,
  toCreateSocialPostDto,
  toUpdateFacebookDraftDto,
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

/** Lệnh gọi Facebook và bắt buộc `Idempotency-Key` theo contract. */
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
 * Chạy một lệnh Facebook trên bài (gửi duyệt, duyệt/hẹn giờ, từ chối, đăng lại, đối soát, huỷ, xoá, sửa caption).
 *
 * CONCURRENCY: body luôn mang `expectedVersion` của lần tải gần nhất; mã "stale" làm tải lại chi tiết/danh sách.
 *
 * IDEMPOTENCY: approve/retry/delete gửi `Idempotency-Key`. Bấm lại cùng nội dung sau lỗi mạng dùng lại key cũ
 * để API trả kết quả cũ (không đăng Facebook hai lần); đổi nội dung thì sinh key mới; thành công hoặc 409 thì
 * xoá key để lệnh kế tiếp là giao dịch mới.
 */
export function useSocialPostCommand(post: Pick<SocialPostDetailDto, 'id' | 'version'> | undefined) {
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
          JSON.stringify({ id, expectedVersion, command }),
        );
        options = { headers: { 'Idempotency-Key': idempotencyRef.current.key } };
      }
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

/** Mục tiêu lưu của drawer soạn bài Facebook. */
export type SocialSaveTarget =
  | { mode: 'createSocial' }
  /** Mở bản nháp Facebook cho bài website (caption = nội dung bài). */
  | { mode: 'createDraft'; postId: string; version: number }
  | { mode: 'updateDraft'; postId: string; version: number; isSocial: boolean };

export function useSaveSocialPost(target: SocialSaveTarget) {
  const sync = useSocialCacheSync();
  return useMutation<SocialPostDetailDto, unknown, SocialPostFormValues>({
    retry: false,
    mutationFn: (values) => {
      switch (target.mode) {
        case 'createSocial':
          return createAdminSocialPost(toCreateSocialPostDto(values));
        case 'createDraft':
          return createAdminFacebookDraft(target.postId, toCreateFacebookDraftDto(values, target.version));
        case 'updateDraft':
          return updateAdminFacebookDraft(
            target.postId,
            toUpdateFacebookDraftDto(values, target.version, target.isSocial),
          );
      }
    },
    onSuccess: (saved) => sync.saved(saved),
    onError: (error) => sync.stale(error, target.mode === 'createSocial' ? undefined : target.postId),
  });
}
