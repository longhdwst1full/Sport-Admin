import { InboxOutlined } from '@ant-design/icons';
import { Alert, Form, InputNumber, Select } from 'antd';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { FormSection } from '@/foundation/layout/form-section';
import { ProductType } from '@/generated/api/catalog/catalog.schemas';
import type { ProductFormValues } from '../../model/product-form.mapper';
import type { SearchOptionsQuery } from './types';

/**
 * Tab Tồn kho ở chế độ Tạo — tồn đầu theo chi nhánh/kho, **tuỳ chọn**.
 *
 * Nhập kho là nghiệp vụ của Inventory nên không nằm trong transaction tạo sản phẩm: sau khi tạo xong,
 * workspace gửi một phiếu `OPENING_BALANCE` có `Idempotency-Key`. Phiếu lỗi thì sản phẩm vẫn còn và
 * tab Tồn kho của màn Sửa có nút ghi lại với cùng khoá.
 */
export function ProductOpeningStockTab({
  form,
  productType,
  canAdjustStock,
  initialBranchId,
  hasOpeningStock,
  branches,
  warehouses,
  onBranchSearch,
  onWarehouseSearch,
}: {
  form: UseFormReturn<ProductFormValues>;
  productType: ProductType;
  canAdjustStock: boolean;
  initialBranchId?: string;
  hasOpeningStock: boolean;
  branches: SearchOptionsQuery;
  warehouses: { isFetching: boolean; data?: { items: Array<{ code: string; label: string }> } };
  onBranchSearch: (value: string) => void;
  onWarehouseSearch: (value: string) => void;
}) {
  const variants = form.watch('variants');

  if (productType === ProductType.BUNDLE) {
    return (
      <Alert
        type="info"
        showIcon
        message="Combo không có tồn vật lý riêng"
        description="Tồn bán được của combo tính từ SKU thành phần; không nhập tồn đầu cho combo."
      />
    );
  }
  if (!canAdjustStock) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Tài khoản chưa có quyền nhập tồn kho"
        description="Sản phẩm và SKU vẫn được tạo. Người có quyền inventory.stock.adjust có thể nhập tồn tại màn Tồn kho."
      />
    );
  }

  return (
    <FormSection
      title="Tồn đầu theo chi nhánh / kho"
      description="Sản phẩm dùng chung toàn hệ thống; số lượng quản lý riêng theo từng kho. V1 mỗi chi nhánh có đúng một kho. Để 0 nếu chưa nhập hàng."
      icon={<InboxOutlined />}
    >
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
                onSearch={onBranchSearch}
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
                onSearch={onWarehouseSearch}
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

      <div className="space-y-2">
        {variants.map((variant, index) => {
          const error = form.formState.errors.variants?.[index]?.openingQuantity;
          return (
            <div key={index} className="grid items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_180px]">
              <div className="pt-1 text-sm">
                <div className="font-medium text-slate-700">{variant.name?.trim() || `Biến thể ${index + 1}`}</div>
                <div className="text-xs text-slate-500">{variant.sku?.trim() || 'SKU tự sinh'}</div>
              </div>
              <Form.Item
                label="Số lượng tồn đầu"
                style={{ marginBottom: 0 }}
                validateStatus={error ? 'error' : undefined}
                help={error?.message}
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
            </div>
          );
        })}
      </div>
    </FormSection>
  );
}
