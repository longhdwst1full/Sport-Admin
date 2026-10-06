import { useMemo } from 'react';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { useSearchActiveAdminProductVariants } from '@/generated/api/catalog/catalog';
import { useSearchActiveAdminWarehouses } from '@/generated/api/organization/organization';
import { useListSuppliers, useListPurchaseOrders, useListGoodsReceipts } from '@/generated/api/procurement/procurement';
import { GoodsReceiptStatus, PurchaseOrderStatus, SupplierStatus } from '@/generated/api/procurement/procurement.schemas';

export function useProcurementLookups(receiptFilter?: { supplierId?: string; warehouseId?: string }) {
  const variantSearch = useSearchState('', 300);
  const supplierSearch = useSearchState('', 300);
  const warehouseSearch = useSearchState('', 300);
  const purchaseOrderSearch = useSearchState('', 300);
  const receiptSearch = useSearchState('', 300);
  const suppliers = useListSuppliers({ page: 1, limit: 50, status: SupplierStatus.ACTIVE, search: supplierSearch.debounced });
  const warehouses = useSearchActiveAdminWarehouses({ page: 1, limit: 50, search: warehouseSearch.debounced });
  const variants = useSearchActiveAdminProductVariants({
    page: 1,
    limit: 50,
    search: variantSearch.debounced,
  });
  const purchaseOrders = useListPurchaseOrders({
    page: 1,
    limit: 50,
    status: PurchaseOrderStatus.APPROVED,
    search: purchaseOrderSearch.debounced,
  });
  const partialPurchaseOrders = useListPurchaseOrders({
    page: 1,
    limit: 50,
    status: PurchaseOrderStatus.PARTIALLY_RECEIVED,
    search: purchaseOrderSearch.debounced,
  });
  const receipts = useListGoodsReceipts({
    page: 1, limit: 100, status: GoodsReceiptStatus.POSTED,
    supplierId: receiptFilter?.supplierId, warehouseId: receiptFilter?.warehouseId,
    search: receiptSearch.debounced,
  });

  const supplierOptions = useMemo(
    () => (suppliers.data?.items ?? []).map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` })),
    [suppliers.data],
  );
  const warehouseOptions = useMemo(
    () => (warehouses.data?.items ?? []).map((item) => ({ value: item.id, label: item.label })),
    [warehouses.data],
  );
  const variantOptions = useMemo(
    () => (variants.data?.items ?? []).map((item) => ({ value: item.id, label: `${item.code} · ${item.label}` })),
    [variants.data],
  );
  const purchaseOrderOptions = useMemo(
    () =>
      [...(purchaseOrders.data?.items ?? []), ...(partialPurchaseOrders.data?.items ?? [])].map((item) => ({
        value: item.id,
        label: `${item.poNo} · ${item.supplier.name} · ${item.warehouse.name}`,
      })),
    [purchaseOrders.data, partialPurchaseOrders.data],
  );
  const receiptOptions = useMemo(
    () =>
      (receipts.data?.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.receiptNo} · ${item.supplier.name} · ${item.warehouse.name}`,
      })),
    [receipts.data],
  );

  return {
    setVariantSearch: variantSearch.setValue,
    setSupplierSearch: supplierSearch.setValue,
    setWarehouseSearch: warehouseSearch.setValue,
    setPurchaseOrderSearch: purchaseOrderSearch.setValue,
    setReceiptSearch: receiptSearch.setValue,
    supplierOptions,
    warehouseOptions,
    variantOptions,
    purchaseOrderOptions,
    receiptOptions,
    loading: suppliers.isLoading || warehouses.isLoading || variants.isLoading,
  };
}
