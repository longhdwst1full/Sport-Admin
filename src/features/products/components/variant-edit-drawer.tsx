import { yupResolver } from '@hookform/resolvers/yup';
import { App, Form, Input } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { FormDrawer } from '@/foundation/overlay';
import { useUpdateAdminProductVariant } from '@/generated/api/catalog/catalog';
import type { ProductVariantDto } from '@/generated/api/catalog/catalog.schemas';
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api/error';
import { VARIANT_DIMENSION_FIELDS } from '../constants/product-list.constants';
import { VARIANT_FIELD_RULES } from '../model/product-form.schema';
import { toUpdateVariantDto, toVariantEditValues, type VariantEditValues } from '../model/variant-edit.mapper';
import { FieldItem, VariantNumberInput } from './product-form/form-field-parts';

/** Cùng luật ô với form Tạo; riêng barcode luôn là chuỗi và khối lượng bắt buộc vì PATCH gửi đủ các ô. */
const schema: yup.ObjectSchema<VariantEditValues> = yup.object({
  name: VARIANT_FIELD_RULES.name,
  barcode: VARIANT_FIELD_RULES.barcode.defined(),
  weightGrams: VARIANT_FIELD_RULES.weightGrams.typeError('Nhập khối lượng').required('Nhập khối lượng'),
  lengthMm: VARIANT_FIELD_RULES.lengthMm,
  widthMm: VARIANT_FIELD_RULES.widthMm,
  heightMm: VARIANT_FIELD_RULES.heightMm,
});

export function VariantEditDrawer({
  variant,
  onClose,
  onUpdated,
}: {
  variant?: ProductVariantDto;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}) {
  const { message } = App.useApp();
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<VariantEditValues>({ resolver: yupResolver(schema) });
  const update = useUpdateAdminProductVariant({
    mutation: {
      onSuccess: async () => {
        await onUpdated();
        void message.success('Đã cập nhật thông tin SKU.');
        onClose();
      },
      onError: (error) => {
        Object.entries(getApiFieldErrors(error)).forEach(([field, fieldMessage]) => {
          if (field in schema.fields) setError(field as keyof VariantEditValues, { message: fieldMessage });
        });
        void message.error(getApiErrorMessage(error, 'Không thể cập nhật SKU.'));
      },
    },
  });

  // Drawer giữ mount để có animation đóng; nạp lại react-hook-form mỗi khi mở cho SKU khác.
  useEffect(() => {
    if (!variant) return;
    reset(toVariantEditValues(variant));
  }, [reset, variant]);

  const submit = handleSubmit((values) => {
    if (!variant) return;
    // CONCURRENCY: gửi version SKU đã nạp để API trả 409 thay vì ghi đè bản sửa của người khác.
    update.mutate({ variantId: variant.id, data: toUpdateVariantDto(values, variant.version) });
  });

  return (
    <FormDrawer
      open={Boolean(variant)}
      title={`Sửa SKU — ${variant?.sku ?? ''}`}
      size="sm"
      onClose={onClose}
      onSubmit={() => void submit()}
      submitting={update.isPending}
      submitText="Lưu thay đổi"
      isDirty={() => isDirty}
    >
      <Form layout="vertical">
        <FieldItem label="Tên biến thể" required error={errors.name}>
          <Controller name="name" control={control} render={({ field }) => <Input {...field} maxLength={255} />} />
        </FieldItem>
        <FieldItem label="Barcode" error={errors.barcode}>
          <Controller name="barcode" control={control} render={({ field }) => <Input {...field} maxLength={64} />} />
        </FieldItem>
        <div className="grid grid-cols-2 gap-3">
          {VARIANT_DIMENSION_FIELDS.map(([name, label, min]) => (
            <FieldItem key={name} label={label} required={name === 'weightGrams'} error={errors[name]}>
              <Controller
                name={name}
                control={control}
                render={({ field }) => (
                  <VariantNumberInput min={min} value={field.value} onBlur={field.onBlur} onChange={field.onChange} />
                )}
              />
            </FieldItem>
          ))}
        </div>
      </Form>
    </FormDrawer>
  );
}
