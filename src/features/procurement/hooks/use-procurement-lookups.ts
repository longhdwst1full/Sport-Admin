import { useState } from 'react';
import { useDebounce } from 'use-debounce';
import { useSearchActiveAdminProductVariants } from '@/generated/api/catalog/catalog';
import { useSearchActiveAdminWarehouses } from '@/generated/api/organization/organization';
import { useListSuppliers, useListPurchaseOrders, useListGoodsReceipts } from '@/generated/api/procurement/procurement';
import { GoodsReceiptStatus, PurchaseOrderStatus, SupplierStatus } from '@/generated/api/procurement/procurement.schemas';

export function useProcurementLookups(receiptFilter?: { supplierId?: string; warehouseId?: string }) {
  const [variantSearch, setVariantSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [purchaseOrderSearch, setPurchaseOrderSearch] = useState('');
  const [receiptSearch, setReceiptSearch] = useState('');
  const [debouncedVariantSearch] = useDebounce(variantSearch.trim(), 300);
  const [debouncedSupplierSearch] = useDebounce(supplierSearch.trim(), 300);
  const [debouncedWarehouseSearch] = useDebounce(warehouseSearch.trim(), 300);
  const [debouncedPurchaseOrderSearch] = useDebounce(purchaseOrderSearch.trim(), 300);
  const [debouncedReceiptSearch] = useDebounce(receiptSearch.trim(), 300);
  const suppliers = useListSuppliers({ page: 1, limit: 50, status: SupplierStatus.ACTIVE, search: debouncedSupplierSearch || undefined });
  const warehouses = useSearchActiveAdminWarehouses({ page: 1, limit: 50, search: debouncedWarehouseSearch || undefined });
  const variants = useSearchActiveAdminProductVariants({
    page: 1,
    limit: 50,
    search: debouncedVariantSearch || undefined,
  });
  const purchaseOrders = useListPurchaseOrders({
    page: 1,
    limit: 50,
    status: PurchaseOrderStatus.APPROVED,
    search: debouncedPurchaseOrderSearch || undefined,
  });
  const partialPurchaseOrders = useListPurchaseOrders({
    page: 1,
    limit: 50,
    status: PurchaseOrderStatus.PARTIALLY_RECEIVED,
    search: debouncedPurchaseOrderSearch || undefined,
  });
  const receipts = useListGoodsReceipts({
    page: 1, limit: 100, status: GoodsReceiptStatus.POSTED,
    supplierId: receiptFilter?.supplierId, warehouseId: receiptFilter?.warehouseId,
    search: debouncedReceiptSearch || undefined,
  });

  return {
    setVariantSearch,
    setSupplierSearch,
    setWarehouseSearch,
    setPurchaseOrderSearch,
    setReceiptSearch,
    supplierOptions: (suppliers.data?.items ?? []).map((item) => ({
      value: item.id,
      label: `${item.code} · ${item.name}`,
    })),
    warehouseOptions: (warehouses.data?.items ?? []).map((item) => ({ value: item.id, label: item.label })),
    variantOptions: (variants.data?.items ?? []).map((item) => ({ value: item.id, label: `${item.code} · ${item.label}` })),
    purchaseOrderOptions: [
      ...(purchaseOrders.data?.items ?? []),
      ...(partialPurchaseOrders.data?.items ?? []),
    ].map((item) => ({ value: item.id, label: `${item.poNo} · ${item.supplier.name} · ${item.warehouse.name}` })),
    receiptOptions: (receipts.data?.items ?? []).map((item) => ({
      value: item.id,
      label: `${item.receiptNo} · ${item.supplier.name} · ${item.warehouse.name}`,
    })),
    loading: suppliers.isLoading || warehouses.isLoading || variants.isLoading,
  };
}
