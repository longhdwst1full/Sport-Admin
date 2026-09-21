import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  getSearchActiveAdminBrandsQueryKey,
  getSearchActiveAdminCategoriesQueryKey,
  searchActiveAdminBrands,
  searchActiveAdminCategories,
} from '@/generated/api/catalog/catalog';
import { CACHE_POLICY } from '@/app/config/query-cache-policy';

/** Cùng tham số mà form dùng cho lần mở đầu tiên; khác tham số là khác cache. */
const FIRST_PAGE = { page: 1, limit: 20 } as const;

/**
 * Nạp trước danh mục và thương hiệu cho form tạo sản phẩm.
 *
 * Database ở khác châu lục nên mỗi lượt gọi tốn gần nửa giây. Nếu đợi tới lúc người dùng bấm "Thêm
 * sản phẩm" mới gọi thì nửa giây đó rơi đúng vào lúc họ đang nhìn form trống. Gọi sớm hơn — khi họ
 * rê chuột lên nút, hoặc khi danh sách sản phẩm đã tải xong — thì mở form là có sẵn dữ liệu.
 *
 * Dùng `prefetchQuery` nên lần gọi này ghi thẳng vào cache mà form sẽ đọc; không phải một lượt gọi
 * thừa nằm ngoài cache.
 */
export function useProductFormPrefetch(): () => void {
  const queryClient = useQueryClient();

  return useCallback(() => {
    void queryClient.prefetchQuery({
      queryKey: getSearchActiveAdminBrandsQueryKey(FIRST_PAGE),
      queryFn: ({ signal }) => searchActiveAdminBrands(FIRST_PAGE, signal),
      staleTime: CACHE_POLICY.LOOKUP.staleTime,
    });
    void queryClient.prefetchQuery({
      queryKey: getSearchActiveAdminCategoriesQueryKey(FIRST_PAGE),
      queryFn: ({ signal }) => searchActiveAdminCategories(FIRST_PAGE, signal),
      staleTime: CACHE_POLICY.LOOKUP.staleTime,
    });
  }, [queryClient]);
}
