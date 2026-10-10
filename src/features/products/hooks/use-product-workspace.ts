import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useCan } from '@/core/auth/permissions';
import {
  getGetAdminProductQueryKey,
  getGetAdminProductSetupStatusQueryKey,
  getListAdminProductsQueryKey,
  useArchiveAdminProduct,
  useCreateAdminProduct,
  useGetAdminProduct,
  useGetAdminProductSetupStatus,
  usePublishAdminProduct,
  useReactivateAdminProduct,
  useUpdateAdminProduct,
} from '@/generated/api/catalog/catalog';
import { ProductType } from '@/generated/api/catalog/catalog.schemas';
import {
  getListInventoryBalancesQueryKey,
  getListInventoryMovementsQueryKey,
  getListStockAdjustmentsQueryKey,
  useCreateStockAdjustment,
} from '@/generated/api/inventory/inventory';
import {
  StockAdjustmentReason,
  StockAdjustmentType,
  type CreateStockAdjustmentDto,
} from '@/generated/api/inventory/inventory.schemas';
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api/error';
import type { PendingOpeningStock } from '../components/product-form/product-stock-panel';
import { PRODUCT_FORM_DEFAULTS, productFormSchema, toProductFormErrorTarget } from '../model/product-form.schema';
import {
  PRODUCT_FORM_TABS,
  PRODUCT_TAB_LABELS,
  adjacentTab,
  validateProductTabs,
  type ProductFormTab,
} from '../model/product-form-tabs';
import {
  toCreateProductDto,
  toProductFormValues,
  toUpdateProductDto,
  type ProductFormValues,
} from '../model/product-form.mapper';
import { toOpeningStockItems } from '../model/product-opening-stock.mapper';
import { toSpecificationPayload } from '../model/product-specifications';
import { useProductFormLookups } from './use-product-form-lookups';

/**
 * Toàn bộ state, query và lệnh của workspace sản phẩm (Tạo + Sửa).
 *
 * Mỗi lần mở workspace là một phiên mới: trang gọi remount component qua `key`, nên slug đang sửa,
 * khoá idempotency, tồn đầu chờ ghi và tab đều khởi tạo lại từ đầu thay vì reset trong effect.
 */
