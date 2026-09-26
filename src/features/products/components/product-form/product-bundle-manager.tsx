import { yupResolver } from '@hookform/resolvers/yup';
import { ApartmentOutlined } from '@ant-design/icons';
import { Alert, App, Button, Descriptions, Form, InputNumber, Select, Space } from 'antd';
import { useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useDebounce } from 'use-debounce';
import * as yup from 'yup';
import { PermissionGate } from '@/core/auth/permissions';
import { FormSection } from '@/foundation/layout/form-section';
import { useCreateAdminProductBundle, useSearchActiveAdminProductVariants } from '@/generated/api/catalog/catalog';
import type { ProductDetailDto } from '@/generated/api/catalog/catalog.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { ENTITY_ID_PATTERN } from '@/lib/validation/entity-id';

interface BundleFormValues {
  bundleVariantId: string;
  items: Array<{ componentVariantId: string; quantity: number }>;
}

const bundleSchema: yup.ObjectSchema<BundleFormValues> = yup.object({
  bundleVariantId: yup.string().matches(ENTITY_ID_PATTERN, 'SKU combo không hợp lệ').required('Chọn SKU combo'),
  items: yup
    .array()
    .of(
      yup.object({
        componentVariantId: yup.string().matches(ENTITY_ID_PATTERN, 'SKU thành phần không hợp lệ').required('Chọn SKU thành phần'),
        quantity: yup.number().integer('Số lượng phải là số nguyên').min(1, 'Tối thiểu 1').required(),
      }),
    )
    .min(1, 'Combo cần ít nhất một thành phần')
    .required(),
});

const emptyBundle: BundleFormValues = { bundleVariantId: '', items: [{ componentVariantId: '', quantity: 1 }] };

/**
 * Tab Combo ở chế độ Sửa — thành phần cố định của từng SKU combo (`createAdminProductBundle`).
 *
 * Lưu ngay theo từng SKU; chỉ khai được khi sản phẩm còn DRAFT vì combo đã bán không được đổi thành phần.
 */
export function ProductBundleManager({ product, onChanged }: { product: ProductDetailDto; onChanged: () => Promise<void> }) {
  const { message } = App.useApp();
  const [componentSearch, setComponentSearch] = useState('');
  const [debouncedComponentSearch] = useDebounce(componentSearch.trim(), 300);
  const isDraft = product.status === 'DRAFT';
  const bundleForm = useForm<BundleFormValues>({ resolver: yupResolver(bundleSchema), defaultValues: emptyBundle });
  const bundleItems = useFieldArray({ control: bundleForm.control, name: 'items' });
  const componentOptions = useSearchActiveAdminProductVariants(
    { search: debouncedComponentSearch || undefined, page: 1, limit: 20 },
    { query: { enabled: isDraft } },
  );
  const createBundle = useCreateAdminProductBundle({
    mutation: {
      onSuccess: async () => {
        await onChanged();
        bundleForm.reset(emptyBundle);
        void message.success('Đã lưu thành phần combo cho SKU.');
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể tạo combo.')),
    },
  });
  const submitBundle = bundleForm.handleSubmit((values) => createBundle.mutate({ id: product.id, data: values }));
  const declared = product.variants.filter((variant) => variant.bundle);
  const pendingVariants = product.variants.filter((variant) => variant.status === 'ACTIVE' && !variant.bundle);

  return (
    <div className="space-y-4">
      <FormSection
        title="Thành phần đã khai"
        description="Tồn bán được của combo tính từ SKU thành phần. Combo chỉ xuất bản được khi mọi SKU combo đang bán đã có thành phần."
        icon={<ApartmentOutlined />}
      >
        {declared.length === 0 ? (
          <Alert type="warning" showIcon message="Chưa SKU combo nào có thành phần" />
        ) : (
          <Descriptions bordered size="small" column={1}>
            {declared.map((variant) => (
              <Descriptions.Item key={variant.id} label={`${variant.sku} — ${variant.name}`}>
                {variant.bundle?.components.map((component) => `${component.quantity} × ${component.componentSku}`).join(', ')}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </FormSection>

      {isDraft && pendingVariants.length > 0 && (
        <PermissionGate permission="catalog.product.manage">
          <FormSection title="Khai thành phần cho SKU combo" icon={<ApartmentOutlined />}>
            <Form layout="vertical" onFinish={() => void submitBundle()}>
              <Form.Item
                label="SKU combo"
                required
                validateStatus={bundleForm.formState.errors.bundleVariantId ? 'error' : undefined}
                help={bundleForm.formState.errors.bundleVariantId?.message}
              >
                <Controller
                  name="bundleVariantId"
                  control={bundleForm.control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      placeholder="Chọn SKU chưa khai thành phần"
                      options={pendingVariants.map((variant) => ({ value: variant.id, label: `${variant.sku} — ${variant.name}` }))}
                    />
                  )}
                />
              </Form.Item>
              <div className="space-y-3">
                {bundleItems.fields.map((item, index) => (
                  <div key={item.id} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_140px_auto]">
                    <Form.Item
                      label={`Thành phần ${index + 1}`}
                      required
                      validateStatus={bundleForm.formState.errors.items?.[index]?.componentVariantId ? 'error' : undefined}
                      help={bundleForm.formState.errors.items?.[index]?.componentVariantId?.message}
                      style={{ marginBottom: 0 }}
                    >
                      <Controller
                        name={`items.${index}.componentVariantId`}
                        control={bundleForm.control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            showSearch
                            filterOption={false}
                            onSearch={setComponentSearch}
                            loading={componentOptions.isFetching}
                            options={(componentOptions.data?.items ?? []).map((option) => ({
                              value: option.id,
                              label: `${option.code} — ${option.label}`,
                            }))}
                          />
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      label="Số lượng"
                      required
                      validateStatus={bundleForm.formState.errors.items?.[index]?.quantity ? 'error' : undefined}
                      help={bundleForm.formState.errors.items?.[index]?.quantity?.message}
                      style={{ marginBottom: 0 }}
                    >
                      <Controller
                        name={`items.${index}.quantity`}
                        control={bundleForm.control}
                        render={({ field }) => (
                          <InputNumber
                            className="!w-full"
                            min={1}
                            precision={0}
                            value={field.value}
                            onBlur={field.onBlur}
                            onChange={(value) => field.onChange(value ?? 1)}
                          />
                        )}
                      />
                    </Form.Item>
                    <Button
                      htmlType="button"
                      danger
                      className="self-end"
                      disabled={bundleItems.fields.length === 1}
                      onClick={() => bundleItems.remove(index)}
                    >
                      Xóa
                    </Button>
                  </div>
                ))}
              </div>
              <Space className="mt-3">
                <Button htmlType="button" onClick={() => bundleItems.append({ componentVariantId: '', quantity: 1 })}>
                  Thêm thành phần
                </Button>
                <Button type="primary" htmlType="submit" loading={createBundle.isPending}>
                  Lưu combo
                </Button>
              </Space>
            </Form>
          </FormSection>
        </PermissionGate>
      )}
      {!isDraft && (
        <Alert type="info" showIcon message="Chỉ khai thành phần combo khi sản phẩm ở trạng thái nháp" />
      )}
    </div>
  );
}
