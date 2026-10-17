import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import {
  createAdminFlashSale,
  getGetAdminFlashSaleQueryKey,
  getListAdminFlashSalesQueryKey,
  updateAdminFlashSale,
  upsertAdminFlashSaleItem,
} from '@/generated/api/promotions/promotions';
import type { FlashSaleCampaignDetailDto } from '@/generated/api/promotions/promotions.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import type { FlashSaleSubmit } from '../components/flash-sale-form-drawer';
import {
  toCreateFlashSalePayload,
  toUpdateFlashSalePayload,
  toUpsertFlashSaleItemPayload,
} from '../model/flash-sale.mapper';

/**
 * Lưu tất cả: tạo/sửa chiến dịch trước, rồi ghi từng suất bán.
 *
 * CONTRACT: API không có lệnh lưu chiến dịch kèm suất trong một giao dịch, nên ghi tuần tự. Suất
 * không làm đổi `version` của chiến dịch, nên sửa chiến dịch trước rồi mới tới suất là an toàn.
 * Suất lỗi được báo tên để sửa rồi lưu lại; các suất đã ghi không bị hoàn tác.
 */
export function useSaveFlashSale(onSaved: (campaignId: string, mode: 'create' | 'update') => void) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ submit, existing }: { submit: FlashSaleSubmit; existing?: FlashSaleCampaignDetailDto }) => {
      let campaignId = existing?.id;
      if (!existing) {
        campaignId = (await createAdminFlashSale(toCreateFlashSalePayload(submit.campaign))).id;
      } else if (submit.campaignChanged) {
        await updateAdminFlashSale(existing.id, toUpdateFlashSalePayload(submit.campaign, existing.version));
      }
      const id = campaignId as string;

      const failed: string[] = [];
      for (const item of submit.items) {
        try {
          await upsertAdminFlashSaleItem(id, toUpsertFlashSaleItemPayload(item));
        } catch (error) {
          failed.push(`${item.sku} (${getApiErrorMessage(error)})`);
        }
      }
      return { id, mode: existing ? ('update' as const) : ('create' as const), saved: submit.items.length - failed.length, failed };
    },
    onSuccess: async ({ id, mode, saved, failed }) => {
      // CACHE: chi tiết và danh sách (số suất, khung giờ) đều đổi.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetAdminFlashSaleQueryKey(id) }),
        queryClient.invalidateQueries({ queryKey: getListAdminFlashSalesQueryKey() }),
      ]);
      // Đóng cả khi có suất lỗi: chiến dịch đã đổi version, mở lại để sửa trên dữ liệu mới nhất.
      onSaved(id, mode);
      if (failed.length > 0) {
        void message.warning(`Đã lưu chiến dịch và ${saved} suất. Chưa lưu được: ${failed.join('; ')}`, 8);
        return;
      }
      void message.success(
        mode === 'create'
          ? saved > 0 ? `Đã tạo chiến dịch nháp kèm ${saved} suất bán` : 'Đã tạo chiến dịch ở trạng thái nháp'
          : `Đã lưu chiến dịch${saved > 0 ? ` và ${saved} suất bán` : ''}`,
      );
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });
}
