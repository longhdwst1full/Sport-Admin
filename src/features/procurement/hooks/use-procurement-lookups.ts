import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { useSearchActiveAdminProductVariants } from '@/generated/api/catalog/catalog';
import { useSearchActiveAdminWarehouses } from '@/generated/api/organization/organization';
import {
  getListSupplierReturnsQueryKey,
  getSupplierReturn,
  listSupplierReturns,
  useGetGoodsReceipt,
  useListGoodsReceipts,
  useListPurchaseOrders,
  useListSuppliers,
} from '@/generated/api/procurement/procurement';
import type { SupplierReturnSummaryDto } from '@/generated/api/procurement/procurement.schemas';
import { GoodsReceiptStatus, PurchaseOrderStatus, SupplierReturnStatus, SupplierStatus } from '@/generated/api/procurement/procurement.schemas';

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

export interface ReturnableLine {
  productVariantId: string;
  sku: string;
  variantName: string;
  received: number;
  returned: number;
  remaining: number;
}

/**
 * Số còn trả theo SKU của một phiếu nhập: số nhập − tổng số trên các phiếu trả chưa huỷ gắn cùng phiếu nhập
 * (kể cả nháp), trừ phiếu đang sửa — cùng công thức Backend kiểm lúc lưu (409 PROCUREMENT_RETURN_EXCEEDS_RECEIPT).
 * CONTRACT: API chưa có số "đã trả" theo dòng nhập, nên FE lọc list phiếu trả theo NCC/kho rồi tải chi tiết
 * từng phiếu trùng phiếu nhập. Chỉ là snapshot tham chiếu; Backend vẫn khoá phiếu nhập và kiểm lại.
 * CACHE: key nằm dưới key list phiếu trả nên lưu/chuyển trạng thái phiếu trả sẽ invalidate luôn.
 */
export function useReceiptReturnable(
  filter: { goodsReceiptId?: string; supplierId?: string; warehouseId?: string; excludeReturnId?: string },
  enabled: boolean,
) {
  const { goodsReceiptId, supplierId, warehouseId, excludeReturnId } = filter;
  const active = enabled && Boolean(goodsReceiptId && supplierId && warehouseId);
  const receipt = useGetGoodsReceipt(goodsReceiptId ?? '', { query: { enabled: active } });
  const returned = useQuery({
    queryKey: [...getListSupplierReturnsQueryKey(), 'returnable', goodsReceiptId, excludeReturnId],
    enabled: active,
    queryFn: async ({ signal }) => {
      const linked: SupplierReturnSummaryDto[] = [];
      for (let page = 1; ; page += 1) {
        const list = await listSupplierReturns({ page, limit: 100, supplierId, warehouseId }, signal);
        linked.push(...list.items.filter((item) => item.goodsReceipt?.id === goodsReceiptId
          && item.status !== SupplierReturnStatus.CANCELLED && item.id !== excludeReturnId));
        if (page * list.limit >= list.total || list.items.length === 0) break;
      }
      const details = await Promise.all(linked.map((item) => getSupplierReturn(item.id, signal)));
      const byVariant = new Map<string, number>();
      for (const line of details.flatMap((detail) => detail.items)) {
        byVariant.set(line.productVariantId, (byVariant.get(line.productVariantId) ?? 0) + line.quantity);
      }
      return byVariant;
    },
  });
  const lines = useMemo<ReturnableLine[]>(() => {
    if (!receipt.data || !returned.data) return [];
    const byVariant = new Map<string, ReturnableLine>();
    for (const item of receipt.data.items) {
      const current = byVariant.get(item.productVariantId);
      if (current) current.received += item.quantity;
      else byVariant.set(item.productVariantId, { productVariantId: item.productVariantId, sku: item.sku, variantName: item.variantName, received: item.quantity, returned: 0, remaining: 0 });
    }
    for (const line of byVariant.values()) {
      line.returned = returned.data.get(line.productVariantId) ?? 0;
      line.remaining = Math.max(line.received - line.returned, 0);
    }
    return [...byVariant.values()];
  }, [receipt.data, returned.data]);
  return {
    active,
    lines,
    isPending: active && (receipt.isPending || returned.isPending),
    error: receipt.error ?? returned.error,
    refetch: () => { void receipt.refetch(); void returned.refetch(); },
  };
}
