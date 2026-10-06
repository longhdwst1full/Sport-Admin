import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Form, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useDebounce } from 'use-debounce';
import * as yup from 'yup';
import { useSearchActiveAdminProductVariants } from '@/generated/api/catalog/catalog';
import { getListStocktakesQueryKey, useCreateStocktake } from '@/generated/api/inventory/inventory';
import type { StocktakeScopeType } from '@/generated/api/inventory/inventory.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { FormDrawer } from '@/foundation/overlay';
import { useWarehouseOptions } from '../hooks/use-warehouse-options';

interface StocktakeValues {
  warehouseCode?: string;
  scopeType: StocktakeScopeType;
  skus: string[];
}

const schema: yup.ObjectSchema<StocktakeValues> = yup.object({
  warehouseCode: yup.string().trim().optional(),
  scopeType: yup.string().oneOf(['FULL', 'SKU_LIST'] as const).required(),
  skus: yup.array().of(yup.string().required()).when('scopeType', {
    is: 'SKU_LIST',
    then: (field) => field.min(1, 'Chọn ít nhất một SKU cần đếm'),
    otherwise: (field) => field.max(0),
  }).required(),
});

const scopeTypeOptions: { value: StocktakeScopeType; label: string }[] = [
  { value: 'FULL', label: 'Toàn kho — đếm mọi SKU đang có dòng tồn' },
  { value: 'SKU_LIST', label: 'Theo danh sách SKU — kiểm kê từng phần' },
];

const emptyValues: StocktakeValues = { warehouseCode: undefined, scopeType: 'FULL', skus: [] };

/**
 * Tạo phiếu kiểm kê. Phiếu được chụp tồn ngay lúc tạo và mở ở trạng thái Đang đếm.
 *
 * Bỏ trống kho khi tài khoản chỉ gắn một chi nhánh: V1 là một chi nhánh một kho nên API tự suy ra,
 * bớt một chỗ chọn nhầm sang kho chi nhánh khác.
 */
export function StocktakeCreateDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [skuSearch, setSkuSearch] = useState('');
  const [debouncedSkuSearch] = useDebounce(skuSearch.trim(), 300);
  const form = useForm<StocktakeValues>({ resolver: yupResolver(schema), defaultValues: emptyValues });
  const scopeType = form.watch('scopeType');

  useEffect(() => {
    if (open) form.reset(emptyValues);
  }, [form, open]);

  const warehouses = useWarehouseOptions();
  const variants = useSearchActiveAdminProductVariants({
    search: debouncedSkuSearch || undefined, page: 1, limit: 50,
  });

  const mutation = useCreateStocktake({
    request: { headers: { 'Idempotency-Key': idempotencyKey.current } },
    mutation: {
      onSuccess: async (result) => {
        await queryClient.invalidateQueries({ queryKey: getListStocktakesQueryKey() });
        void message.success(`Đã tạo phiếu ${result.stocktakeNo} với ${result.itemCount} dòng cần đếm.`);
        onClose();
        onCreated?.(result.id);
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể tạo phiếu kiểm kê.')),
    },
  });

  const submit = form.handleSubmit((values) => {
    mutation.mutate({
      data: {
        warehouseCode: values.warehouseCode?.trim() || undefined,
        scopeType: values.scopeType,
        skus: values.scopeType === 'SKU_LIST' ? values.skus : undefined,
      },
    });
  });

  return (
    <FormDrawer
      title="Tạo phiếu kiểm kê"
      open={open}
      onClose={onClose}
      onSubmit={() => void submit()}
      submitting={mutation.isPending}
      submitText="Tạo và bắt đầu đếm"
      isDirty={() => form.formState.isDirty}
    >
      <Alert
        className="mb-5"
        type="info"
        showIcon
        message="Tồn hệ thống được chụp ngay khi tạo phiếu"
        description="Trong lúc đếm, màn nhập số sẽ không hiển thị tồn hệ thống để số đếm phản ánh đúng hàng trên kệ. Chênh lệch chỉ hiện ra ở bước soát trước khi duyệt."
      />
      <Form layout="vertical" onFinish={() => void submit()}>
        <Form.Item
          label="Kho kiểm kê"
          help={form.formState.errors.warehouseCode?.message ?? 'Bỏ trống nếu tài khoản chỉ quản lý một chi nhánh.'}
          validateStatus={form.formState.errors.warehouseCode ? 'error' : undefined}
        >
          <Controller name="warehouseCode" control={form.control} render={({ field }) => (
            <Select
              {...field}
              allowClear
              showSearch
              filterOption={false}
              onSearch={warehouses.onSearch}
              loading={warehouses.query.isFetching}
              placeholder="Tự suy ra từ chi nhánh của bạn"
              options={warehouses.options}
            />
          )} />
        </Form.Item>

        <Form.Item label="Phạm vi đếm" required>
          <Controller name="scopeType" control={form.control} render={({ field }) => (
            <Select
              {...field}
              onChange={(value) => { field.onChange(value); form.setValue('skus', []); }}
              options={scopeTypeOptions}
            />
          )} />
        </Form.Item>

        {scopeType === 'SKU_LIST' && (
          <Form.Item
            label="SKU cần đếm"
            required
            validateStatus={form.formState.errors.skus ? 'error' : undefined}
            help={form.formState.errors.skus?.message}
          >
            <Controller name="skus" control={form.control} render={({ field }) => (
              <Select
                {...field}
                mode="multiple"
                showSearch
                filterOption={false}
                onSearch={setSkuSearch}
                loading={variants.isFetching}
                placeholder="Tìm và chọn SKU"
                options={(variants.data?.items ?? []).map((item) => ({ value: item.code, label: `${item.code} — ${item.label}` }))}
              />
            )} />
          </Form.Item>
        )}
      </Form>
    </FormDrawer>
  );
}
