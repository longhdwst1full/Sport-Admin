import {
  useListAdminAttributes,
  useSearchActiveAdminBrands,
  useSearchActiveAdminCategories,
} from '@/generated/api/catalog/catalog';
import {
  useSearchActiveAdminBranches,
  useSearchActiveAdminWarehouses,
} from '@/generated/api/organization/organization';
import { CACHE_POLICY } from '@/shared/constants/query-cache-policy';
import { useSearchState } from '@/shared/hooks/use-search-state';

const LOOKUP_SEARCH_DEBOUNCE_MS = 300;

/**
 * Dữ liệu tra cứu của workspace sản phẩm: thương hiệu, danh mục, thuộc tính và (chỉ khi Tạo có quyền
 * nhập tồn) chi nhánh/kho cho tồn đầu. Mỗi ô chọn có ô tìm debounce riêng.
 */
export function useProductFormLookups({
  open,
  isEdit,
  canAdjustStock,
  initialBranchId,
}: {
  open: boolean;
  isEdit: boolean;
  canAdjustStock: boolean;
  initialBranchId?: string;
}) {
  const brandSearch = useSearchState('', LOOKUP_SEARCH_DEBOUNCE_MS);
  const categorySearch = useSearchState('', LOOKUP_SEARCH_DEBOUNCE_MS);
  const branchSearch = useSearchState('', LOOKUP_SEARCH_DEBOUNCE_MS);
  const warehouseSearch = useSearchState('', LOOKUP_SEARCH_DEBOUNCE_MS);
  const openingStockEnabled = open && !isEdit && canAdjustStock;

  const brands = useSearchActiveAdminBrands(
    { search: brandSearch.debounced, page: 1, limit: 20 },
    { query: { ...CACHE_POLICY.LOOKUP, enabled: open } },
  );
  const categories = useSearchActiveAdminCategories(
    { search: categorySearch.debounced, page: 1, limit: 20 },
    { query: { ...CACHE_POLICY.LOOKUP, enabled: open } },
  );
  const attributesQuery = useListAdminAttributes({ query: { ...CACHE_POLICY.LOOKUP, enabled: open } });
  const branches = useSearchActiveAdminBranches(
    { search: branchSearch.debounced, page: 1, limit: 50 },
    { query: { ...CACHE_POLICY.REFERENCE, enabled: openingStockEnabled } },
  );
  const warehouses = useSearchActiveAdminWarehouses(
    { branchId: initialBranchId, search: warehouseSearch.debounced, page: 1, limit: 50 },
    { query: { ...CACHE_POLICY.REFERENCE, enabled: openingStockEnabled && Boolean(initialBranchId) } },
  );

  return {
    brands,
    categories,
    branches,
    warehouses,
    attributesQuery,
    attributes: attributesQuery.data?.items ?? [],
    onBrandSearch: brandSearch.setValue,
    onCategorySearch: categorySearch.setValue,
    onBranchSearch: branchSearch.setValue,
    onWarehouseSearch: warehouseSearch.setValue,
  };
}
