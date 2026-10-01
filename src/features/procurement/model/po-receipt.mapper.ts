import type { GoodsReceiptItemInputDto, PurchaseOrderDetailDto } from '@/generated/api/procurement/procurement.schemas';

/** Snapshot số còn nhận để khởi tạo phiếu; API kiểm tra lại dưới lock khi post. */
export function toRemainingPoReceiptItems(purchaseOrder: PurchaseOrderDetailDto): GoodsReceiptItemInputDto[] {
  return purchaseOrder.items.filter((item) => item.remainingQty > 0).map((item) => ({
    purchaseOrderItemId: item.id,
    productVariantId: item.productVariantId,
    quantity: item.remainingQty,
  }));
}
