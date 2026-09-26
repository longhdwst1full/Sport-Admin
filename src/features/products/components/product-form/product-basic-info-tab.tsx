import { AppstoreOutlined, FileTextOutlined, TagsOutlined } from '@ant-design/icons';
import { Form, Input, Select, Typography } from 'antd';
import { FormSection } from '@/foundation/layout/form-section';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { RichTextEditor } from '@/foundation/inputs/rich-text-editor';
import { ProductType, type ProductDetailDto } from '@/generated/api/catalog/catalog.schemas';
import type { ProductFormValues } from '../../model/product-form.mapper';
import type { SearchOptionsQuery } from './types';

/**
 * Tab Thông tin — định danh, phân loại và mô tả; lưu cùng nút chính ở cả Tạo và Sửa.
 *
 * Mã sản phẩm và slug đường dẫn do Backend sinh từ tên, nên không có ô nhập ở đây: hai nguồn sự
 * thật cho cùng một thứ sẽ lệch nhau ngay lần sửa tên đầu tiên.
 */
export function ProductBasicInfoTab({
  form,
  product,
  brands,
  categories,
  onBrandSearch,
  onCategorySearch,
}: {
  form: UseFormReturn<ProductFormValues>;
  product?: ProductDetailDto;
  brands: SearchOptionsQuery;
  categories: SearchOptionsQuery;
  onBrandSearch: (value: string) => void;
  onCategorySearch: (value: string) => void;
}) {
  const setBrandSearch = onBrandSearch;
  const setCategorySearch = onCategorySearch;
  return (
    <div className="space-y-4">
      <FormSection
        title="Định danh sản phẩm"
        description="Tên hiển thị cho khách và loại sản phẩm. Mã sản phẩm cùng đường dẫn do hệ thống tự sinh từ tên."
        icon={<AppstoreOutlined />}
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
            { value: ProductType.STANDARD, label: 'Sản phẩm thường' },
            { value: ProductType.BUNDLE, label: 'Combo cố định' },
          ]}
          onChange={(value) => {
            field.onChange(value);
            if (value === ProductType.BUNDLE) {
              // Combo không có tồn vật lý riêng: tồn bán được tính từ SKU thành phần.
              form.getValues('variants').forEach((_variant, index) => {
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
      <Form.Item
        label="Tên sản phẩm"
        required
        validateStatus={form.formState.errors.name ? 'error' : undefined}
        help={form.formState.errors.name?.message}
      >
        <Controller
          name="name"
          control={form.control}
          render={({ field }) => <Input {...field} placeholder="Ví dụ: Máy chạy bộ Kingsport X900" />}
        />
      </Form.Item>
      </FormSection>

      <FormSection
        title="Phân loại"
        description="Thương hiệu và danh mục quyết định sản phẩm xuất hiện ở đâu ngoài cửa hàng."
        icon={<TagsOutlined />}
      >
        <div className="grid gap-x-4 sm:grid-cols-2">
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
      </FormSection>

      <FormSection
        title="Mô tả"
        description="Mô tả ngắn hiện ở thẻ sản phẩm; mô tả chi tiết hiện trong trang sản phẩm."
        icon={<FileTextOutlined />}
      >
        <Form.Item
          label="Mô tả ngắn"
          validateStatus={form.formState.errors.shortDescription ? 'error' : undefined}
          help={form.formState.errors.shortDescription?.message}
        >
    <Controller
      name="shortDescription"
      control={form.control}
      render={({ field }) => <Input.TextArea {...field} rows={2} maxLength={1000} showCount />}
    />
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
      </FormSection>
    </div>
  );
}
