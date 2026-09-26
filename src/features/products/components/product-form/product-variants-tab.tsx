import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, InputNumber, Tag } from 'antd';
import { BarcodeOutlined } from '@ant-design/icons';
import { FormSection } from '@/foundation/layout/form-section';
import { Controller, type UseFieldArrayReturn, type UseFormReturn } from 'react-hook-form';
import { ProductType } from '@/generated/api/catalog/catalog.schemas';
import { MoneyInput } from '@/foundation/inputs/money-input';
import { emptyVariant, type ProductFormValues } from '../../model/product-form.mapper';

/**
 * Tab SKU & giá ở chế độ Tạo. Chế độ Sửa dùng `ProductVariantsManager` (SKU thật, lưu ngay).
 *
 * SKU nhập tay hoặc để Backend sinh; người nhập khai tên biến thể, kích thước và giá. Tồn đầu nằm ở tab
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
  return (
    <div className="space-y-4">
      <FormSection
        title="Biến thể bán hàng (SKU)"
        description="Khai báo màu sắc, kích thước hoặc phiên bản khách sẽ chọn khi mua. SKU bỏ trống thì hệ thống tự sinh."
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
          description="Sau khi tạo, khai báo thành phần cho từng SKU combo ở tab Combo; combo chỉ xuất bản được khi đã có thành phần."
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
              </span>
            }
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
                label="SKU (mã hàng)"
                extra="Mã cửa hàng đang dùng, ví dụ TD-02. Bỏ trống để hệ thống tự sinh; không sửa được sau khi tạo."
                validateStatus={form.formState.errors.variants?.[index]?.sku ? 'error' : undefined}
                help={form.formState.errors.variants?.[index]?.sku?.message}
              >
                <Controller
                  name={`variants.${index}.sku`}
                  control={form.control}
                  render={({ field }) => (
                    <Input {...field} placeholder="Bỏ trống để tự sinh" onChange={(event) => field.onChange(event.target.value.toUpperCase())} />
                  )}
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
              {/* Chỉ người có quyền giá mới thấy ô này: gửi giá mà thiếu quyền thì API từ chối cả lệnh tạo. */}
              {canManagePrice && (
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
      </FormSection>
    </div>
  );
}
