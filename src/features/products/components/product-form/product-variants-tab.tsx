import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, InputNumber, Select, Tag } from 'antd';
import { BarcodeOutlined, InboxOutlined } from '@ant-design/icons';
import { FormSection } from '@/foundation/layout/form-section';
import { Controller, type UseFieldArrayReturn, type UseFormReturn } from 'react-hook-form';
import { ProductType } from '@/generated/api/catalog/models';
import { MoneyInput } from '@/foundation/inputs/money-input';
import { emptyVariant, type ProductFormValues } from '../../model/product-form.mapper';
import type { SearchOptionsQuery } from './types';

/**
 * Tab 3 — biến thể bán hàng.
 *
 * SKU do Backend sinh; người nhập chỉ khai tên biến thể, kích thước và giá. Tồn đầu kỳ là **tuỳ
 * chọn**: nhập kho là nghiệp vụ riêng của Inventory, nhưng giữ ở đây vì hàng nhập lần đầu thường
 * được đếm ngay lúc tạo sản phẩm, và bỏ đi thì mọi sản phẩm mới đều phải qua thêm một màn nữa.
 */
export function ProductVariantsTab({
  form,
  variantFields,
  productType,
  canAdjustStock,
  canManagePrice,
  initialBranchId,
  hasOpeningStock,
  branches,
  warehouses,
  onBranchSearch,
  onWarehouseSearch,
  isEdit,
}: {
  form: UseFormReturn<ProductFormValues>;
  variantFields: UseFieldArrayReturn<ProductFormValues, 'variants'>;
  productType: ProductType;
  canAdjustStock: boolean;
  /** `catalog.price.manage`: giá ban đầu gửi kèm lệnh tạo sản phẩm. */
  canManagePrice: boolean;
  initialBranchId?: string;
  hasOpeningStock: boolean;
  branches: SearchOptionsQuery;
  warehouses: { isFetching: boolean; data?: { items: Array<{ code: string; label: string }> } };
  onBranchSearch: (value: string) => void;
  onWarehouseSearch: (value: string) => void;
  isEdit: boolean;
}) {
  const setBranchSearch = onBranchSearch;
  const setWarehouseSearch = onWarehouseSearch;
  return (
    <div className="space-y-4">
      <FormSection
        title="Biến thể bán hàng (SKU)"
        description="SKU do hệ thống tự sinh. Khai báo màu sắc, kích thước hoặc phiên bản khách sẽ chọn khi mua."
        icon={<BarcodeOutlined />}
        extra={<Tag color="blue">{variantFields.fields.length} biến thể</Tag>}
      >
      <Alert
        className="mb-4"
        type="info"
        showIcon
        message="Sản phẩm và toàn bộ biến thể được lưu cùng một lần"
        description="Nếu một biến thể không hợp lệ, hệ thống sẽ không tạo dữ liệu sản phẩm dở dang. Giá và ảnh có thể cấu hình sau khi lưu."
      />
      {productType === ProductType.STANDARD && canAdjustStock && (
        <Card
          size="small"
          className="mb-4 !rounded-xl !border-slate-200"
          title={
            <span className="flex items-center gap-2 text-sm font-semibold">
              <InboxOutlined className="text-slate-400" />
              Tồn đầu theo chi nhánh / kho
            </span>
          }
        >
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
      {productType === ProductType.STANDARD && !canAdjustStock && (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          message="Tài khoản chưa có quyền nhập tồn kho"
          description="Sản phẩm và SKU vẫn được tạo. Người có quyền inventory.stock.adjust có thể nhập tồn tại màn Tồn kho."
        />
      )}
      {productType === ProductType.BUNDLE && (
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
              {!isEdit && (
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
              )}
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
              {!isEdit && canManagePrice && (
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
              {productType === ProductType.STANDARD && canAdjustStock && (
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
      </FormSection>
    </div>
  );
}
