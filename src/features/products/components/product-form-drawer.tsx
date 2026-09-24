import { CACHE_POLICY } from '@/app/config/query-cache-policy';
import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Divider, Drawer, Form, Tabs, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm, type FieldPath } from 'react-hook-form';
import { useDebounce } from 'use-debounce';
import * as yup from 'yup';
import { useCan } from '@/core/auth/permissions';
import { ENTITY_ID_PATTERN } from '@/lib/validation/entity-id';
import {
  getGetAdminProductQueryKey,
  getListAdminProductsQueryKey,
  useAttachAdminProductMedia,
  useCreateAdminProduct,
  useCreateAdminProductPrice,
  useSearchActiveAdminBrands,
  useSearchActiveAdminCategories,
  useUpdateAdminProduct,
} from '@/generated/api/catalog/catalog';
import {
  ProductType,
  type ProductDetailDto,
} from '@/generated/api/catalog/models';
import {
  getListInventoryBalancesQueryKey,
  getListInventoryMovementsQueryKey,
  getListStockAdjustmentsQueryKey,
  useCreateStockAdjustment,
} from '@/generated/api/inventory/inventory';
import {
  StockAdjustmentType,
  StockAdjustmentReason,
} from '@/generated/api/inventory/models';
import {
  useSearchActiveAdminBranches,
  useSearchActiveAdminWarehouses,
} from '@/generated/api/organization/organization';
import { ProductBasicInfoTab } from './product-form/product-basic-info-tab';
import { ProductMediaTab } from './product-form/product-media-tab';
import { ProductReviewTab } from './product-form/product-review-tab';
import { ProductVariantsTab } from './product-form/product-variants-tab';
import {
  PRODUCT_FORM_TABS,
  PRODUCT_TAB_LABELS,
  adjacentTab,
  validateProductTabs,
  type ProductFormTab,
} from '../model/product-form-tabs';
import { ProductMediaPanel } from './product-media-panel';
import { ProductPricePanel } from './product-price-panel';
import { PermissionGate } from '@/core/auth/permissions';
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api/error';
import {
  emptyVariant,
  toCreateProductDto,
  toProductFormValues,
  toUpdateProductDto,
  type ProductFormValues,
} from '../model/product-form.mapper';
import { toOpeningStockItems } from '../model/product-opening-stock.mapper';
import { toInitialPriceCommands } from '../model/product-initial-setup';

