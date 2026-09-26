import { CACHE_POLICY } from '@/app/config/query-cache-policy';
import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Divider, Drawer, Form, Skeleton, Space, Tabs, Tag } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm, type FieldPath } from 'react-hook-form';
import { useDebounce } from 'use-debounce';
import * as yup from 'yup';
import { SKU_PATTERN, SKU_PATTERN_MESSAGE } from '../constants/product-list.constants';
import { PermissionGate, useCan } from '@/core/auth/permissions';
import { ENTITY_ID_PATTERN } from '@/lib/validation/entity-id';
import {
  getGetAdminProductQueryKey,
  getGetAdminProductSetupStatusQueryKey,
  getListAdminProductsQueryKey,
  useArchiveAdminProduct,
  useCreateAdminProduct,
  useGetAdminProduct,
  useGetAdminProductSetupStatus,
  useListAdminAttributes,
  usePublishAdminProduct,
  useReactivateAdminProduct,
  useSearchActiveAdminBrands,
  useSearchActiveAdminCategories,
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
  StockAdjustmentType,
  StockAdjustmentReason,
  type CreateStockAdjustmentDto,
} from '@/generated/api/inventory/inventory.schemas';
import {
  useSearchActiveAdminBranches,
  useSearchActiveAdminWarehouses,
} from '@/generated/api/organization/organization';
import { ProductBasicInfoTab } from './product-form/product-basic-info-tab';
import { ProductBundleManager } from './product-form/product-bundle-manager';
import { ProductMediaTab } from './product-form/product-media-tab';
import { ProductOpeningStockTab } from './product-form/product-opening-stock-tab';
import { ProductReviewTab } from './product-form/product-review-tab';
import { ProductSpecificationsTab } from './product-form/product-specifications-tab';
import { ProductStockPanel, type PendingOpeningStock } from './product-form/product-stock-panel';
import { ProductVariantsManager } from './product-form/product-variants-manager';
import { ProductVariantsTab } from './product-form/product-variants-tab';
import {
  PRODUCT_FORM_TABS,
  PRODUCT_TAB_LABELS,
  adjacentTab,
  validateProductTabs,
  type ProductFormTab,
} from '../model/product-form-tabs';
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api/error';
import {
  emptyVariant,
  toCreateProductDto,
  toProductFormValues,
  toUpdateProductDto,
  type ProductFormValues,
} from '../model/product-form.mapper';
import { INITIAL_PRICE_PATTERN } from '../model/product-initial-setup';
import { toOpeningStockItems } from '../model/product-opening-stock.mapper';
import { toSpecificationPayload } from '../model/product-specifications';

