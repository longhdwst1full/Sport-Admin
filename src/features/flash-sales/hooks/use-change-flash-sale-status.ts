import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import {
  changeAdminFlashSaleStatus,
  getGetAdminFlashSaleQueryKey,
  getListAdminFlashSalesQueryKey,
} from '@/generated/api/promotions/promotions';
import type { FlashSaleCampaignStatus } from '@/generated/api/promotions/promotions.schemas';
import { getApiErrorMessage } from '@/lib/api/error';

/**
 * Đổi trạng thái chiến dịch ngay từ dòng của bảng (không phải mở drawer chi tiết).
 * Gửi `expectedVersion` của dòng đang thấy: có người khác vừa sửa thì backend từ chối thay vì ghi đè.
 * Backend vẫn là nơi quyết định chuyển trạng thái có hợp lệ hay không.
 */
export function useChangeFlashSaleStatus() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, version, status }: { id: string; version: string; status: FlashSaleCampaignStatus }) =>
      changeAdminFlashSaleStatus(id, { expectedVersion: version, status }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(getGetAdminFlashSaleQueryKey(updated.id), updated);
      await queryClient.invalidateQueries({ queryKey: getListAdminFlashSalesQueryKey() });
      void message.success('Đã cập nhật trạng thái chiến dịch');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });
}
