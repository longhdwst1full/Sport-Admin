import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useCan } from '@/core/auth/permissions';
import {
  useGetAdminProduct,
  useGetAdminProductSetupStatus,
  useUpdateAdminProduct,
} from '@/generated/api/catalog/catalog';
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api/error';
import type { PendingOpeningStock } from '../components/product-form/product-stock-panel';
import { PRODUCT_FORM_DEFAULTS, productFormSchema, toProductFormErrorTarget } from '../model/product-form.schema';
import {
  PRODUCT_FORM_TABS,
  PRODUCT_TAB_LABELS,
  validateProductTabs,
  type ProductFormTab,
} from '../model/product-form-tabs';
import {
  toCreateProductDto,
  toProductFormValues,
  toUpdateProductDto,
  type ProductFormValues,
} from '../model/product-form.mapper';
import { toSpecificationPayload } from '../model/product-specifications';
import { invalidateProductQueries } from './product-query-cache';
import { useProductCreate } from './use-product-create';
import { useProductFormLookups } from './use-product-form-lookups';
import { useProductLifecycle } from './use-product-lifecycle';

/**
 * Toàn bộ state, query và lệnh của workspace sản phẩm (Tạo + Sửa).
 *
 * Mỗi lần mở workspace là một phiên mới: trang gọi remount component qua `key`, nên slug đang sửa,
 * khoá idempotency, tồn đầu chờ ghi và tab đều khởi tạo lại từ đầu thay vì reset trong effect.
 */
export function useProductWorkspace({
  open,
  slug,
  onCreated,
}: {
  open: boolean;
  slug?: string;
  /** Tạo xong (kể cả tồn đầu) thì gọi để nơi dùng đóng workspace và quay về danh sách. */
  onCreated?: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const canAdjustStock = useCan('inventory.stock.adjust');
  const canManagePrice = useCan('catalog.price.manage');
  const [activeSlug, setActiveSlug] = useState(slug);
  const [specificationErrors, setSpecificationErrors] = useState<string[]>([]);
  const [pendingOpeningStock, setPendingOpeningStock] = useState<PendingOpeningStock>();
  const [activeTab, setActiveTab] = useState<ProductFormTab>('info');
  /** Tab mở sau khi sản phẩm vừa tạo được tải về (mặc định về `info`). */
  const [tabAfterLoad, setTabAfterLoad] = useState<ProductFormTab>();
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
    await invalidateProductQueries(queryClient, { id: product?.id, slug: activeSlug });
  }

  function handleError(error: unknown, fallback: string) {
    Object.entries(getApiFieldErrors(error)).forEach(([field, fieldMessage]) => {
      const target = toProductFormErrorTarget(field);
      if (target?.kind === 'field') form.setError(target.path, { message: fieldMessage });
      else if (target?.kind === 'specification') setSpecificationErrors((current) => [...current, fieldMessage]);
    });
    void message.error(getApiErrorMessage(error, fallback));
  }

  const createProduct = useProductCreate({
    onCreated: (createdProduct, pending) => {
      if (pending) {
        // Tồn đầu chưa ghi được: chuyển tại chỗ sang chế độ Sửa để giữ payload + khoá và cho "Thử ghi lại".
        setPendingOpeningStock(pending);
        setTabAfterLoad('variants');
        setActiveSlug(createdProduct.slug);
        return;
      }
      // Tạo thành công: đóng workspace, danh sách (đã invalidate) hiện sản phẩm mới.
      onCreated?.();
    },
    onError: (error) => handleError(error, 'Không thể tạo sản phẩm.'),
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
  const lifecycle = useProductLifecycle();
  const mutationPending = createProduct.isPending || updateProduct.isPending;

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
      createProduct.create(
        values,
        toCreateProductDto(values, { includePrices: canManagePrice, specifications: specificationResult.specifications }),
      );
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
    refreshProduct,
    mutationPending,
    submitWithTabValidation,
    confirmPublish: () => product && lifecycle.confirmPublish(product),
    confirmLifecycle: () => product && lifecycle.confirmLifecycle(product),
    publishPending: Boolean(product) && lifecycle.publishBusyId === product?.id,
    lifecyclePending: Boolean(product) && lifecycle.lifecycleBusyId === product?.id,
  };
}

export type ProductWorkspace = ReturnType<typeof useProductWorkspace>;