const schema: yup.ObjectSchema<ProductFormValues> = yup.object({
  productType: yup
    .mixed<ProductType>()
    .oneOf(Object.values(ProductType))
    .required('Chọn loại sản phẩm'),
  name: yup.string().trim().required('Nhập tên sản phẩm').max(255, 'Tối đa 255 ký tự'),
  brandId: yup.string().matches(ENTITY_ID_PATTERN, 'Thương hiệu không hợp lệ').optional(),
  categoryIds: yup.array().of(yup.string().matches(ENTITY_ID_PATTERN, 'Danh mục không hợp lệ').required()).min(1, 'Chọn ít nhất một danh mục').required(),
  primaryCategoryId: yup
    .string()
    .matches(ENTITY_ID_PATTERN, 'Danh mục chính không hợp lệ')
    .required('Chọn danh mục chính')
    .test('selected-category', 'Danh mục chính phải nằm trong danh mục đã chọn', function (value) {
      return Boolean(value && (this.parent.categoryIds ?? []).includes(value));
    }),
  shortDescription: yup.string().trim().max(1000, 'Tối đa 1000 ký tự').optional(),
  description: yup.string().trim().optional(),
  initialBranchId: yup.string().matches(ENTITY_ID_PATTERN, 'Chi nhánh không hợp lệ').optional(),
  initialWarehouseCode: yup.string().trim().optional().test(
    'opening-stock-location',
    'Chọn chi nhánh và kho khi nhập số lượng tồn đầu',
    function validateOpeningStockLocation(value) {
      const values = this.parent as ProductFormValues;
      const hasOpeningStock = values.variants.some(({ openingQuantity }) => openingQuantity > 0);
      return !hasOpeningStock || Boolean(values.initialBranchId && value);
    },
  ),
  images: yup.array().of(yup.object({ assetId: yup.string().required(), url: yup.string().required() })).default([]),
  // Kiểu giá trị theo từng thuộc tính cần từ điển nên kiểm ở `toSpecificationPayload` lúc submit.
  specifications: yup
    .array()
    .of(yup.object({ code: yup.string().defined(), values: yup.array().of(yup.string().required()).required() }))
    .required(),
  variants: yup
    .array()
    .of(yup.object({
      name: yup.string().trim().required('Nhập tên biến thể').max(255, 'Tối đa 255 ký tự'),
      sku: yup.string().trim().uppercase().test('sku-pattern', SKU_PATTERN_MESSAGE, (value) => !value || SKU_PATTERN.test(value)).optional(),
      barcode: yup.string().trim().max(64, 'Tối đa 64 ký tự').optional(),
      weightGrams: yup.number().integer('Khối lượng phải là số nguyên').min(0, 'Tối thiểu 0').optional(),
      lengthMm: yup.number().integer('Chiều dài phải là số nguyên').min(1, 'Tối thiểu 1 mm').optional(),
      widthMm: yup.number().integer('Chiều rộng phải là số nguyên').min(1, 'Tối thiểu 1 mm').optional(),
      heightMm: yup.number().integer('Chiều cao phải là số nguyên').min(1, 'Tối thiểu 1 mm').optional(),
      openingQuantity: yup.number()
        .integer('Số lượng phải là số nguyên')
        .min(0, 'Số lượng không được âm')
        .required('Nhập số lượng tồn đầu'),
      // CONTRACT: cùng regex với `initialPriceAmount` của API; sai định dạng thì chặn ở đây thay vì để API
      // từ chối cả lệnh tạo.
      price: yup.string().trim().optional().test(
        'price-format',
        'Giá phải lớn hơn 0, tối đa 2 chữ số thập phân',
        (value) => !value || INITIAL_PRICE_PATTERN.test(value),
      ),
    }))
    .min(1, 'Cần ít nhất một biến thể')
    .max(50, 'Tối đa 50 biến thể mỗi lần tạo')
    .required(),
});

const defaults: ProductFormValues = {
  productType: ProductType.STANDARD,
  name: '',
  brandId: undefined,
  categoryIds: [],
  primaryCategoryId: '',
  shortDescription: '',
  description: '',
  initialBranchId: undefined,
  initialWarehouseCode: undefined,
  images: [],
  specifications: [],
  variants: [emptyVariant()],
};

/** Tên trường lỗi của API → ô của form (khác tên ở đúng một chỗ). */
const API_VARIANT_FIELD: Record<string, string> = { initialPriceAmount: 'price' };
const VARIANT_FORM_FIELD = /^(name|sku|barcode|weightGrams|lengthMm|widthMm|heightMm|openingQuantity|price)$/;
const STATUS_COLOR: Record<string, string> = { DRAFT: 'blue', PUBLISHED: 'green', ARCHIVED: 'default' };

/**
 * Workspace sản phẩm — **một** drawer duy nhất cho Tạo và Sửa, cùng ba tab (`PRODUCT_FORM_TABS`).
 *
 * Hợp nhất ở bố cục, không ở API:
 * - Tạo: một lệnh `createAdminProduct` (sản phẩm, SKU, giá, ảnh, thông số trong một transaction), rồi phiếu
 *   tồn đầu của Inventory. Tạo xong, workspace chuyển tại chỗ sang chế độ Sửa của sản phẩm vừa tạo.
 * - Sửa: nút Lưu gửi `updateAdminProduct` (thông tin + thông số); SKU, giá, ảnh, combo ghi ngay qua
 *   operation riêng; xuất bản/lưu trữ là lệnh vòng đời ở header.
 */
