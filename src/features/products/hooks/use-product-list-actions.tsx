import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useCan } from '@/core/auth/permissions';
import { useUpdateAdminProduct } from '@/generated/api/catalog/catalog';
import { getApiErrorMessage } from '@/lib/api/error';
import type { ProductListRow } from '../model/product-list.mapper';
import { invalidateProductQueries } from './product-query-cache';
import { useProductLifecycle } from './use-product-lifecycle';

/** Gói action của list để page không biết chi tiết payload, confirm hay cache invalidation. */
export function useProductListActions() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  // PERMISSION: bật/tắt hiển thị đi qua `updateAdminProduct` (catalog.product.manage); xuất bản và lưu trữ
  // là lệnh vòng đời, API đòi `catalog.product.publish`. API vẫn là nơi kiểm cuối.
  const canManage = useCan('catalog.product.manage');
  const canPublish = useCan('catalog.product.publish');
  const lifecycle = useProductLifecycle();

  const visibility = useUpdateAdminProduct({
    mutation: {
      onSuccess: async (updated, { data }) => {
        await invalidateProductQueries(queryClient, updated);
        void message.success(data.isPublished ? 'Đã hiện sản phẩm trên website' : 'Đã ẩn sản phẩm khỏi website');
      },
      onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
    },
  });

  return {
    canManage,
    canPublish,
    /**
     * Xuất bản nằm ở cột thao tác của danh sách, không nằm trong form sửa thông tin.
     * Sửa nội dung và đổi vòng đời là hai việc khác nhau; gộp vào một chỗ khiến người dùng
     * bấm Lưu mà không rõ sản phẩm có lên website hay chưa.
     */
    confirmPublish: lifecycle.confirmPublish,
    publishBusyId: lifecycle.publishBusyId,
    /** Lưu trữ logic (`archiveAdminProduct`): đơn hàng cũ vẫn tham chiếu sản phẩm nên không xoá hẳn. */
    confirmArchive: lifecycle.confirmLifecycle,
    archiveBusyId: lifecycle.lifecycleBusyId,
    toggleVisibility: (row: ProductListRow, next: boolean) =>
      visibility.mutate({ id: row.id, data: { expectedVersion: row.version, isPublished: next } }),
    visibilityBusyId: visibility.isPending ? visibility.variables?.id : undefined,
  };
}
