import { BarcodeOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Input, Tag } from 'antd';
import { Controller, type UseFieldArrayReturn, type UseFormReturn } from 'react-hook-form';
import { MoneyInput } from '@/foundation/inputs/money-input';
import { FormSection } from '@/foundation/layout/form-section';
import { ProductType } from '@/generated/api/catalog/catalog.schemas';
import { AUTO_GENERATED_CODE_HINT, VARIANT_DIMENSION_FIELDS } from '../../constants/product-list.constants';
import { emptyVariant, type ProductFormValues } from '../../model/product-form.mapper';
import { FieldItem, VariantNumberInput } from './form-field-parts';

/** CONTRACT: cùng giới hạn `variants.max(50)` của schema tạo sản phẩm. */
const MAX_VARIANTS = 50;

/**
 * Khối SKU & giá (tab "SKU, giá & tồn kho") ở chế độ Tạo. Chế độ Sửa dùng `ProductVariantsManager` (SKU thật, lưu ngay).
 *
 * SKU và barcode do Backend sinh (không có ô nhập); người nhập khai tên biến thể, kích thước và giá. Tồn đầu nằm ở tab
 * Tồn kho.
 */
export function ProductVariantsTab({
  form,
  variantFields,
  productType,
  canManagePrice,
}: {
  form: UseFormReturn<ProductFormValues>;
  variantFields: UseFieldArrayReturn<ProductFormValues, 'variants'>;
  productType: ProductType;
  /** `catalog.price.manage`: giá ban đầu gửi kèm lệnh tạo sản phẩm. */
  canManagePrice: boolean;
}) {
  const errors = form.formState.errors.variants;
  return (
    <FormSection
      title="Biến thể bán hàng (SKU)"
      description="Khai báo màu sắc, kích thước hoặc phiên bản khách sẽ chọn khi mua. SKU và barcode do hệ thống tự sinh khi lưu."
      icon={<BarcodeOutlined />}
      extra={<Tag color="blue">{variantFields.fields.length} biến thể</Tag>}
    >
      <Alert
        className="mb-4"
        type="info"
        showIcon
        message="Sản phẩm và toàn bộ biến thể được lưu cùng một lần"
        description="Sản phẩm, biến thể, giá, ảnh và thông số được lưu trong một lần; một biến thể không hợp lệ thì không tạo gì cả. Sau khi tạo, thêm/sửa biến thể và lịch giá ở cùng tab này."
      />
      {productType === ProductType.BUNDLE && (
        <Alert
          className="mb-4"
          type="info"
          showIcon
          message="Combo không có tồn vật lý riêng"
          description="Sau khi tạo, khai báo thành phần cho từng SKU combo ở mục Combo cùng tab; combo chỉ xuất bản được khi đã có thành phần."
        />
      )}
      <div className="space-y-4">
        {variantFields.fields.map((variant, index) => (
          <Card
            key={variant.id}
            size="small"
            className="!rounded-xl !border-slate-200 transition hover:!border-emerald-300"
            title={
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="grid size-6 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  {index + 1}
                </span>
                Biến thể {index + 1}
                <span className="text-xs font-normal text-slate-400">· SKU, barcode: {AUTO_GENERATED_CODE_HINT}</span>
              </span>
            }
            extra={(
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                aria-label={`Xoá biến thể ${index + 1}`}
                disabled={variantFields.fields.length === 1}
                onClick={() => variantFields.remove(index)}
              />
            )}
          >
            <div className="grid gap-x-4 md:grid-cols-2 xl:grid-cols-3">
              <FieldItem label="Tên biến thể" required error={errors?.[index]?.name}>
                <Controller
                  name={`variants.${index}.name`}
                  control={form.control}
                  render={({ field }) => <Input {...field} maxLength={255} placeholder="Ví dụ: Đen - Size 40" />}
                />
              </FieldItem>
              {VARIANT_DIMENSION_FIELDS.map(([fieldName, label, min]) => (
                <FieldItem key={fieldName} label={label} error={errors?.[index]?.[fieldName]}>
                  <Controller
                    name={`variants.${index}.${fieldName}`}
                    control={form.control}
                    render={({ field }) => (
                      <VariantNumberInput min={min} value={field.value} onBlur={field.onBlur} onChange={field.onChange} />
                    )}
                  />
                </FieldItem>
              ))}
              {/* Chỉ người có quyền giá mới thấy ô này: gửi giá mà thiếu quyền thì API từ chối cả lệnh tạo. */}
              {canManagePrice && (
                <FieldItem
                  label="Giá bán (đã gồm VAT)"
                  extra="Bỏ trống nếu chưa chốt giá; sản phẩm chỉ xuất bản được khi SKU đã có giá."
                  error={errors?.[index]?.price}
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
                </FieldItem>
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
        disabled={variantFields.fields.length >= MAX_VARIANTS}
        onClick={() => variantFields.append(emptyVariant())}
      >
        Thêm biến thể
      </Button>
    </FormSection>
  );
}
