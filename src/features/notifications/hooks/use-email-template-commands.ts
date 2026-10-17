import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import {
  getListAdminEmailTemplatesQueryKey,
  useSendAdminEmailTemplateTest,
  useUpdateAdminEmailTemplate,
} from '@/generated/api/notifications/notifications';
import type { EmailTemplateDto } from '@/generated/api/notifications/notifications.schemas';
import { getListAdminSystemParametersQueryKey } from '@/generated/api/system/system';
import { getApiErrorMessage, getApiErrorPayload } from '@/lib/api/error';

/**
 * Lưu / khôi phục mặc định / gửi thử một mẫu. Không retry (ghi và gửi email đều không idempotent).
 */
export function useEmailTemplateCommands({ onSaved }: { onSaved: (saved: EmailTemplateDto) => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const save = useUpdateAdminEmailTemplate({
    mutation: {
      retry: false,
      onSuccess: async (saved) => {
        // CACHE: mẫu lưu ở bảng tham số — làm mới cả danh sách mẫu lẫn danh sách tham số hệ thống.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListAdminEmailTemplatesQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListAdminSystemParametersQueryKey() }),
        ]);
        void message.success(saved.isCustomized ? 'Đã lưu mẫu email.' : 'Đã khôi phục nội dung mặc định.');
        onSaved(saved);
      },
      onError: (error) => {
        // CONCURRENCY: 409 = version lệch (người khác vừa sửa). Tải lại danh sách: drawer giữ nội dung đang
        // soạn nhưng lấy version mới, nên bấm Lưu lần nữa là CHỦ ĐỘNG ghi đè sau khi đã được báo.
        if (getApiErrorPayload(error)?.statusCode === 409) {
          void queryClient.invalidateQueries({ queryKey: getListAdminEmailTemplatesQueryKey() });
          void message.error('Mẫu vừa được người khác cập nhật. Đã tải lại; bấm Lưu lần nữa để ghi đè bằng nội dung của bạn.');
          return;
        }
        void message.error(getApiErrorMessage(error, 'Không lưu được mẫu email.'));
      },
    },
  });

  const sendTest = useSendAdminEmailTemplateTest({
    mutation: {
      retry: false,
      onSuccess: (result) => void message.success(`Đã gửi email thử tới ${result.recipientMasked}.`),
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không gửi được email thử.')),
    },
  });

  return { save, sendTest };
}
