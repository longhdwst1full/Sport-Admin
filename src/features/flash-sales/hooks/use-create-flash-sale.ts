import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import {
  createAdminFlashSale,
  getListAdminFlashSalesQueryKey,
  upsertAdminFlashSaleItem,
} from '@/generated/api/promotions/promotions';
import { getApiErrorMessage } from '@/lib/api/error';
import {
  toCreateFlashSalePayload,
  toUpsertFlashSaleItemPayload,
  type CreateCampaignValues,
  type StagedItem,
} from '../model/flash-sale.mapper';

/**
 * API không có lệnh tạo chiến dịch kèm suất bán trong một giao dịch, nên tạo
 * chiến dịch trước rồi thêm từng suất. Chiến dịch sinh ra ở trạng thái nháp và
 * chưa hiển thị cho khách, nên nếu một suất lỗi thì chỉ cần thêm lại suất đó —
 * không có rủi ro bán sai giá.
 */
export function useCreateFlashSale(onCreated: (id: string) => void) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaign, items }: { campaign: CreateCampaignValues; items: StagedItem[] }) => {
      const created = await createAdminFlashSale(toCreateFlashSalePayload(campaign));

      const failed: string[] = [];
      for (const item of items) {
        try {
          await upsertAdminFlashSaleItem(created.id, toUpsertFlashSaleItemPayload(item));
        } catch {
          failed.push(item.sku);
        }
      }
      return { created, added: items.length - failed.length, failed };
    },
    onSuccess: async ({ created, added, failed }) => {
      // CACHE: chiến dịch mới phải xuất hiện ngay trong danh sách.
      await queryClient.invalidateQueries({ queryKey: getListAdminFlashSalesQueryKey() });
      onCreated(created.id);
      if (failed.length > 0) {
        void message.warning(
          `Đã tạo chiến dịch và thêm ${added} suất. Chưa thêm được: ${failed.join(', ')}.`,
        );
        return;
      }
      void message.success(
        added > 0 ? `Đã tạo chiến dịch nháp kèm ${added} suất bán` : 'Đã tạo chiến dịch ở trạng thái nháp',
      );
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });
}
