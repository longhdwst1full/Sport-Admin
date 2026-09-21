import { yupResolver } from '@hookform/resolvers/yup';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Divider, Drawer, Form, Input, InputNumber, Select, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, type FieldPath } from 'react-hook-form';
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
  CreateProductDtoProductType,
  type ProductDetailDto,
} from '@/generated/api/catalog/models';
import {
  getListInventoryBalancesQueryKey,
  getListInventoryMovementsQueryKey,
  getListStockAdjustmentsQueryKey,
  useCreateStockAdjustment,
} from '@/generated/api/inventory/inventory';
import {
  CreateStockAdjustmentDtoAdjustmentType,
  CreateStockAdjustmentDtoReasonCode,
} from '@/generated/api/inventory/models';
import {
  useSearchActiveAdminBranches,
  useSearchActiveAdminWarehouses,
} from '@/generated/api/organization/organization';
import { MoneyInput } from '@/foundation/inputs/money-input';
import { ProductImagePicker } from './product-image-picker';
import { RichTextEditor } from '@/foundation/inputs/rich-text-editor';
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
    .mixed<CreateProductDtoProductType>()
    .oneOf(Object.values(CreateProductDtoProductType))
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
  productType: CreateProductDtoProductType.STANDARD,
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
  const productType = form.watch('productType');
  const initialBranchId = form.watch('initialBranchId');
  const variants = form.watch('variants');
  const hasOpeningStock = variants.some(({ openingQuantity }) => openingQuantity > 0);
  const brands = useSearchActiveAdminBrands(
    { search: debouncedBrand || undefined, page: 1, limit: 20 },
    { query: { enabled: open } },
  );
  const categories = useSearchActiveAdminCategories(
    { search: debouncedCategory || undefined, page: 1, limit: 20 },
    { query: { enabled: open } },
  );
  const branches = useSearchActiveAdminBranches(
    { search: debouncedBranch || undefined, page: 1, limit: 50 },
    { query: { enabled: open && !isEdit && canAdjustStock } },
  );
  const warehouses = useSearchActiveAdminWarehouses(
    {
      branchId: initialBranchId,
      search: debouncedWarehouse || undefined,
      page: 1,
      limit: 50,
    },
    { query: { enabled: open && !isEdit && canAdjustStock && Boolean(initialBranchId) } },
  );
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
                adjustmentType: CreateStockAdjustmentDtoAdjustmentType.OPENING_BALANCE,
                reasonCode: CreateStockAdjustmentDtoReasonCode.INITIAL_STOCK,
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

  const textField = (name: 'name', label: string) => (
    <Form.Item label={label} required validateStatus={form.formState.errors[name] ? 'error' : undefined} help={form.formState.errors[name]?.message}>
      <Controller name={name} control={form.control} render={({ field }) => <Input {...field} />} />
    </Form.Item>
  );

  return (
    <Drawer
      title={isEdit ? 'Sửa thông tin sản phẩm' : 'Tạo sản phẩm và biến thể'}
      width="100%"
      styles={{ wrapper: { maxWidth: 720 } }}
      push={false}
      open={open}
      onClose={() => { if (!mutationPending) onClose(); }}
      closable={!mutationPending}
      maskClosable={!mutationPending}
      keyboard={!mutationPending}
      destroyOnHidden
      footer={(
        <div className="flex justify-end gap-2">
          <Button disabled={mutationPending} onClick={onClose}>
            Hủy
          </Button>
          {/*
            Gọi thẳng `submit()` thay vì nối nút với form bằng thuộc tính `form="product-form"`.
            Nút nằm ở footer của Drawer, tức là ngoài thẻ <form>; cách nối qua id phụ thuộc vào
            việc antd có chuyển `id` xuống DOM hay không, và khi không chuyển thì nút trông vẫn
            bình thường nhưng bấm không có gì xảy ra.
          */}
          <Button
            type="primary"
            loading={mutationPending}
            onClick={() => void submit()}
          >
            {isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
          </Button>
        </div>
      )}
    >
      <Form
        id="product-form"
        layout="vertical"
        disabled={mutationPending}
        onFinish={() => void submit()}
      >
        <Typography.Title level={5}>Thông tin sản phẩm</Typography.Title>
        <Form.Item
          label="Loại sản phẩm"
          required
          validateStatus={form.formState.errors.productType ? 'error' : undefined}
          help={form.formState.errors.productType?.message}
          extra="STANDARD là sản phẩm thường; BUNDLE là combo cố định và mỗi SKU combo phải khai báo thành phần trước khi publish."
        >
          <Controller
            name="productType"
            control={form.control}
            render={({ field }) => (
              <Select
                {...field}
                disabled={Boolean(product?.variants.length)}
                options={[
                  { value: CreateProductDtoProductType.STANDARD, label: 'Sản phẩm thường' },
                  { value: CreateProductDtoProductType.BUNDLE, label: 'Combo cố định' },
                ]}
                onChange={(value) => {
                  field.onChange(value);
                  if (value === CreateProductDtoProductType.BUNDLE) {
                    variantFields.fields.forEach((_, index) => {
                      form.setValue(`variants.${index}.openingQuantity`, 0);
                    });
                    form.setValue('initialBranchId', undefined);
                    form.setValue('initialWarehouseCode', undefined);
                  }
                }}
              />
            )}
          />
        </Form.Item>
        {textField('name', 'Tên sản phẩm')}
        <div className="grid gap-4 sm:grid-cols-2">
          <Form.Item label="Thương hiệu" validateStatus={form.formState.errors.brandId ? 'error' : undefined} help={form.formState.errors.brandId?.message}>
            <Controller
              name="brandId"
              control={form.control}
              render={({ field }) => (
                <Select
                  {...field}
                  allowClear
                  showSearch
                  filterOption={false}
                  onSearch={setBrandSearch}
                  loading={brands.isFetching}
                  options={[
                    ...(product?.brandId && product.brand
                      ? [{ value: product.brandId, label: product.brand }]
                      : []),
                    ...(brands.data?.items ?? []).map((item) => ({ value: item.id, label: `${item.code} — ${item.label}` })),
                  ].filter((item, index, items) => items.findIndex(({ value }) => value === item.value) === index)}
                />
              )}
            />
          </Form.Item>
          <Form.Item label="Danh mục" required validateStatus={form.formState.errors.categoryIds ? 'error' : undefined} help={form.formState.errors.categoryIds?.message}>
            <Controller
              name="categoryIds"
              control={form.control}
              render={({ field }) => (
                <Select
                  {...field}
                  mode="multiple"
                  showSearch
                  filterOption={false}
                  onSearch={setCategorySearch}
                  loading={categories.isFetching}
                  options={[
                    ...(product?.categories ?? []).map((category) => ({ value: category.id, label: category.name })),
                    ...(categories.data?.items ?? []).map((item) => ({ value: item.id, label: `${item.code} — ${item.label}` })),
                  ].filter((item, index, items) => items.findIndex(({ value }) => value === item.value) === index)}
                />
              )}
            />
          </Form.Item>
        </div>
        <Form.Item
          label="Danh mục chính"
          required
          validateStatus={form.formState.errors.primaryCategoryId ? 'error' : undefined}
          help={form.formState.errors.primaryCategoryId?.message}
        >
          <Controller
            name="primaryCategoryId"
            control={form.control}
            render={({ field }) => (
              <Select
                {...field}
                options={form.watch('categoryIds').map((categoryId) => ({
                  value: categoryId,
                  label: product?.categories.find(({ id }) => id === categoryId)?.name
                    ?? categories.data?.items.find(({ id }) => id === categoryId)?.label
                    ?? categoryId,
                }))}
                placeholder="Chọn trong danh mục đã gán"
              />
            )}
          />
        </Form.Item>
        {!isEdit && (
          <Form.Item
            label="Ảnh sản phẩm"
            extra="Tải nhiều ảnh ngay tại đây; ảnh đầu danh sách là ảnh chính. Ảnh được gắn vào sản phẩm sau khi tạo."
          >
            <Controller
              name="images"
              control={form.control}
              render={({ field }) => (
                <ProductImagePicker
                  value={field.value ?? []}
                  disabled={mutationPending}
                  onChange={field.onChange}
                />
              )}
            />
          </Form.Item>
        )}

        <Form.Item label="Mô tả ngắn">
          <Controller name="shortDescription" control={form.control} render={({ field }) => <Input {...field} />} />
        </Form.Item>
        <Form.Item
          label="Mô tả chi tiết"
        >
          <Controller
            name="description"
            control={form.control}
            render={({ field }) => (
              <RichTextEditor
                value={field.value}
                onChange={field.onChange}
                placeholder="Nhập mô tả, thông số và hướng dẫn sử dụng sản phẩm..."
              />
            )}
          />
        </Form.Item>
        {!isEdit && (
          <>
            <Divider />
            <div className="mb-4">
              <Typography.Title level={5} className="!mb-1">Biến thể bán hàng (SKU)</Typography.Title>
              <Typography.Text type="secondary">
                SKU được Backend tự sinh. Khai báo màu sắc, kích thước hoặc phiên bản khách hàng sẽ chọn khi mua.
              </Typography.Text>
            </div>
            <Alert
              className="mb-4"
              type="info"
              showIcon
              message="Sản phẩm và toàn bộ biến thể được lưu cùng một lần"
              description="Nếu một biến thể không hợp lệ, hệ thống sẽ không tạo dữ liệu sản phẩm dở dang. Giá và ảnh có thể cấu hình sau khi lưu."
            />
            {productType === CreateProductDtoProductType.STANDARD && canAdjustStock && (
              <Card size="small" className="mb-4" title="Tồn đầu theo chi nhánh / kho">
                <Alert
                  className="mb-4"
                  type="info"
                  showIcon
                  message="Sản phẩm dùng chung toàn hệ thống; số lượng được quản lý riêng theo từng kho"
                  description="V1 có đúng một kho cho mỗi chi nhánh. Chọn chi nhánh, hệ thống tự chọn kho tương ứng; nhập số lượng cho từng SKU bên dưới. Để 0 nếu chưa nhập hàng."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Form.Item
                    label="Chi nhánh nhập tồn đầu"
                    required={hasOpeningStock}
                    validateStatus={form.formState.errors.initialBranchId ? 'error' : undefined}
                    help={form.formState.errors.initialBranchId?.message}
                  >
                    <Controller
                      name="initialBranchId"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          allowClear
                          showSearch
                          filterOption={false}
                          onSearch={setBranchSearch}
                          loading={branches.isFetching}
                          placeholder="Chọn chi nhánh"
                          options={(branches.data?.items ?? []).map((item) => ({
                            value: item.id,
                            label: `${item.code} — ${item.label}`,
                          }))}
                          onChange={(value) => {
                            field.onChange(value);
                            form.setValue('initialWarehouseCode', undefined, { shouldValidate: true });
                          }}
                        />
                      )}
                    />
                  </Form.Item>
                  <Form.Item
                    label="Kho nhập tồn đầu"
                    required={hasOpeningStock}
                    validateStatus={form.formState.errors.initialWarehouseCode ? 'error' : undefined}
                    help={form.formState.errors.initialWarehouseCode?.message}
                  >
                    <Controller
                      name="initialWarehouseCode"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          allowClear
                          showSearch
                          filterOption={false}
                          disabled={!initialBranchId}
                          onSearch={setWarehouseSearch}
                          loading={warehouses.isFetching}
                          placeholder={initialBranchId ? 'Chọn kho' : 'Chọn chi nhánh trước'}
                          options={(warehouses.data?.items ?? []).map((item) => ({
                            value: item.code,
                            label: `${item.code} — ${item.label}`,
                          }))}
                        />
                      )}
                    />
                  </Form.Item>
                </div>
              </Card>
            )}
            {productType === CreateProductDtoProductType.STANDARD && !canAdjustStock && (
              <Alert
                className="mb-4"
                type="warning"
                showIcon
                message="Tài khoản chưa có quyền nhập tồn kho"
                description="Sản phẩm và SKU vẫn được tạo. Người có quyền inventory.stock.adjust có thể nhập tồn tại màn Tồn kho."
              />
            )}
            {productType === CreateProductDtoProductType.BUNDLE && (
              <Alert
                className="mb-4"
                type="info"
                showIcon
                message="Combo không có tồn vật lý riêng"
                description="Tồn bán được của combo được tính từ các SKU thành phần sau khi cấu hình combo."
              />
            )}
            <div className="space-y-4">
              {variantFields.fields.map((variant, index) => (
                <Card
                  key={variant.id}
                  size="small"
                  title={`Biến thể ${index + 1}`}
                  extra={(
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={`Xóa biến thể ${index + 1}`}
                      disabled={variantFields.fields.length === 1}
                      onClick={() => variantFields.remove(index)}
                    />
                  )}
                >
                  <div className="grid gap-x-4 md:grid-cols-2 xl:grid-cols-3">
                    <Form.Item label="SKU" extra="Tự sinh sau khi lưu và không thể thay đổi.">
                      <Input value="Tự động" disabled />
                    </Form.Item>
                    <Form.Item
                      label="Tên biến thể"
                      required
                      validateStatus={form.formState.errors.variants?.[index]?.name ? 'error' : undefined}
                      help={form.formState.errors.variants?.[index]?.name?.message}
                    >
                      <Controller
                        name={`variants.${index}.name`}
                        control={form.control}
                        render={({ field }) => <Input {...field} placeholder="Ví dụ: Đen - Size 40" />}
                      />
                    </Form.Item>
                    <Form.Item
                      label="Barcode"
                      validateStatus={form.formState.errors.variants?.[index]?.barcode ? 'error' : undefined}
                      help={form.formState.errors.variants?.[index]?.barcode?.message}
                    >
                      <Controller
                        name={`variants.${index}.barcode`}
                        control={form.control}
                        render={({ field }) => <Input {...field} placeholder="Không bắt buộc" />}
                      />
                    </Form.Item>
                    {([
                      ['weightGrams', 'Khối lượng (g)', 0],
                      ['lengthMm', 'Dài (mm)', 1],
                      ['widthMm', 'Rộng (mm)', 1],
                      ['heightMm', 'Cao (mm)', 1],
                    ] as const).map(([fieldName, label, min]) => {
                      const error = form.formState.errors.variants?.[index]?.[fieldName];
                      return (
                        <Form.Item
                          key={fieldName}
                          label={label}
                          validateStatus={error ? 'error' : undefined}
                          help={error?.message}
                        >
                          <Controller
                            name={`variants.${index}.${fieldName}`}
                            control={form.control}
                            render={({ field }) => (
                              <InputNumber
                                className="!w-full"
                                min={min}
                                precision={0}
                                value={field.value}
                                onBlur={field.onBlur}
                                onChange={(value) => field.onChange(value ?? undefined)}
                              />
                            )}
                          />
                        </Form.Item>
                      );
                    })}
                    {!isEdit && (
                      <Form.Item
                        label="Giá bán (đã gồm VAT)"
                        extra="Bỏ trống nếu chưa chốt giá; sản phẩm chỉ xuất bản được khi SKU đã có giá."
                        validateStatus={form.formState.errors.variants?.[index]?.price ? 'error' : undefined}
                        help={form.formState.errors.variants?.[index]?.price?.message}
                      >
                        <Controller
                          name={`variants.${index}.price`}
                          control={form.control}
                          render={({ field }) => (
                            <MoneyInput
                              className="!w-full"
                              value={field.value ? Number(field.value) : undefined}
                              onBlur={field.onBlur}
                              onChange={(value) => field.onChange(value ? String(value) : '')}
                            />
                          )}
                        />
                      </Form.Item>
                    )}
                    {productType === CreateProductDtoProductType.STANDARD && canAdjustStock && (
                      <Form.Item
                        label="Số lượng tồn đầu"
                        required
                        extra="Nhập 0 nếu chưa có hàng tại kho đã chọn."
                        validateStatus={form.formState.errors.variants?.[index]?.openingQuantity ? 'error' : undefined}
                        help={form.formState.errors.variants?.[index]?.openingQuantity?.message}
                      >
                        <Controller
                          name={`variants.${index}.openingQuantity`}
                          control={form.control}
                          render={({ field }) => (
                            <InputNumber
                              className="!w-full"
                              min={0}
                              precision={0}
                              value={field.value}
                              onBlur={field.onBlur}
                              onChange={(value) => field.onChange(value ?? 0)}
                            />
                          )}
                        />
                      </Form.Item>
                    )}
                  </div>
                </Card>
              ))}
            </div>
            <Button
              className="mt-4"
              type="dashed"
              block
              icon={<PlusOutlined />}
              disabled={variantFields.fields.length >= 50}
              onClick={() => variantFields.append(emptyVariant())}
            >
              Thêm biến thể
            </Button>
          </>
        )}

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
