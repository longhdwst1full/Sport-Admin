import { useMemo } from 'react';
import { useListAdminCategories } from '@/generated/api/catalog/catalog';
import { CatalogMasterStatus } from '@/generated/api/catalog/catalog.schemas';
import { useCan } from '@/core/auth/permissions';

/**
 * Danh mục cho banner CATEGORY_TOP. Chỉ tải khi form cần (vị trí CATEGORY_TOP) và người dùng có
 * `catalog.category.view` — thiếu quyền thì ô chọn trống và banner áp cho mọi danh mục.
 */
export function useBannerCategoryOptions(enabled: boolean) {
  const canView = useCan('catalog.category.view');
  const categories = useListAdminCategories({
    // staleTime theo chính sách chung của danh mục (`REFERENCE_DATA.categories`).
    query: { enabled: enabled && canView, retry: false },
  });
  const options = useMemo(
    () =>
      (categories.data?.items ?? [])
        .filter((item) => item.status === CatalogMasterStatus.ACTIVE)
        .map((item) => ({
          value: item.id,
          label: `${'\u00A0\u00A0'.repeat(item.depth)}${item.name}`,
          searchLabel: item.name,
        })),
    [categories.data?.items],
  );
  return { options, loading: categories.isLoading && enabled && canView, canView };
}