export function useProductWorkspace({ open, slug }: { open: boolean; slug?: string }) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const canAdjustStock = useCan('inventory.stock.adjust');
  const canManagePrice = useCan('catalog.price.manage');
  const [activeSlug, setActiveSlug] = useState(slug);
  const [specificationErrors, setSpecificationErrors] = useState<string[]>([]);
  const [pendingOpeningStock, setPendingOpeningStock] = useState<PendingOpeningStock>();
  const [activeTab, setActiveTab] = useState<ProductFormTab>('info');
  /** Tab mở sau khi sản phẩm vừa tạo được tải về (mặc định về `info`). */
  const [tabAfterLoad, setTabAfterLoad] = useState<ProductFormTab>();
  /** IDEMPOTENCY: một khoá cho phiếu tồn đầu của phiên này; thử ghi lại dùng cùng khoá. */
  const [openingStockIdempotencyKey] = useState(() => crypto.randomUUID());
  /**
   * IDEMPOTENCY: một id cho một lần mở form tạo. Bấm lại sau khi mất response (timeout, rớt mạng)
   * gửi cùng id nên API trả lại sản phẩm đã tạo thay vì tạo bản thứ hai; sửa dữ liệu rồi gửi lại
   * sau khi sản phẩm đã tạo thì API trả 409 để người dùng tải lại thay vì nhân đôi.
   */
  const [createProductRequestId] = useState(() => crypto.randomUUID());
  const submittedCreateValues = useRef<ProductFormValues | undefined>(undefined);
  const form = useForm<ProductFormValues>({
    resolver: yupResolver(productFormSchema),
    defaultValues: PRODUCT_FORM_DEFAULTS,
  });
  const variantFields = useFieldArray({ control: form.control, name: 'variants' });

  const detail = useGetAdminProduct(activeSlug ?? '', { query: { enabled: open && Boolean(activeSlug) } });
  const product = detail.data;
  const isEdit = Boolean(activeSlug);
  const productType = form.watch('productType');
  const initialBranchId = form.watch('initialBranchId');
  const variants = form.watch('variants');
  const lookups = useProductFormLookups({ open, isEdit, canAdjustStock, initialBranchId });
  // INVARIANT: checklist xuất bản lấy từ API (cùng policy với publish), không tự tính ở UI.
  const setupStatus = useGetAdminProductSetupStatus(product?.id ?? '', {
    query: { enabled: open && Boolean(product?.id) },
  });

  // Nhãn cho bảng tóm tắt: đọc từ option đang tải, không giữ bản sao riêng để khỏi lệch khi đổi lựa chọn.
  const selectedBrandId = form.watch('brandId');
  const selectedCategoryIds = form.watch('categoryIds');
  const brandLabel =
    (product?.brandId === selectedBrandId ? product?.brand : undefined)
    ?? lookups.brands.data?.items.find((item) => item.id === selectedBrandId)?.label;
  const categoryLabels = (selectedCategoryIds ?? []).map(
    (id) =>
      product?.categories.find((category) => category.id === id)?.name
      ?? lookups.categories.data?.items.find((item) => item.id === id)?.label
      ?? id,
  );
  const branchLabel = lookups.branches.data?.items.find((item) => item.id === initialBranchId)?.label;

  // Sản phẩm khác được nạp (mở Sửa, hoặc vừa tạo xong): về tab phù hợp và xoá lỗi thông số cũ. Điều
  // chỉnh ngay lúc render theo mẫu "adjusting state when a prop changes" thay vì setState trong effect.
  const productId = product?.id;
  const [loadedProductId, setLoadedProductId] = useState<string>();
  if (open && productId && productId !== loadedProductId) {
    setLoadedProductId(productId);
    setSpecificationErrors([]);
    setActiveTab(tabAfterLoad ?? 'info');
    setTabAfterLoad(undefined);
  }

  // Chỉ reset form khi sản phẩm khác được nạp. SKU/giá/ảnh lưu ngay làm `product` tải lại (version mới);
  // reset theo mỗi lần đó sẽ xoá những ô người dùng đang sửa dở.
  const latestProduct = useRef(product);
  latestProduct.current = product;
  useEffect(() => {
    if (!open || !latestProduct.current) return;
    form.reset(toProductFormValues(latestProduct.current));
  }, [form, open, productId]);

  // Chi nhánh chỉ có một kho thì chọn sẵn kho đó cho tồn đầu.
  const warehouseItems = lookups.warehouses.data?.items;
  useEffect(() => {
    if (!open || isEdit || !initialBranchId) return;
    const options = warehouseItems ?? [];
    const current = form.getValues('initialWarehouseCode');
    if (options.length === 1 && current !== options[0].code) {
      form.setValue('initialWarehouseCode', options[0].code, { shouldValidate: true });
    }
  }, [form, initialBranchId, isEdit, open, warehouseItems]);

  /** SKU, giá, ảnh, combo, thông tin đổi version; đọc lại để lần gửi sau không dùng version cũ. */
  async function refreshProduct() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetAdminProductQueryKey(activeSlug) }),
      queryClient.invalidateQueries({ queryKey: getGetAdminProductSetupStatusQueryKey(product?.id) }),
    ]);
  }

  function handleError(error: unknown, fallback: string) {
    Object.entries(getApiFieldErrors(error)).forEach(([field, fieldMessage]) => {
      const target = toProductFormErrorTarget(field);
      if (target?.kind === 'field') form.setError(target.path, { message: fieldMessage });
      else if (target?.kind === 'specification') setSpecificationErrors((current) => [...current, fieldMessage]);
    });
    void message.error(getApiErrorMessage(error, fallback));
  }

  const openingStock = useCreateStockAdjustment({
    request: { headers: { 'Idempotency-Key': openingStockIdempotencyKey } },
  });
  const createProduct = useCreateAdminProduct({
    request: { headers: { 'x-request-id': createProductRequestId } },
    mutation: {
      onSuccess: async (createdProduct) => {
        // CONTRACT: dùng snapshot lúc submit để SKU/tồn đầu không lệch nếu response về chậm.
        const values = submittedCreateValues.current ?? form.getValues();
        let pending: PendingOpeningStock | undefined;
        let stockData: CreateStockAdjustmentDto | undefined;
        try {
          const items = toOpeningStockItems(values.variants, createdProduct);
          if (items.length > 0 && values.initialWarehouseCode) {
            stockData = {
              warehouseCode: values.initialWarehouseCode,
              adjustmentType: StockAdjustmentType.OPENING_BALANCE,
              reasonCode: StockAdjustmentReason.INITIAL_STOCK,
              reason: `Khởi tạo tồn đầu khi tạo sản phẩm ${createdProduct.productNo}`,
              items,
            };
            await openingStock.mutateAsync({ data: stockData });
          }
        } catch (error) {
          // Giá, ảnh và thông số đã nằm trong transaction tạo sản phẩm; chỉ tồn đầu (nghiệp vụ kho của
          // chi nhánh) là bước riêng có thể lỗi sau khi sản phẩm đã tạo. Giữ payload + khoá để ghi lại.
          if (stockData) {
            pending = {
              idempotencyKey: openingStockIdempotencyKey,
              data: stockData,
              error: getApiErrorMessage(error),
            };
          } else {
            void message.error(getApiErrorMessage(error));
          }
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListInventoryBalancesQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListStockAdjustmentsQueryKey() }),
        ]);
        submittedCreateValues.current = undefined;
        setPendingOpeningStock(pending);
        if (pending) {
          void message.warning(`Đã tạo sản phẩm nhưng chưa ghi được tồn đầu. Bấm “Thử ghi tồn đầu lại” ở mục Tồn kho, tab "${PRODUCT_TAB_LABELS.variants}".`, 8);
        } else {
          const stockMessage = stockData ? ' và đã ghi tồn đầu' : '';
          void message.success(`Đã tạo sản phẩm cùng ${createdProduct.variants.length} biến thể${stockMessage}.`);
        }
        // Chuyển tại chỗ sang chế độ Sửa: cùng workspace, người dùng làm tiếp combo/giá/xuất bản.
        setTabAfterLoad(pending ? 'variants' : 'review');
        setActiveSlug(createdProduct.slug);
      },
      onError: (error) => {
        submittedCreateValues.current = undefined;
        handleError(error, 'Không thể tạo sản phẩm.');
      },
    },
  });
  const updateProduct = useUpdateAdminProduct({
    mutation: {
      onSuccess: async (updated) => {
        await refreshProduct();
        // Đặt lại mốc "chưa sửa" theo dữ liệu vừa lưu; workspace vẫn mở như các thao tác lưu ngay khác.
        form.reset(toProductFormValues(updated));
        void message.success('Đã lưu thông tin sản phẩm.');
      },
      onError: (error) => handleError(error, 'Không thể cập nhật sản phẩm.'),
    },
  });
  const lifecycleMutation = (success: string, failure: string) => ({
    mutation: {
      onSuccess: async () => {
        await refreshProduct();
        void message.success(success);
      },
      onError: (error: unknown) => void message.error(getApiErrorMessage(error, failure)),
    },
  });
  const publish = usePublishAdminProduct(lifecycleMutation('Đã xuất bản sản phẩm lên website.', 'Không xuất bản được sản phẩm.'));
  const archiveProduct = useArchiveAdminProduct(lifecycleMutation('Đã lưu trữ; sản phẩm không còn hiển thị trên website.', 'Không lưu trữ được sản phẩm.'));
  const reactivateProduct = useReactivateAdminProduct(lifecycleMutation('Đã đưa sản phẩm về bản nháp để kiểm tra trước khi xuất bản lại.', 'Không thể khôi phục sản phẩm.'));
  const mutationPending = createProduct.isPending || updateProduct.isPending || openingStock.isPending;

  const submit = form.handleSubmit((values) => {
    const specificationResult = toSpecificationPayload(values.specifications, lookups.attributes);
    setSpecificationErrors(specificationResult.errors);
    if (specificationResult.errors.length > 0) {
      // Thông số kỹ thuật là một khối của tab Thông tin.
      setActiveTab('info');
      void message.error(`Kiểm tra lại mục Thông số kỹ thuật ở tab "${PRODUCT_TAB_LABELS.info}".`);
      return;
    }
    if (product) {
      // Không sửa thông số thì không gửi: API ghi đè cả bộ khi có trường này.
      const specificationsDirty = Boolean(form.formState.dirtyFields.specifications);
      updateProduct.mutate({
        id: product.id,
        data: toUpdateProductDto(values, product, specificationsDirty ? specificationResult.specifications : undefined),
      });
    } else {
      submittedCreateValues.current = {
        ...values,
        categoryIds: [...values.categoryIds],
        variants: values.variants.map((variant) => ({ ...variant })),
      };
      createProduct.mutate({
        data: toCreateProductDto(values, {
          includePrices: canManagePrice,
          specifications: specificationResult.specifications,
        }),
      });
    }
  });

  /**
   * Validate theo từng tab trước khi submit.
   *
   * `handleSubmit` chỉ báo form không hợp lệ; nó không nói lỗi nằm ở tab nào. Không nhảy tới tab đó
   * thì người dùng bấm Lưu, không có gì xảy ra, và ô lỗi nằm ở tab họ không nhìn thấy.
   */
  const submitWithTabValidation = async () => {
    const result = await validateProductTabs(form, isEdit ? 'edit' : 'create', PRODUCT_FORM_TABS);
    if (!result.isValid && result.errorTab) {
      setActiveTab(result.errorTab);
      void message.error(`Kiểm tra lại tab "${PRODUCT_TAB_LABELS[result.errorTab]}".`);
      return;
    }
    await submit();
  };

  const confirmPublish = () => {
    if (!product) return;
    modal.confirm({
      title: `Xuất bản “${product.name}”?`,
      content: 'Sản phẩm sẽ hiển thị công khai với giá đã bao gồm VAT. Version hiện tại được kiểm tra để không ghi đè thay đổi của người khác.',
      okText: 'Xuất bản',
      cancelText: 'Huỷ',
      onOk: () => publish.mutateAsync({ id: product.id, data: { expectedVersion: product.version } }),
    });
  };
  const confirmLifecycle = () => {
    if (!product) return;
    const archived = product.status === 'ARCHIVED';
    modal.confirm({
      title: archived
        ? `Đưa “${product.name}” về bản nháp?`
        : `Lưu trữ ${product.productType === ProductType.BUNDLE ? 'combo' : 'sản phẩm'} “${product.name}”?`,
      content: archived
        ? 'Sản phẩm chưa hiển thị lại ngay. Cần kiểm tra SKU, giá rồi xuất bản lại.'
        : 'Sản phẩm sẽ ẩn ngay khỏi website và chặn giao dịch mới. Đơn hàng lịch sử không bị thay đổi.',
      okText: archived ? 'Đưa về bản nháp' : 'Lưu trữ',
      okButtonProps: { danger: !archived },
      cancelText: 'Huỷ',
      onOk: () => archived
        ? reactivateProduct.mutateAsync({ id: product.id, data: { expectedVersion: product.version } })
        : archiveProduct.mutateAsync({ id: product.id, data: { expectedVersion: product.version } }),
    });
  };

  return {
    form,
    variantFields,
    detail,
    product,
    isEdit,
    isArchived: product?.status === 'ARCHIVED',
    productType,
    effectiveProductType: product?.productType ?? productType,
    initialBranchId,
    hasOpeningStock: variants.some(({ openingQuantity }) => openingQuantity > 0),
    canAdjustStock,
    canManagePrice,
    lookups,
    setupStatus,
    canPublish: setupStatus.data?.canPublish ?? false,
    brandLabel,
    categoryLabels,
    branchLabel,
    specificationErrors,
    pendingOpeningStock,
    clearPendingOpeningStock: () => setPendingOpeningStock(undefined),
    activeTab,
    setActiveTab,
    previousTab: adjacentTab(activeTab, -1, PRODUCT_FORM_TABS),
    nextTab: adjacentTab(activeTab, 1, PRODUCT_FORM_TABS),
    refreshProduct,
    mutationPending,
    submitWithTabValidation,
    confirmPublish,
    confirmLifecycle,
    publishPending: publish.isPending,
    lifecyclePending: archiveProduct.isPending || reactivateProduct.isPending,
  };
}

export type ProductWorkspace = ReturnType<typeof useProductWorkspace>;
