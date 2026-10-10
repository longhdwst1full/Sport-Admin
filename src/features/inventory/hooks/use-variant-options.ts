import { useMemo } from 'react';
import { useSearchActiveAdminProductVariants } from '@/generated/api/catalog/catalog';
import { useSearchState } from '@/shared/hooks/use-search-state';

const VARIANT_LOOKUP_LIMIT = 50;

/**
 * Options chọn SKU đang bán (value = mã SKU) cho các form phiếu kho; tìm phía server qua `onSearch`
 * gắn vào `Select` có `filterOption={false}`. `enabled` để drawer đóng không gọi lookup.
 */
export function useVariantOptions({ enabled = true }: { enabled?: boolean } = {}) {
  const search = useSearchState();
  const query = useSearchActiveAdminProductVariants(
    { search: search.debounced, page: 1, limit: VARIANT_LOOKUP_LIMIT },
    { query: { enabled } },
  );
  const items = query.data?.items;
  const options = useMemo(
    () => (items ?? []).map((item) => ({ value: item.code, label: `${item.code} — ${item.label}` })),
    [items],
  );
  return { options, onSearch: search.setValue, query };
}
