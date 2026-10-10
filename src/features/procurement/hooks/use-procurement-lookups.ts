import { useMemo } from 'react';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { useSearchActiveAdminProductVariants } from '@/generated/api/catalog/catalog';
import { useSearchActiveAdminWarehouses } from '@/generated/api/organization/organization';
import { useListGoodsReceipts, useListPurchaseOrders, useListSuppliers } from '@/generated/api/procurement/procurement';
import { GoodsReceiptStatus, PurchaseOrderStatus, SupplierStatus } from '@/generated/api/procurement/procurement.schemas';

/**
 * Lookup cho Select tìm server-side trong các form chứng từ. Mỗi hook chỉ chạy khi `enabled` (drawer
 * đang mở và trường đang hiển thị), để drawer đóng không bắn query nền và mỗi form chỉ tải đúng thứ
 * nó dùng. Dropdown chỉ có trang đầu theo từ khoá (xem README).
 */
const LOOKUP_LIMIT = 50;

export function useSupplierLookup(enabled: boolean) {
  const search = useSearchState();
  const query = useListSuppliers(
    { page: 1, limit: LOOKUP_LIMIT, status: SupplierStatus.ACTIVE, search: search.debounced },
    { query: { enabled } },
  );
  const options = useMemo(
    () => (query.data?.items ?? []).map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` })),
    [query.data],
  );
  return { options, onSearch: search.setValue };
}

export function useWarehouseLookup(enabled: boolean) {
  const search = useSearchState();
  const query = useSearchActiveAdminWarehouses(
    { page: 1, limit: LOOKUP_LIMIT, search: search.debounced },
    { query: { enabled } },
  );
  const options = useMemo(
    () => (query.data?.items ?? []).map((item) => ({ value: item.id, label: item.label })),
    [query.data],
  );
  return { options, onSearch: search.setValue };
}

export function useVariantLookup(enabled: boolean) {
  const search = useSearchState();
  const query = useSearchActiveAdminProductVariants(
    { page: 1, limit: LOOKUP_LIMIT, search: search.debounced },
    { query: { enabled } },
  );
  const options = useMemo(
    () => (query.data?.items ?? []).map((item) => ({ value: item.id, label: `${item.code} · ${item.label}` })),
    [query.data],
  );
  return { options, onSearch: search.setValue };
}

/** PO còn nhận được hàng: APPROVED và PARTIALLY_RECEIVED (API lọc một trạng thái mỗi lần). */
export function useReceivablePurchaseOrderLookup(enabled: boolean) {
  const search = useSearchState();
  const params = { page: 1, limit: LOOKUP_LIMIT, search: search.debounced };
  const approved = useListPurchaseOrders({ ...params, status: PurchaseOrderStatus.APPROVED }, { query: { enabled } });
  const partial = useListPurchaseOrders(
    { ...params, status: PurchaseOrderStatus.PARTIALLY_RECEIVED },
    { query: { enabled } },
  );
  const options = useMemo(
    () =>
      [...(approved.data?.items ?? []), ...(partial.data?.items ?? [])].map((item) => ({
        value: item.id,
        label: `${item.poNo} · ${item.supplier.name} · ${item.warehouse.name}`,
      })),
    [approved.data, partial.data],
  );
  return { options, onSearch: search.setValue };
}

/** Phiếu nhập đã ghi sổ của đúng NCC/kho đang chọn, làm chứng từ gốc cho phiếu trả. */
export function usePostedReceiptLookup(filter: { supplierId?: string; warehouseId?: string }, enabled: boolean) {
  const search = useSearchState();
  const query = useListGoodsReceipts(
    {
      page: 1,
      limit: 100,
      status: GoodsReceiptStatus.POSTED,
      supplierId: filter.supplierId,
      warehouseId: filter.warehouseId,
      search: search.debounced,
    },
    { query: { enabled } },
  );
  const options = useMemo(
    () =>
      (query.data?.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.receiptNo} · ${item.supplier.name} · ${item.warehouse.name}`,
      })),
    [query.data],
  );
  return { options, onSearch: search.setValue };
}
