import { AppstoreOutlined, FileTextOutlined } from '@ant-design/icons';
import { Input, Select } from 'antd';
import { useMemo } from 'react';
import { FormSection } from '@/foundation/layout/form-section';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { RichTextEditor } from '@/foundation/inputs/rich-text-editor';
import { ProductType, type ProductDetailDto } from '@/generated/api/catalog/catalog.schemas';
import { PRODUCT_TYPE_OPTIONS } from '../../constants/product-list.constants';
import type { ProductFormValues } from '../../model/product-form.mapper';
import { toLookupOptions } from '../../model/product-lookup-options';
import { FieldItem } from './form-field-parts';
import type { SearchOptionsQuery } from './types';

/**
 * Khối Thông tin cơ bản của tab Thông tin — định danh, phân loại và mô tả; lưu cùng nút chính ở cả Tạo và Sửa.
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
  const brandOptions = useMemo(
    () =>
      toLookupOptions(
        brands.data?.items,
        (item) => item.id,
        product?.brandId && product.brand ? [{ value: product.brandId, label: product.brand }] : [],
      ),
    [brands.data?.items, product?.brand, product?.brandId],
  );
  const categoryOptions = useMemo(
    () =>
      toLookupOptions(
        categories.data?.items,
        (item) => item.id,
        (product?.categories ?? []).map((category) => ({ value: category.id, label: category.name })),
      ),
    [categories.data?.items, product?.categories],
  );
  const categoryIds = form.watch('categoryIds');
  // Danh mục chính chọn trong các danh mục đã gán; nhãn lấy từ sản phẩm/kết quả tìm, thiếu thì hiện id.
  const primaryCategoryOptions = useMemo(
    () =>
      categoryIds.map((categoryId) => ({
        value: categoryId,
        label:
          product?.categories.find(({ id }) => id === categoryId)?.name
          ?? categories.data?.items.find(({ id }) => id === categoryId)?.label
          ?? categoryId,
      })),
    [categories.data?.items, categoryIds, product?.categories],
  );
  const errors = form.formState.errors;
  return (
    <div className="space-y-4">
      {/* Định danh + phân loại gộp một khối, lưới 3 cột trên màn rộng để ô ngắn không chiếm cả dòng. */}
      <FormSection
        title="Thông tin chung"
        description="Tên, loại và phân loại quyết định sản phẩm xuất hiện ở đâu ngoài cửa hàng. Mã sản phẩm cùng đường dẫn do hệ thống tự sinh từ tên."
        icon={<AppstoreOutlined />}
      >
        <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
          <FieldItem label="Tên sản phẩm" required error={errors.name} className="sm:col-span-2">
            <Controller
              name="name"
              control={form.control}
              render={({ field }) => <Input {...field} maxLength={255} placeholder="Ví dụ: Máy chạy bộ Kingsport X900" />}
            />
          </FieldItem>
          <FieldItem
            label="Loại sản phẩm"
            required
            error={errors.productType}
            tooltip="Sản phẩm thường bán theo từng SKU; combo cố định gồm nhiều SKU thành phần, mỗi SKU combo phải khai báo thành phần trước khi xuất bản."
          >
            <Controller
              name="productType"
              control={form.control}
              render={({ field }) => (
                <Select
                  {...field}
                  disabled={Boolean(product?.variants.length)}
                  options={PRODUCT_TYPE_OPTIONS}
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
          </FieldItem>
          <FieldItem label="Thương hiệu" error={errors.brandId}>
            <Controller
              name="brandId"
              control={form.control}
              render={({ field }) => (
                <Select
                  {...field}
                  allowClear
                  showSearch
                  filterOption={false}
                  onSearch={onBrandSearch}
                  loading={brands.isFetching}
                  options={brandOptions}
                />
              )}
            />
          </FieldItem>
          <FieldItem label="Danh mục" required error={errors.categoryIds}>
            <Controller
              name="categoryIds"
              control={form.control}
              render={({ field }) => (
                <Select
                  {...field}
                  mode="multiple"
                  // Giữ ô một dòng; phần dư gộp thành "+N" thay vì đẩy lưới cao lên.
                  maxTagCount="responsive"
                  showSearch
                  filterOption={false}
                  onSearch={onCategorySearch}
                  loading={categories.isFetching}
                  options={categoryOptions}
                />
              )}
            />
          </FieldItem>
          <FieldItem label="Danh mục chính" required error={errors.primaryCategoryId}>
            <Controller
              name="primaryCategoryId"
              control={form.control}
              render={({ field }) => (
                <Select {...field} options={primaryCategoryOptions} placeholder="Chọn trong danh mục đã gán" />
              )}
            />
          </FieldItem>
        </div>
      </FormSection>

      <FormSection
        title="Mô tả"
        description="Mô tả ngắn hiện ở thẻ sản phẩm; mô tả chi tiết hiện trong trang sản phẩm."
        icon={<FileTextOutlined />}
      >
        <FieldItem label="Mô tả ngắn" error={errors.shortDescription}>
          <Controller
            name="shortDescription"
            control={form.control}
            render={({ field }) => <Input.TextArea {...field} autoSize={{ minRows: 2, maxRows: 4 }} maxLength={1000} showCount />}
          />
        </FieldItem>
        <FieldItem label="Mô tả chi tiết" error={errors.description}>
          <Controller
            name="description"
            control={form.control}
            render={({ field }) => (
              <RichTextEditor
                value={field.value}
                onChange={field.onChange}
                height={260}
                placeholder="Nhập mô tả, thông số và hướng dẫn sử dụng sản phẩm..."
              />
            )}
          />
        </FieldItem>
      </FormSection>
    </div>
  );
}