export function ProductWorkspaceDrawer({
  open,
  slug,
  onClose,
}: {
  open: boolean;
  /** Có thì mở ở chế độ Sửa. */
  slug?: string;
  onClose: () => void;
}) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const canAdjustStock = useCan('inventory.stock.adjust');
  const canManagePrice = useCan('catalog.price.manage');
  const [activeSlug, setActiveSlug] = useState(slug);
  const [brandSearch, setBrandSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [branchSearch, setBranchSearch] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [debouncedBrand] = useDebounce(brandSearch.trim(), 300);
  const [debouncedCategory] = useDebounce(categorySearch.trim(), 300);
  const [debouncedBranch] = useDebounce(branchSearch.trim(), 300);
  const [debouncedWarehouse] = useDebounce(warehouseSearch.trim(), 300);
  const [specificationErrors, setSpecificationErrors] = useState<string[]>([]);
  const [pendingOpeningStock, setPendingOpeningStock] = useState<PendingOpeningStock>();
  const openingStockIdempotencyKey = useRef(crypto.randomUUID());
  /**
   * IDEMPOTENCY: một id cho một lần mở form tạo. Bấm lại sau khi mất response (timeout, rớt mạng)
   * gửi cùng id nên API trả lại sản phẩm đã tạo thay vì tạo bản thứ hai; sửa dữ liệu rồi gửi lại
   * sau khi sản phẩm đã tạo thì API trả 409 để người dùng tải lại thay vì nhân đôi.
   */
  const createProductRequestId = useRef(crypto.randomUUID());
  const submittedCreateValues = useRef<ProductFormValues | undefined>(undefined);
  /** Tab mở sau khi sản phẩm vừa tạo được tải về (mặc định reset về `info`). */
  const tabAfterLoad = useRef<ProductFormTab | undefined>(undefined);
  const form = useForm<ProductFormValues>({ resolver: yupResolver(schema), defaultValues: defaults });
  const variantFields = useFieldArray({ control: form.control, name: 'variants' });
  const [activeTab, setActiveTab] = useState<ProductFormTab>('info');

  const detail = useGetAdminProduct(activeSlug ?? '', { query: { enabled: open && Boolean(activeSlug) } });
  const product = detail.data;
  const isEdit = Boolean(activeSlug);
  const mode = isEdit ? 'edit' : 'create';
  const productType = form.watch('productType');
  const tabs = PRODUCT_FORM_TABS;
  const effectiveProductType = product?.productType ?? productType;
  const previousTab = adjacentTab(activeTab, -1, tabs);
  const nextTab = adjacentTab(activeTab, 1, tabs);
  const initialBranchId = form.watch('initialBranchId');
  const variants = form.watch('variants');
  const hasOpeningStock = variants.some(({ openingQuantity }) => openingQuantity > 0);
  const brands = useSearchActiveAdminBrands(
    { search: debouncedBrand || undefined, page: 1, limit: 20 },
    { query: { ...CACHE_POLICY.LOOKUP, enabled: open } },
  );
  const categories = useSearchActiveAdminCategories(
    { search: debouncedCategory || undefined, page: 1, limit: 20 },
    { query: { ...CACHE_POLICY.LOOKUP, enabled: open } },
  );
  const attributesQuery = useListAdminAttributes({ query: { ...CACHE_POLICY.LOOKUP, enabled: open } });
  const attributes = attributesQuery.data?.items ?? [];
  // INVARIANT: checklist xuất bản lấy từ API (cùng policy với publish), không tự tính ở UI.
  const setupStatus = useGetAdminProductSetupStatus(product?.id ?? '', {
    query: { enabled: open && Boolean(product?.id) },
  });
  const canPublish = setupStatus.data?.canPublish ?? false;
  const branches = useSearchActiveAdminBranches(
    { search: debouncedBranch || undefined, page: 1, limit: 50 },
    { query: { ...CACHE_POLICY.REFERENCE, enabled: open && !isEdit && canAdjustStock } },
  );
  const warehouses = useSearchActiveAdminWarehouses(
    {
      branchId: initialBranchId,
      search: debouncedWarehouse || undefined,
      page: 1,
      limit: 50,
    },
    { query: { ...CACHE_POLICY.REFERENCE, enabled: open && !isEdit && canAdjustStock && Boolean(initialBranchId) } },
  );
  // Nhãn cho bảng tóm tắt: đọc từ option đang tải, không giữ bản sao riêng để khỏi lệch khi đổi lựa chọn.
  const selectedBrandId = form.watch('brandId');
  const selectedCategoryIds = form.watch('categoryIds');
  const brandLabel =
    (product?.brandId === selectedBrandId ? product?.brand : undefined)
    ?? brands.data?.items.find((item) => item.id === selectedBrandId)?.label;
  const categoryLabels = (selectedCategoryIds ?? []).map(
    (id) =>
      product?.categories.find((category) => category.id === id)?.name
      ?? categories.data?.items.find((item) => item.id === id)?.label
      ?? id,
  );
  const branchLabel = branches.data?.items.find((item) => item.id === initialBranchId)?.label;

  /** SKU, giá, ảnh, combo, thông tin đổi version; đọc lại để lần gửi sau không dùng version cũ. */
  async function refreshProduct() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetAdminProductQueryKey(activeSlug) }),
      queryClient.invalidateQueries({ queryKey: getGetAdminProductSetupStatusQueryKey(product?.id) }),
    ]);
  }

  const openingStock = useCreateStockAdjustment({
    request: { headers: { 'Idempotency-Key': openingStockIdempotencyKey.current } },
  });
  const createProduct = useCreateAdminProduct({
    request: { headers: { 'x-request-id': createProductRequestId.current } },
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
              idempotencyKey: openingStockIdempotencyKey.current,
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
        tabAfterLoad.current = pending ? 'variants' : 'review';
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

  function handleError(error: unknown, fallback: string) {
    Object.entries(getApiFieldErrors(error)).forEach(([field, fieldMessage]) => {
      const variantField = /^variants\.(\d+)\.(\w+)$/.exec(field);
      if (variantField) {
        const name = API_VARIANT_FIELD[variantField[2]] ?? variantField[2];
        if (VARIANT_FORM_FIELD.test(name)) {
          form.setError(`variants.${Number(variantField[1])}.${name}` as FieldPath<ProductFormValues>, { message: fieldMessage });
        }
      } else if (field.startsWith('specifications')) {
        setSpecificationErrors((current) => [...current, fieldMessage]);
      } else if (field in schema.fields) {
        form.setError(field as FieldPath<ProductFormValues>, { message: fieldMessage });
      }
    });
    void message.error(getApiErrorMessage(error, fallback));
  }

  // Mở workspace: về đúng sản phẩm được chọn (hoặc form tạo trống) với khoá idempotency mới.
  useEffect(() => {
    if (!open) return;
    setActiveSlug(slug);
    setPendingOpeningStock(undefined);
    openingStockIdempotencyKey.current = crypto.randomUUID();
    createProductRequestId.current = crypto.randomUUID();
    submittedCreateValues.current = undefined;
    tabAfterLoad.current = undefined;
    if (!slug) {
      form.reset(defaults);
      setSpecificationErrors([]);
      setActiveTab('info');
    }
  }, [form, open, slug]);

  // Chỉ reset form khi sản phẩm khác được nạp. SKU/giá/ảnh lưu ngay làm `product` tải lại (version mới);
  // reset theo mỗi lần đó sẽ xoá những ô người dùng đang sửa dở.
  const latestProduct = useRef(product);
  latestProduct.current = product;
  const productId = product?.id;
  useEffect(() => {
    if (!open || !latestProduct.current) return;
    form.reset(toProductFormValues(latestProduct.current));
    setSpecificationErrors([]);
    setActiveTab(tabAfterLoad.current ?? 'info');
    tabAfterLoad.current = undefined;
  }, [form, open, productId]);

  useEffect(() => {
    if (!open || isEdit || !initialBranchId) return;
    const options = warehouses.data?.items ?? [];
    const current = form.getValues('initialWarehouseCode');
    if (options.length === 1 && current !== options[0].code) {
      form.setValue('initialWarehouseCode', options[0].code, { shouldValidate: true });
    }
  }, [form, initialBranchId, isEdit, open, warehouses.data?.items]);

  /**
   * Validate theo từng tab trước khi submit.
   *
   * `handleSubmit` chỉ báo form không hợp lệ; nó không nói lỗi nằm ở tab nào. Không nhảy tới tab đó
   * thì người dùng bấm Lưu, không có gì xảy ra, và ô lỗi nằm ở tab họ không nhìn thấy.
   */
  const submitWithTabValidation = async () => {
    const result = await validateProductTabs(form, mode, tabs);
    if (!result.isValid && result.errorTab) {
      setActiveTab(result.errorTab);
      void message.error(`Kiểm tra lại tab "${PRODUCT_TAB_LABELS[result.errorTab]}".`);
      return;
    }
    await submit();
  };

  const submit = form.handleSubmit((values) => {
    const specificationResult = toSpecificationPayload(values.specifications, attributes);
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

  const confirmPublish = () => {
    if (!product) return;
    modal.confirm({
      title: `Xuất bản “${product.name}”?`,
      content: 'Sản phẩm sẽ hiển thị công khai với giá đã bao gồm VAT. Version hiện tại được kiểm tra để không ghi đè thay đổi của người khác.',
      okText: 'Xuất bản',
      cancelText: 'Hủy',
      onOk: () => publish.mutateAsync({ id: product.id, data: { expectedVersion: product.version } }),
    });
  };
  const confirmLifecycle = () => {
    if (!product) return;
    const isArchived = product.status === 'ARCHIVED';
    modal.confirm({
      title: isArchived
        ? `Đưa “${product.name}” về bản nháp?`
        : `Lưu trữ ${product.productType === ProductType.BUNDLE ? 'combo' : 'sản phẩm'} “${product.name}”?`,
      content: isArchived
        ? 'Sản phẩm chưa hiển thị lại ngay. Cần kiểm tra SKU, giá rồi xuất bản lại.'
        : 'Sản phẩm sẽ ẩn ngay khỏi website và chặn giao dịch mới. Đơn hàng lịch sử không bị thay đổi.',
      okText: isArchived ? 'Đưa về bản nháp' : 'Lưu trữ',
      okButtonProps: { danger: !isArchived },
      cancelText: 'Hủy',
      onOk: () => isArchived
        ? reactivateProduct.mutateAsync({ id: product.id, data: { expectedVersion: product.version } })
        : archiveProduct.mutateAsync({ id: product.id, data: { expectedVersion: product.version } }),
    });
  };

  const isArchived = product?.status === 'ARCHIVED';
  const tabContent = (tab: ProductFormTab) => {
    // Tab gộp chỉ ghép các component khối sẵn có. Khối nào đã tự có tiêu đề (FormSection) thì không thêm
    // tiêu đề nữa, để mỗi khối chỉ có một tiêu đề nhìn thấy; chỉ khối không có tiêu đề riêng mới thêm Divider.
    switch (tab) {
      case 'info':
        return (
          <div className="space-y-4">
            <ProductBasicInfoTab
              form={form}
              product={product}
              brands={brands}
              categories={categories}
              onBrandSearch={setBrandSearch}
              onCategorySearch={setCategorySearch}
            />
            <ProductMediaTab form={form} product={product} disabled={mutationPending} onMediaChanged={refreshProduct} />
            <ProductSpecificationsTab form={form} attributes={attributes} loading={attributesQuery.isPending} errors={specificationErrors} />
          </div>
        );
      case 'variants':
        return (
          <div className="space-y-4">
            {product ? (
              <ProductVariantsManager product={product} onChanged={refreshProduct} />
            ) : (
              <ProductVariantsTab form={form} variantFields={variantFields} productType={productType} canManagePrice={canManagePrice} />
            )}
            {product ? (
              <ProductStockPanel
                product={product}
                pendingOpeningStock={pendingOpeningStock}
                onOpeningStockRecorded={() => setPendingOpeningStock(undefined)}
              />
            ) : (
              <ProductOpeningStockTab
                form={form}
                productType={productType}
                canAdjustStock={canAdjustStock}
                initialBranchId={initialBranchId}
                hasOpeningStock={hasOpeningStock}
                branches={branches}
                warehouses={warehouses}
                onBranchSearch={setBranchSearch}
                onWarehouseSearch={setWarehouseSearch}
              />
            )}
            {/* Combo chỉ có nghĩa với sản phẩm BUNDLE; sản phẩm thường không hiện khối này ở cả Tạo lẫn Sửa. */}
            {effectiveProductType === ProductType.BUNDLE &&
              (product ? (
                <ProductBundleManager product={product} onChanged={refreshProduct} />
              ) : (
                // Thông báo lúc Tạo không có tiêu đề riêng nên thêm Divider; khi Sửa, ProductBundleManager đã có FormSection.
                <div>
                  <Divider orientation="left" orientationMargin={0}>
                    Combo
                  </Divider>
                  <Alert
                    type="info"
                    showIcon
                    message="Khai thành phần combo ngay sau khi tạo"
                    description="Thành phần gắn với SKU combo thật, nên cần tạo sản phẩm trước. Tạo xong, workspace chuyển sang chế độ sửa và mục này cho khai thành phần."
                  />
                </div>
              ))}
          </div>
        );
      case 'review':
        return (
          <ProductReviewTab
            form={form}
            brandLabel={brandLabel}
            categoryLabels={categoryLabels}
            branchLabel={branchLabel}
            product={product}
            readiness={setupStatus.data}
          />
        );
    }
  };

  return (
    <Drawer
      title={isEdit ? (product ? `${product.name} · ${product.productNo}` : 'Sản phẩm') : 'Tạo sản phẩm'}
      extra={product && (
        <Space wrap>
          <Tag color={STATUS_COLOR[product.status]}>{product.status}</Tag>
          <PermissionGate permission="catalog.product.publish">
            {product.status === 'DRAFT' && (
              <Button type="primary" disabled={!canPublish} loading={publish.isPending} onClick={confirmPublish}>
                Xuất bản
              </Button>
            )}
            <Button
              danger={!isArchived}
              loading={archiveProduct.isPending || reactivateProduct.isPending}
              onClick={confirmLifecycle}
            >
              {isArchived ? 'Đưa về bản nháp' : 'Lưu trữ'}
            </Button>
          </PermissionGate>
        </Space>
      )}
      width="100%"
      // Một độ rộng cho Tạo và Sửa: đủ cho bảng SKU và lịch giá cạnh nhau.
      styles={{ wrapper: { maxWidth: 1040 }, body: { background: 'var(--color-surface-sunken)' } }}
      push={false}
      open={open}
      onClose={() => { if (!mutationPending) onClose(); }}
      closable={!mutationPending}
      maskClosable={!mutationPending}
      keyboard={!mutationPending}
      destroyOnHidden
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-500">
            {`Bước ${tabs.indexOf(activeTab) + 1}/${tabs.length} · ${PRODUCT_TAB_LABELS[activeTab]}`}
            {isEdit && ' · SKU, giá, ảnh, combo lưu ngay khi thao tác; nút Lưu lưu thông tin và thông số.'}
          </span>
          <div className="flex gap-2">
            <Button disabled={mutationPending} onClick={onClose}>
              {isEdit ? 'Đóng' : 'Hủy'}
            </Button>
            {previousTab && (
              <Button disabled={mutationPending} onClick={() => setActiveTab(previousTab)}>
                Quay lại
              </Button>
            )}
            {nextTab && (
              <Button type={isEdit ? 'default' : 'primary'} disabled={mutationPending} onClick={() => setActiveTab(nextTab)}>
                Tiếp tục
              </Button>
            )}
            {/* Sửa: Lưu ở mọi tab vì mọi trường đã có giá trị. Tạo: chỉ ở tab cuối, sau bảng kiểm tra. */}
            {(isEdit || !nextTab) && (
              <PermissionGate permission="catalog.product.manage">
                <Button
                  type="primary"
                  loading={mutationPending}
                  disabled={isArchived || (isEdit && !product)}
                  onClick={() => void submitWithTabValidation()}
                >
                  {isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
                </Button>
              </PermissionGate>
            )}
          </div>
        </div>
      )}
    >
      {isEdit && detail.isPending ? (
        <Skeleton active />
      ) : isEdit && detail.isError ? (
        <Alert
          type="error"
          showIcon
          message="Không tải được sản phẩm"
          description={getApiErrorMessage(detail.error, 'Vui lòng thử lại.')}
          action={<Button onClick={() => void detail.refetch()}>Thử lại</Button>}
        />
      ) : (
        /*
          `component={false}`: Form chỉ cấp layout, không render <form>. Các khối lưu ngay (thêm SKU, combo,
          lịch giá) có <form> riêng; lồng <form> trong <form> làm Enter ở ô con submit nhầm cả sản phẩm.
          Một `useForm` duy nhất trải qua các tab — đổi tab không lưu gì cả.
        */
        <Form component={false} layout="vertical" disabled={mutationPending || isArchived}>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as ProductFormTab)}
            items={tabs.map((tab) => ({ key: tab, label: PRODUCT_TAB_LABELS[tab], children: tabContent(tab) }))}
          />
        </Form>
      )}
    </Drawer>
  );
}
