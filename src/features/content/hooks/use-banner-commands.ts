import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAdminBanner,
  getGetAdminBannerQueryKey,
  getListAdminBannersQueryKey,
  setAdminBannerStatus,
  updateAdminBanner,
} from '@/generated/api/content/content';
import type { BannerDto, SetBannerStatusDto } from '@/generated/api/content/content.schemas';
import { getApiErrorPayload } from '@/lib/api/error';
import { BANNER_STALE_ERROR_CODES } from '../constants/banner.constants';
import {
  toCreateBannerDto,
  toUpdateBannerDto,
  type BannerFormValues,
} from '../model/banner-form.mapper';

/**
 * CONCURRENCY: mã "stale" (version cũ, đã lưu trữ, không còn tồn tại) làm tải lại danh sách và chi tiết
 * để lần thao tác sau dùng version mới; người dùng thấy thông báo từ `bannerCommandErrorMessage`.
 */
function useInvalidateOnStale() {
  const queryClient = useQueryClient();
  return async (error: unknown, bannerId?: string) => {
    const code = getApiErrorPayload(error)?.code;
    if (!code || !BANNER_STALE_ERROR_CODES.has(code)) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListAdminBannersQueryKey() }),
      bannerId
        ? queryClient.invalidateQueries({ queryKey: getGetAdminBannerQueryKey(bannerId) })
        : Promise.resolve(),
    ]);
  };
}

/** Tạo (DRAFT) hoặc sửa banner; `editing` là bản chi tiết vừa tải — version lấy từ đó. */
export function useSaveBanner(editing: BannerDto | undefined) {
  const queryClient = useQueryClient();
  const invalidateOnStale = useInvalidateOnStale();
  return useMutation<BannerDto, unknown, BannerFormValues>({
    retry: false,
    mutationFn: (values) =>
      editing
        ? updateAdminBanner(editing.id, toUpdateBannerDto(values, editing.version))
        : createAdminBanner(toCreateBannerDto(values)),
    onSuccess: async (saved) => {
      // CACHE: ghi thẳng chi tiết mới; danh sách lọc theo vị trí/trạng thái nên invalidate.
      queryClient.setQueryData(getGetAdminBannerQueryKey(saved.id), saved);
      await queryClient.invalidateQueries({ queryKey: getListAdminBannersQueryKey() });
    },
    onError: (error) => invalidateOnStale(error, editing?.id),
  });
}

/** Xuất bản / gỡ về nháp / lưu trữ qua `setAdminBannerStatus` — không bao giờ PATCH thẳng `status`. */
export function useSetBannerStatus() {
  const queryClient = useQueryClient();
  const invalidateOnStale = useInvalidateOnStale();
  return useMutation<BannerDto, unknown, { id: string; body: SetBannerStatusDto }>({
    retry: false,
    mutationFn: ({ id, body }) => setAdminBannerStatus(id, body),
    onSuccess: async (saved) => {
      queryClient.setQueryData(getGetAdminBannerQueryKey(saved.id), saved);
      await queryClient.invalidateQueries({ queryKey: getListAdminBannersQueryKey() });
    },
    onError: (error, { id }) => invalidateOnStale(error, id),
  });
}
