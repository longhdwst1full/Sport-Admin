import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import {
  useArchiveAdminProduct,
  usePublishAdminProduct,
  useReactivateAdminProduct,
} from '@/generated/api/catalog/catalog';
import { ProductType, type ProductDetailDto, type ProductStatus } from '@/generated/api/catalog/catalog.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { invalidateProductQueries } from './product-query-cache';

/** Đủ thông tin để xác nhận và gửi lệnh vòng đời; dòng danh sách lẫn detail đều thoả. */
export interface ProductLifecycleTarget {
  id: string;
  name: string;
  version: number;
  status: ProductStatus;
  productType: string;
}

/**
 * Lệnh vòng đời sản phẩm (Xuất bản · Lưu trữ · Đưa về bản nháp), dùng chung cho menu danh sách và header
 * workspace để hai nơi cùng nội dung xác nhận, cùng endpoint và cùng cache invalidation.
 *
 * PERMISSION: API yêu cầu `catalog.product.publish` cho cả ba lệnh; nơi dùng tự ẩn nút theo quyền đó.
 * CONCURRENCY: gửi `expectedVersion` đã nạp để API trả 409 thay vì đè thay đổi của người khác.
 */
export function useProductLifecycle() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const lifecycleMutation = (success: string, failure: string) => ({
    mutation: {
      onSuccess: async (updated: ProductDetailDto) => {
        await invalidateProductQueries(queryClient, updated);
        void message.success(success);
      },
      onError: (error: unknown) => void message.error(getApiErrorMessage(error, failure)),
    },
  });
  const publish = usePublishAdminProduct(
    lifecycleMutation('Đã xuất bản sản phẩm lên website.', 'Không xuất bản được sản phẩm.'),
  );
  const archive = useArchiveAdminProduct(
    lifecycleMutation('Đã lưu trữ; sản phẩm không còn hiển thị trên website.', 'Không lưu trữ được sản phẩm.'),
  );
  const reactivate = useReactivateAdminProduct(
    lifecycleMutation('Đã đưa sản phẩm về bản nháp để kiểm tra trước khi xuất bản lại.', 'Không thể khôi phục sản phẩm.'),
  );

  const confirmPublish = (product: ProductLifecycleTarget) => {
    modal.confirm({
      title: `Xuất bản “${product.name}”?`,
      content: 'Sản phẩm sẽ hiển thị công khai với giá đã bao gồm VAT. Version hiện tại được kiểm tra để không ghi đè thay đổi của người khác.',
      okText: 'Xuất bản',
      cancelText: 'Huỷ',
      onOk: () => publish.mutateAsync({ id: product.id, data: { expectedVersion: product.version } }),
    });
  };

  /** Sản phẩm đã lưu trữ thì đưa về bản nháp; còn lại (nháp/đang bán) thì lưu trữ. */
  const confirmLifecycle = (product: ProductLifecycleTarget) => {
    const archived = product.status === 'ARCHIVED';
    const data = { expectedVersion: product.version };
    modal.confirm({
      title: archived
        ? `Đưa “${product.name}” về bản nháp?`
        : `Lưu trữ ${product.productType === ProductType.BUNDLE ? 'combo' : 'sản phẩm'} “${product.name}”?`,
      content: archived
        ? 'Sản phẩm chưa hiển thị lại ngay. Cần kiểm tra SKU, giá rồi xuất bản lại.'
        : 'Sản phẩm sẽ ẩn ngay khỏi website và chặn giao dịch mới. Đơn hàng lịch sử không bị thay đổi.',
      okText: archived ? 'Đưa về bản nháp' : 'Lưu trữ',
      okButtonProps: { danger: !archived },
      cancelText: 'Huỷ',
      onOk: () => (archived ? reactivate : archive).mutateAsync({ id: product.id, data }),
    });
  };

  const pendingId = (mutation: { isPending: boolean; variables?: { id: string } }) =>
    mutation.isPending ? mutation.variables?.id : undefined;

  return {
    confirmPublish,
    confirmLifecycle,
    /** Id sản phẩm đang chạy lệnh xuất bản / lưu trữ-khôi phục, để chỉ nút của nó hiện loading. */
    publishBusyId: pendingId(publish),
    lifecycleBusyId: pendingId(archive) ?? pendingId(reactivate),
  };
}