const schema: yup.ObjectSchema<ProductFormValues> = yup.object({
  productType: yup
    .mixed<ProductType>()
    .oneOf(Object.values(ProductType))
    .required('Chọn loại sản phẩm'),
  name: yup.string().trim().required('Nhập tên sản phẩm'),
  brandId: yup.string().matches(ENTITY_ID_PATTERN, 'Thương hiệu không hợp lệ').optional(),
  categoryIds: yup.array().of(yup.string().matches(ENTITY_ID_PATTERN, 'Danh mục không hợp lệ').required()).min(1, 'Chọn ít nhất một danh mục').required(),
  primaryCategoryId: yup
    .string()
    .matches(ENTITY_ID_PATTERN, 'Danh mục chính không hợp lệ')
    .required('Chọn danh mục chính')
    .test('selected-category', 'Danh mục chính phải nằm trong danh mục đã chọn', function (value) {
      return Boolean(value && (this.parent.categoryIds ?? []).includes(value));
    }),
  shortDescription: yup.string().trim().optional(),
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
  variants: yup
    .array()
    .of(yup.object({
      name: yup.string().trim().required('Nhập tên biến thể').max(255, 'Tối đa 255 ký tự'),
      barcode: yup.string().trim().max(64, 'Tối đa 64 ký tự').optional(),
      weightGrams: yup.number().integer('Khối lượng phải là số nguyên').min(0, 'Tối thiểu 0').optional(),
      lengthMm: yup.number().integer('Chiều dài phải là số nguyên').min(1, 'Tối thiểu 1 mm').optional(),
      widthMm: yup.number().integer('Chiều rộng phải là số nguyên').min(1, 'Tối thiểu 1 mm').optional(),
      heightMm: yup.number().integer('Chiều cao phải là số nguyên').min(1, 'Tối thiểu 1 mm').optional(),
      openingQuantity: yup.number()
        .integer('Số lượng phải là số nguyên')
        .min(0, 'Số lượng không được âm')
        .required('Nhập số lượng tồn đầu'),
      price: yup.string().trim().optional().test(
        'price-positive',
        'Giá phải là số lớn hơn 0',
        (value) => !value || (Number.isFinite(Number(value)) && Number(value) > 0),
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
  variants: [emptyVariant()],
};

export function ProductFormDrawer({
  open,
  onClose,
  onCreated,
  product,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (slug: string) => void;
  product?: ProductDetailDto;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const canAdjustStock = useCan('inventory.stock.adjust');
  const [brandSearch, setBrandSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [branchSearch, setBranchSearch] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [debouncedBrand] = useDebounce(brandSearch.trim(), 300);
  const [debouncedCategory] = useDebounce(categorySearch.trim(), 300);
  const [debouncedBranch] = useDebounce(branchSearch.trim(), 300);
  const [debouncedWarehouse] = useDebounce(warehouseSearch.trim(), 300);
  const openingStockIdempotencyKey = useRef(crypto.randomUUID());
  const submittedCreateValues = useRef<ProductFormValues | undefined>(undefined);
  const form = useForm<ProductFormValues>({ resolver: yupResolver(schema), defaultValues: defaults });
  const variantFields = useFieldArray({ control: form.control, name: 'variants' });
  const isEdit = Boolean(product);
  const [activeTab, setActiveTab] = useState<ProductFormTab>('basic');
  /**
   * Chế độ Sửa chỉ đổi thông tin mô tả: biến thể, giá và ảnh có màn riêng bên dưới với version của
   * chính chúng, nên hai tab đó không xuất hiện và bảng tóm tắt trước khi tạo cũng không còn nghĩa.
   */
  const visibleTabs: readonly ProductFormTab[] = isEdit
    ? ['basic', 'media']
    : PRODUCT_FORM_TABS;
  const previousTab = adjacentTab(activeTab, -1);
  const nextTabCandidate = adjacentTab(activeTab, 1);
  // Ở chế độ Sửa, tab cuối cùng nhìn thấy được là `media`, nên không dẫn người dùng sang tab ẩn.
  const nextTab = nextTabCandidate && visibleTabs.includes(nextTabCandidate) ? nextTabCandidate : undefined;
  const productType = form.watch('productType');
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

  const openingStock = useCreateStockAdjustment({
    request: { headers: { 'Idempotency-Key': openingStockIdempotencyKey.current } },
  });
  const createPrice = useCreateAdminProductPrice();
  const attachMedia = useAttachAdminProductMedia();
  const createProduct = useCreateAdminProduct({
    mutation: {
      onSuccess: async (createdProduct) => {
        // CONTRACT: dùng snapshot lúc submit để SKU/tồn đầu không lệch nếu response về chậm.
        const values = submittedCreateValues.current ?? form.getValues();
        let openingStockError: unknown;
        try {
          const items = toOpeningStockItems(values.variants, createdProduct);
          if (items.length > 0 && values.initialWarehouseCode) {
            await openingStock.mutateAsync({
              data: {
                warehouseCode: values.initialWarehouseCode,
                adjustmentType: StockAdjustmentType.OPENING_BALANCE,
                reasonCode: StockAdjustmentReason.INITIAL_STOCK,
                reason: `Khởi tạo tồn đầu khi tạo sản phẩm ${createdProduct.productNo}`,
                items,
              },
            });
          }
        } catch (error) {
          openingStockError = error;
        }

        // Giá và ảnh phải chạy SAU khi có sản phẩm: bản ghi giá gắn vào variantId, còn ảnh gắn
        // vào productId — cả hai ID chỉ tồn tại sau bước tạo. Lỗi ở đây không được làm hỏng sản
        // phẩm vừa tạo, nên gom lại báo cảnh báo thay vì ném ra ngoài.
        const followUpErrors: string[] = [];
        for (const command of toInitialPriceCommands(values.variants, createdProduct)) {
          try {
            await createPrice.mutateAsync({
              variantId: command.variantId,
              data: { amount: command.amount, startsAt: new Date().toISOString() },
            });
          } catch (error) {
            followUpErrors.push(`giá SKU: ${getApiErrorMessage(error)}`);
          }
        }
        // Ảnh gắn tuần tự vì mỗi lần gắn tăng version của Product; gắn song song thì lần thứ hai
        // trở đi sẽ trượt expectedProductVersion và rụng mất ảnh.
        // Mỗi lần gắn ảnh tăng version của Product đúng 1 (`claimProductVersion` ở Backend), nên
        // version cho lần gắn thứ n suy được mà không cần đọc lại sản phẩm. Lỗi giữa chừng thì dừng
        // hẳn: các lần sau chắc chắn trượt version và chỉ tạo thêm thông báo lỗi trùng lặp.
        for (const [index, image] of values.images.entries()) {
          try {
            await attachMedia.mutateAsync({
              id: createdProduct.id,
              data: {
                mediaAssetId: image.assetId,
                isPrimary: index === 0,
                expectedProductVersion: createdProduct.version + index,
              },
            });
          } catch (error) {
            followUpErrors.push(`ảnh ${index + 1}: ${getApiErrorMessage(error)}`);
            break;
          }
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListInventoryBalancesQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListStockAdjustmentsQueryKey() }),
        ]);
        if (followUpErrors.length > 0) {
          void message.warning(
            `Đã tạo sản phẩm nhưng chưa lưu được ${followUpErrors.join('; ')}`,
            8,
          );
        }
        if (openingStockError) {
          void message.warning(
            `Đã tạo sản phẩm nhưng chưa ghi được tồn đầu: ${getApiErrorMessage(openingStockError)}`,
            8,
          );
        } else {
          const stockMessage = hasOpeningStock ? ' và đã ghi tồn đầu' : '';
          void message.success(
            `Đã tạo sản phẩm cùng ${createdProduct.variants.length} biến thể${stockMessage}.`,
          );
        }
        form.reset(defaults);
        submittedCreateValues.current = undefined;
        onClose();
        onCreated?.(createdProduct.slug);
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
        await queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
        void message.success('Đã cập nhật thông tin sản phẩm.');
        onClose();
        onCreated?.(updated.slug);
      },
      onError: (error) => handleError(error, 'Không thể cập nhật sản phẩm.'),
    },
  });
  const mutationPending = createProduct.isPending || updateProduct.isPending || openingStock.isPending;

  function handleError(error: unknown, fallback: string) {
    Object.entries(getApiFieldErrors(error)).forEach(([field, fieldMessage]) => {
      if (
        field in schema.fields
        || /^variants\.\d+\.(name|barcode|weightGrams|lengthMm|widthMm|heightMm|openingQuantity)$/.test(field)
      ) {
        form.setError(field as FieldPath<ProductFormValues>, { message: fieldMessage });
      }
    });
    void message.error(getApiErrorMessage(error, fallback));
  }

  useEffect(() => {
    if (!open) return;
    openingStockIdempotencyKey.current = crypto.randomUUID();
    submittedCreateValues.current = undefined;
    form.reset(product ? toProductFormValues(product) : defaults);
  }, [form, open, product]);

  useEffect(() => {
    if (!open || isEdit || !initialBranchId) return;
    const options = warehouses.data?.items ?? [];
    const current = form.getValues('initialWarehouseCode');
    if (options.length === 1 && current !== options[0].code) {
      form.setValue('initialWarehouseCode', options[0].code, { shouldValidate: true });
    }
  }, [form, initialBranchId, isEdit, open, warehouses.data?.items]);

  /** Media và giá đổi ngoài form; đọc lại chi tiết để version gửi lần sau không còn cũ. */
  const refreshProduct = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetAdminProductQueryKey(product?.slug) }),
    ]);
  };

  /**
   * Validate theo từng tab trước khi submit.
   *
   * `handleSubmit` chỉ báo form không hợp lệ; nó không nói lỗi nằm ở tab nào. Không nhảy tới tab đó
   * thì người dùng bấm Tạo, không có gì xảy ra, và ô lỗi nằm ở tab họ không nhìn thấy.
   */
  const submitWithTabValidation = async () => {
    const result = await validateProductTabs(form);
    if (!result.isValid && result.errorTab) {
      setActiveTab(result.errorTab);
      void message.error(`Kiểm tra lại tab "${PRODUCT_TAB_LABELS[result.errorTab]}".`);
      return;
    }
    await submit();
  };

  const submit = form.handleSubmit((values) => {
    if (product) {
      updateProduct.mutate({
        id: product.id,
        data: toUpdateProductDto(values, product),
      });
    } else {
      submittedCreateValues.current = {
        ...values,
        categoryIds: [...values.categoryIds],
        variants: values.variants.map((variant) => ({ ...variant })),
      };
      createProduct.mutate({ data: toCreateProductDto(values) });
    }
  });


  return (
    <Drawer
      title={isEdit ? 'Sửa thông tin sản phẩm' : 'Tạo sản phẩm và biến thể'}
      width="100%"
      // Nền chìm để các khối trắng của form nổi lên thành từng nhóm rõ ràng.
      styles={{ wrapper: { maxWidth: 720 }, body: { background: 'var(--color-surface-sunken)' } }}
      push={false}
      open={open}
      onClose={() => { if (!mutationPending) onClose(); }}
      closable={!mutationPending}
      maskClosable={!mutationPending}
      keyboard={!mutationPending}
      destroyOnHidden
      footer={(
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">
            {isEdit
              ? 'Ảnh và giá lưu riêng ngay khi thao tác, không chờ nút Lưu.'
              : `Bước ${visibleTabs.indexOf(activeTab) + 1}/${visibleTabs.length} · ${PRODUCT_TAB_LABELS[activeTab]}`}
          </span>
          <div className="flex gap-2">
            <Button disabled={mutationPending} onClick={onClose}>
              Hủy
            </Button>
            {previousTab && (
              <Button disabled={mutationPending} onClick={() => setActiveTab(previousTab)}>
                Quay lại
              </Button>
            )}
            {nextTab ? (
              <Button type="primary" disabled={mutationPending} onClick={() => setActiveTab(nextTab)}>
                Tiếp tục
              </Button>
            ) : (
              /*
                Gọi thẳng `submitWithTabValidation()` thay vì nối nút với form bằng thuộc tính
                `form="product-form"`. Nút nằm ở footer của Drawer, tức là ngoài thẻ <form>; cách
                nối qua id phụ thuộc vào việc antd có chuyển `id` xuống DOM hay không, và khi không
                chuyển thì nút trông vẫn bình thường nhưng bấm không có gì xảy ra.
              */
              <Button
                type="primary"
                loading={mutationPending}
                onClick={() => void submitWithTabValidation()}
              >
                {isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
              </Button>
            )}
          </div>
        </div>
      )}
    >
      <Form
        id="product-form"
        layout="vertical"
        disabled={mutationPending}
        onFinish={() => void submitWithTabValidation()}
      >
        {/*
          Một form duy nhất trải qua nhiều tab, không phải bốn form rời: một `useForm`, một lần
          submit, một transaction ở Backend. Tab chỉ chia nhỏ phần nhìn — đổi tab không lưu gì cả,
          nên người nhập quay lại sửa được mọi lúc trước khi bấm Tạo.
        */}
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as ProductFormTab)}
          items={visibleTabs.map((tab) => ({
            key: tab,
            label: PRODUCT_TAB_LABELS[tab],
            children:
              tab === 'basic' ? (
                <ProductBasicInfoTab
                  form={form}
                  product={product}
                  brands={brands}
                  categories={categories}
                  onBrandSearch={setBrandSearch}
                  onCategorySearch={setCategorySearch}
                />
              ) : tab === 'media' ? (
                <ProductMediaTab form={form} isEdit={isEdit} disabled={mutationPending} />
              ) : tab === 'variants' ? (
                <ProductVariantsTab
                  form={form}
                  variantFields={variantFields}
                  productType={productType}
                  canAdjustStock={canAdjustStock}
                  initialBranchId={initialBranchId}
                  hasOpeningStock={hasOpeningStock}
                  branches={branches}
                  warehouses={warehouses}
                  onBranchSearch={setBranchSearch}
                  onWarehouseSearch={setWarehouseSearch}
                  isEdit={isEdit}
                />
              ) : (
                <ProductReviewTab
                  form={form}
                  brandLabel={brandLabel}
                  categoryLabels={categoryLabels}
                  branchLabel={branchLabel}
                />
              ),
          }))}
        />

        {/*
          Ở chế độ Sửa, ảnh và giá nằm ngay trong form thay vì bắt người dùng đóng form rồi đi tìm
          một drawer khác. Hai khối này ghi thẳng qua API riêng của chúng (media/price), không đi
          qua nút Lưu của form — mỗi thao tác có version và điều kiện hợp lệ của chính nó.
        */}
        {isEdit && product && (
          <>
            <Divider />
            <PermissionGate permission="catalog.product.manage">
              <Typography.Title level={5}>Ảnh sản phẩm và SKU</Typography.Title>
              <ProductMediaPanel product={product} onChanged={refreshProduct} />
            </PermissionGate>

            <Divider />
            <PermissionGate permission="catalog.price.view">
              <ProductPricePanel product={product} onChanged={refreshProduct} />
            </PermissionGate>
          </>
        )}
      </Form>
    </Drawer>
  );
}
