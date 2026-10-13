import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useRef, useState } from 'react';
import { useCreateAdminProduct } from '@/generated/api/catalog/catalog';
import type { CreateProductDto, ProductDetailDto } from '@/generated/api/catalog/catalog.schemas';
import { useCreateStockAdjustment } from '@/generated/api/inventory/inventory';
import {
  StockAdjustmentReason,
  StockAdjustmentType,
  type CreateStockAdjustmentDto,
} from '@/generated/api/inventory/inventory.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import type { PendingOpeningStock } from '../components/product-form/product-stock-panel';
import type { ProductFormValues } from '../model/product-form.mapper';
import { PRODUCT_TAB_LABELS } from '../model/product-form-tabs';
import { toOpeningStockItems } from '../model/product-opening-stock.mapper';
import { invalidateProductQueries, invalidateStockQueries } from './product-query-cache';

/**
 * Lệnh Tạo sản phẩm của workspace: `createAdminProduct` (sản phẩm, SKU, giá, ảnh, thông số trong một
 * transaction) rồi phiếu tồn đầu `OPENING_BALANCE` của Inventory.
 *
 * Hook sống theo phiên workspace (nơi dùng remount qua `key`), nên hai khoá idempotency khởi tạo một lần.
 */
export function useProductCreate({
  onCreated,
  onError,
}: {
  /** `pendingOpeningStock` có khi sản phẩm đã tạo nhưng phiếu tồn đầu lỗi (giữ payload + khoá để ghi lại). */
  onCreated: (created: ProductDetailDto, pendingOpeningStock?: PendingOpeningStock) => void;
  onError: (error: unknown) => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  /** IDEMPOTENCY: một khoá cho phiếu tồn đầu của phiên này; thử ghi lại dùng cùng khoá. */
  const [openingStockIdempotencyKey] = useState(() => crypto.randomUUID());
  /**
   * IDEMPOTENCY: một id cho một lần mở form tạo. Bấm lại sau khi mất response (timeout, rớt mạng)
   * gửi cùng id nên API trả lại sản phẩm đã tạo thay vì tạo bản thứ hai; sửa dữ liệu rồi gửi lại
   * sau khi sản phẩm đã tạo thì API trả 409 để người dùng tải lại thay vì nhân đôi.
   */
  const [createProductRequestId] = useState(() => crypto.randomUUID());
  const submittedValues = useRef<ProductFormValues | undefined>(undefined);

  const openingStock = useCreateStockAdjustment({
    request: { headers: { 'Idempotency-Key': openingStockIdempotencyKey } },
  });

  /** Ghi tồn đầu cho SKU vừa tạo; lỗi thì trả payload + khoá để workspace cho "Thử ghi lại". */
  async function recordOpeningStock(values: ProductFormValues, createdProduct: ProductDetailDto) {
    let stockData: CreateStockAdjustmentDto | undefined;
    try {
      const items = toOpeningStockItems(values.variants, createdProduct);
      if (items.length === 0 || !values.initialWarehouseCode) return { recorded: false };
      stockData = {
        warehouseCode: values.initialWarehouseCode,
        adjustmentType: StockAdjustmentType.OPENING_BALANCE,
        reasonCode: StockAdjustmentReason.INITIAL_STOCK,
        reason: `Khởi tạo tồn đầu khi tạo sản phẩm ${createdProduct.productNo}`,
        items,
      };
      await openingStock.mutateAsync({ data: stockData });
      return { recorded: true };
    } catch (error) {
      // Giá, ảnh và thông số đã nằm trong transaction tạo sản phẩm; chỉ tồn đầu (nghiệp vụ kho của
      // chi nhánh) là bước riêng có thể lỗi sau khi sản phẩm đã tạo. Giữ payload + khoá để ghi lại.
      if (!stockData) {
        void message.error(getApiErrorMessage(error));
        return { recorded: false };
      }
      const pending: PendingOpeningStock = {
        idempotencyKey: openingStockIdempotencyKey,
        data: stockData,
        error: getApiErrorMessage(error),
      };
      return { recorded: false, pending };
    }
  }

  const createProduct = useCreateAdminProduct({
    request: { headers: { 'x-request-id': createProductRequestId } },
    mutation: {
      onSuccess: async (createdProduct) => {
        // CONTRACT: dùng snapshot lúc submit để SKU/tồn đầu không lệch nếu response về chậm.
        const values = submittedValues.current;
        submittedValues.current = undefined;
        const stock = values ? await recordOpeningStock(values, createdProduct) : { recorded: false };
        await Promise.all([invalidateProductQueries(queryClient), invalidateStockQueries(queryClient)]);
        if (stock.pending) {
          void message.warning(`Đã tạo sản phẩm nhưng chưa ghi được tồn đầu. Bấm “Thử ghi tồn đầu lại” ở mục Tồn kho, tab "${PRODUCT_TAB_LABELS.variants}".`, 8);
        } else {
          const stockMessage = stock.recorded ? ' và đã ghi tồn đầu' : '';
          void message.success(`Đã tạo sản phẩm cùng ${createdProduct.variants.length} biến thể${stockMessage}.`);
        }
        onCreated(createdProduct, stock.pending);
      },
      onError: (error) => {
        submittedValues.current = undefined;
        onError(error);
      },
    },
  });

  return {
    create: (values: ProductFormValues, data: CreateProductDto) => {
      submittedValues.current = {
        ...values,
        categoryIds: [...values.categoryIds],
        variants: values.variants.map((variant) => ({ ...variant })),
      };
      createProduct.mutate({ data });
    },
    isPending: createProduct.isPending || openingStock.isPending,
  };
}
