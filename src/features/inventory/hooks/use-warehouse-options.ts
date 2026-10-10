import { useMemo } from 'react';
import { useSearchActiveAdminWarehouses } from '@/generated/api/organization/organization';
import type { ActiveLookupOptionDto } from '@/generated/api/organization/organization.schemas';
import { useSearchState } from '@/shared/hooks/use-search-state';

const WAREHOUSE_LOOKUP_LIMIT = 50;

const codeFirstLabel = (item: ActiveLookupOptionDto) => `${item.code} — ${item.label}`;

/**
 * Options chọn kho đang hoạt động (value = mã kho) cho bộ lọc và form tồn kho. `onSearch` gắn vào
 * `Select` có `filterOption={false}` để tìm phía server; ô lọc phía client thì bỏ qua `onSearch`.
 */
export function useWarehouseOptions({
  enabled,
  formatLabel = codeFirstLabel,
}: {
  enabled?: boolean;
  formatLabel?: (item: ActiveLookupOptionDto) => string;
} = {}) {
  const search = useSearchState();
  const query = useSearchActiveAdminWarehouses(
    { page: 1, limit: WAREHOUSE_LOOKUP_LIMIT, search: search.debounced },
    enabled === undefined ? undefined : { query: { enabled } },
  );
  const items = query.data?.items;
  const options = useMemo(
    () => (items ?? []).map((item) => ({ value: item.code, label: formatLabel(item) })),
    [items, formatLabel],
  );
  return { options, onSearch: search.setValue, query };
}
