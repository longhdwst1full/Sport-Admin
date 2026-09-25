import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Drawer, Form, Input, InputNumber, Select, Space, Switch } from 'antd';
import { useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import * as yup from 'yup';
import {
  getListAdminAttributesQueryKey,
  useCreateAdminAttribute,
  useUpdateAdminAttribute,
} from '@/generated/api/catalog/catalog';
import { AttributeDataType, type AttributeDto } from '@/generated/api/catalog/models';
import { getApiErrorMessage } from '@/lib/api/error';
import { ATTRIBUTE_TYPE_LABEL, toAttributePayload, type AttributeFormValues } from '../model/attribute-form';

const schema: yup.ObjectSchema<AttributeFormValues> = yup.object({
  code: yup.string().trim().uppercase().matches(/^[A-Z][A-Z0-9_]{1,63}$/, 'Chỉ A-Z, 0-9, _ và bắt đầu bằng chữ').required('Nhập mã'),
  name: yup.string().trim().required('Nhập tên').max(255),
  dataType: yup.mixed<AttributeFormValues['dataType']>().oneOf(Object.values(AttributeDataType)).required(),
  unit: yup.string().trim().max(16).optional(),
  isVariantAxis: yup.boolean().required(),
  sortOrder: yup.number().integer().min(0).required(),
  options: yup.array().of(yup.object({
    code: yup.string().trim().uppercase().matches(/^[A-Z0-9][A-Z0-9_-]{0,63}$/, 'Mã không hợp lệ').required('Nhập mã'),
    label: yup.string().trim().required('Nhập nhãn').max(255),
    colorHex: yup.string().trim().matches(/^(#[0-9A-Fa-f]{6})?$/, 'Dạng #RRGGBB').optional(),
  })).required()
    .test('options-for-option', 'Thuộc tính lựa chọn cần ít nhất một giá trị', function check(value) {
      return this.parent.dataType !== AttributeDataType.OPTION || (value?.length ?? 0) > 0;
    }),
});

const empty: AttributeFormValues = {
  code: '', name: '', dataType: AttributeDataType.TEXT, unit: '', isVariantAxis: false, sortOrder: 0, options: [],
};

/**
 * Tạo/sửa thuộc tính. Mã và kiểu chỉ nhập khi tạo (API không cho đổi vì thông số sản phẩm tham chiếu
 * theo mã). Đổi đơn vị hay bỏ lựa chọn đang được sản phẩm dùng sẽ bị API từ chối (409).
 */
export function AttributeFormDrawer({ open, attribute, onClose }: { open: boolean; attribute?: AttributeDto; onClose: () => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const form = useForm<AttributeFormValues>({ resolver: yupResolver(schema), defaultValues: empty });
  const options = useFieldArray({ control: form.control, name: 'options' });
  const dataType = form.watch('dataType');
  const isEdit = Boolean(attribute);

  useEffect(() => {
    if (!open) return;
    form.reset(attribute
      ? {
          code: attribute.code,
          name: attribute.name,
          dataType: attribute.dataType,
          unit: attribute.unit ?? '',
          isVariantAxis: attribute.isVariantAxis,
          sortOrder: attribute.sortOrder,
          options: attribute.options.map((option) => ({ code: option.code, label: option.label, colorHex: option.colorHex ?? '' })),
        }
      : empty);
  }, [attribute, form, open]);

  const done = async (text: string) => {
    await queryClient.invalidateQueries({ queryKey: getListAdminAttributesQueryKey() });
    void message.success(text);
    onClose();
  };
  const create = useCreateAdminAttribute({ mutation: { onSuccess: () => done('Đã tạo thuộc tính.'), onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể tạo thuộc tính.')) } });
  const update = useUpdateAdminAttribute({ mutation: { onSuccess: () => done('Đã cập nhật thuộc tính.'), onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể cập nhật thuộc tính.')) } });

  const submit = form.handleSubmit((values) => {
    const payload = toAttributePayload(values);
    if (attribute) {
      update.mutate({
        id: attribute.id,
        data: {
          name: payload.name,
          unit: payload.unit ?? null,
          isVariantAxis: payload.isVariantAxis,
          sortOrder: payload.sortOrder,
          ...(payload.dataType === AttributeDataType.OPTION ? { options: payload.options } : {}),
          expectedVersion: attribute.version,
        },
      });
    } else {
      create.mutate({ data: payload });
    }
  });

  const field = (name: keyof AttributeFormValues) => ({
    validateStatus: form.formState.errors[name] ? ('error' as const) : undefined,
    help: form.formState.errors[name]?.message as string | undefined,
  });

  return (
    <Drawer
      width={640}
      open={open}
      title={isEdit ? `Sửa thuộc tính ${attribute?.code}` : 'Thêm thuộc tính'}
      onClose={onClose}
      destroyOnClose
      footer={(
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={create.isPending || update.isPending} onClick={() => void submit()}>Lưu</Button>
        </div>
      )}
    >
      <Form layout="vertical">
        <Form.Item label="Mã thuộc tính" required extra="Không đổi được sau khi tạo, ví dụ ADJUSTABLE_HEIGHT" {...field('code')}>
          <Controller name="code" control={form.control} render={({ field: input }) => (
            <Input {...input} disabled={isEdit} onChange={(event) => input.onChange(event.target.value.toUpperCase())} />
          )} />
        </Form.Item>
        <Form.Item label="Tên hiển thị" required {...field('name')}>
          <Controller name="name" control={form.control} render={({ field: input }) => <Input {...input} placeholder="Chiều cao điều chỉnh" />} />
        </Form.Item>
        <Space className="w-full" size="middle" wrap>
          <Form.Item label="Kiểu giá trị" required extra={isEdit ? 'Không đổi được sau khi tạo' : undefined}>
            <Controller name="dataType" control={form.control} render={({ field: input }) => (
              <Select {...input} disabled={isEdit} className="min-w-44" options={Object.values(AttributeDataType).map((value) => ({ value, label: ATTRIBUTE_TYPE_LABEL[value] }))} />
            )} />
          </Form.Item>
          {dataType === AttributeDataType.NUMBER && (
            <Form.Item label="Đơn vị" extra="Khoá khi đã có sản phẩm dùng" {...field('unit')}>
              <Controller name="unit" control={form.control} render={({ field: input }) => <Input {...input} className="w-28" placeholder="m, kg" />} />
            </Form.Item>
          )}
          <Form.Item label="Thứ tự">
            <Controller name="sortOrder" control={form.control} render={({ field: input }) => <InputNumber {...input} min={0} />} />
          </Form.Item>
          <Form.Item label="Có thể làm trục biến thể" extra="Dành cho bước Option; chưa dùng">
            <Controller name="isVariantAxis" control={form.control} render={({ field: input }) => <Switch checked={input.value} onChange={input.onChange} />} />
          </Form.Item>
        </Space>

        {dataType === AttributeDataType.OPTION && (
          <Form.Item label="Các giá trị lựa chọn" required {...field('options')} extra="Không bỏ được giá trị đang có sản phẩm dùng">
            <Space direction="vertical" className="w-full">
              {options.fields.map((option, index) => (
                <Space key={option.id} align="start" wrap>
                  <Controller name={`options.${index}.code`} control={form.control} render={({ field: input }) => (
                    <Input {...input} className="w-36" placeholder="WHITE" status={form.formState.errors.options?.[index]?.code ? 'error' : undefined}
                      onChange={(event) => input.onChange(event.target.value.toUpperCase())} />
                  )} />
                  <Controller name={`options.${index}.label`} control={form.control} render={({ field: input }) => (
                    <Input {...input} className="w-48" placeholder="Trắng" status={form.formState.errors.options?.[index]?.label ? 'error' : undefined} />
                  )} />
                  <Controller name={`options.${index}.colorHex`} control={form.control} render={({ field: input }) => (
                    <Input {...input} className="w-28" placeholder="#FFFFFF" />
                  )} />
                  <Button icon={<DeleteOutlined />} aria-label="Bỏ giá trị" onClick={() => options.remove(index)} />
                </Space>
              ))}
              <Button icon={<PlusOutlined />} onClick={() => options.append({ code: '', label: '', colorHex: '' })}>Thêm giá trị</Button>
            </Space>
          </Form.Item>
        )}
      </Form>
    </Drawer>
  );
}
