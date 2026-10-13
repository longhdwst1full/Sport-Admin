import type { QueryClient } from '@tanstack/react-query';
import {
  getGetAdminProductQueryKey,
  getGetAdminProductSetupStatusQueryKey,
  getListAdminProductsQueryKey,
} from '@/generated/api/catalog/catalog';
import {
  getListInventoryBalancesQueryKey,
  getListInventoryMovementsQueryKey,
  getListStockAdjustmentsQueryKey,
} from '@/generated/api/inventory/inventory';

/**
 * CACHE: mọi lệnh ghi sản phẩm (thông tin, SKU, giá, ảnh, combo, vòng đời) đổi `version` và có thể đổi
 * checklist xuất bản, nên làm mới danh sách (mọi trang/bộ lọc), detail theo slug và setup-status theo id.
 * Không có slug/id (chưa tạo) thì chỉ làm mới danh sách.
 */
export function invalidateProductQueries(queryClient: QueryClient, product?: { id?: string; slug?: string }) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() }),
    ...(product?.slug ? [queryClient.invalidateQueries({ queryKey: getGetAdminProductQueryKey(product.slug) })] : []),
    ...(product?.id
      ? [queryClient.invalidateQueries({ queryKey: getGetAdminProductSetupStatusQueryKey(product.id) })]
      : []),
  ]);
}

/** CACHE: phiếu tồn đầu đổi số dư, sổ kho và danh sách phiếu điều chỉnh của màn Tồn kho. */
export function invalidateStockQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: getListInventoryBalancesQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getListStockAdjustmentsQueryKey() }),
  ]);
}
