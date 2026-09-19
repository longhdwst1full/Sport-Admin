import { App } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import {
  deleteAdminProduct,
  getListAdminProductsQueryKey,
  updateAdminProduct,
} from '@/generated/api/catalog/catalog';
import { getApiErrorMessage } from '@/lib/api/error';
import type { ProductListRow } from '../model/product-list.mapper';

/** Gói action của list để page không biết chi tiết payload, confirm hay cache invalidation. */
export function useProductListActions() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const canManage = useCan('catalog.product.manage');
  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });

  const visibilityMutation = useMutation({
    mutationFn: ({ row, next }: { row: ProductListRow; next: boolean }) =>
      updateAdminProduct(row.id, { expectedVersion: row.version, isPublished: next }),
    onSuccess: async (_result, { next }) => {
      // CACHE: thay đổi visibility ảnh hưởng mọi trang/filter của danh sách product.
      await invalidateList();
      void message.success(next ? 'Đã hiện sản phẩm trên website' : 'Đã ẩn sản phẩm khỏi website');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

  const archiveMutation = useMutation({
    mutationFn: (row: ProductListRow) =>
      deleteAdminProduct(row.id, { expectedVersion: row.version }),
    onSuccess: async () => {
      await invalidateList();
      void message.success('Đã chuyển sản phẩm sang lưu trữ');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

  const confirmArchive = (row: ProductListRow) => {
    modal.confirm({
      title: `Xoá sản phẩm ${row.name}?`,
      content: (
        <div className="space-y-2 text-sm text-slate-500">
          <p>Sản phẩm chuyển sang trạng thái <strong>Lưu trữ</strong> và biến mất khỏi trang bán.</p>
          <p>Không xoá hẳn khỏi database vì đơn hàng cũ vẫn tham chiếu sản phẩm này.</p>
        </div>
      ),
      okText: 'Xoá',
      okButtonProps: { danger: true },
      cancelText: 'Huỷ',
      onOk: () => archiveMutation.mutateAsync(row),
    });
  };

  return {
    canManage,
    confirmArchive,
    archiveBusyId: archiveMutation.isPending ? archiveMutation.variables?.id : undefined,
    toggleVisibility: (row: ProductListRow, next: boolean) =>
      visibilityMutation.mutate({ row, next }),
    visibilityBusyId: visibilityMutation.isPending
      ? visibilityMutation.variables?.row.id
      : undefined,
  };
}
