import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Form, Input, InputNumber, Select } from 'antd';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import {
  getListInventoryBalancesQueryKey,
  getListInventoryMovementsQueryKey,
  getListStockAdjustmentsQueryKey,
  useCreateStockAdjustment,
} from '@/generated/api/inventory/inventory';
import {
  StockAdjustmentType,
  StockAdjustmentReason,
  type InventoryBalanceDto,
} from '@/generated/api/inventory/inventory.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { FormDrawer } from '@/foundation/overlay';
import { adjustmentReasonOptions, adjustmentTypeOptions } from '../constants/inventory.constants';
import { useVariantOptions } from '../hooks/use-variant-options';
import { useWarehouseOptions } from '../hooks/use-warehouse-options';

interface StockAdjustmentValues {
  warehouseCode: string;
  sku: string;
  adjustmentType: StockAdjustmentType;
  reasonCode: StockAdjustmentReason;
  externalReference?: string;
  sourceName?: string;
  quantityDelta: number;
  reason: string;
}

const schema: yup.ObjectSchema<StockAdjustmentValues> = yup.object({
  warehouseCode: yup.string().trim().required('Chọn kho'),
  sku: yup.string().trim().required('Chọn SKU'),
  adjustmentType: yup.mixed<StockAdjustmentType>()
    .oneOf(Object.values(StockAdjustmentType))
    .required('Chọn loại phiếu'),
  reasonCode: yup.mixed<StockAdjustmentReason>()
    .oneOf(Object.values(StockAdjustmentReason))
    .required('Chọn nguyên nhân'),
  externalReference: yup.string().trim().when('adjustmentType', {
    is: StockAdjustmentType.MANUAL_RECEIPT,
    then: (value) => value.required('Nhập số chứng từ nguồn'),
    otherwise: (value) => value.optional().strip(),
  }),
  sourceName: yup.string().trim().optional(),
  quantityDelta: yup.number()
    .integer('Số lượng phải là số nguyên')
    .notOneOf([0], 'Số lượng thay đổi phải khác 0')
    .test('receipt-positive', 'Phiếu nhập chỉ nhận số lượng dương', function validate(value) {
      return this.parent.adjustmentType === StockAdjustmentType.CORRECTION
        || (typeof value === 'number' && value > 0);
    })
    .required(),
  reason: yup.string().trim().min(5, 'Lý do cần ít nhất 5 ký tự').required('Nhập lý do điều chỉnh'),
});

export function StockAdjustmentDrawer({
  open,
  balance,
  onClose,
}: {
  open: boolean;
  balance?: InventoryBalanceDto;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const idempotencyKey = useRef(crypto.randomUUID());
  const form = useForm<StockAdjustmentValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      warehouseCode: '',
      sku: '',
      adjustmentType: StockAdjustmentType.CORRECTION,
      reasonCode: StockAdjustmentReason.MANUAL,
      externalReference: '',
      sourceName: '',
      quantityDelta: 0,
      reason: '',
    },
  });
  const warehouseCode = form.watch('warehouseCode');
  const adjustmentType = form.watch('adjustmentType');
  const warehouses = useWarehouseOptions({ enabled: open });
  const variants = useVariantOptions({ enabled: open });

  useEffect(() => {
    if (!open) return;
    form.reset({
      warehouseCode: balance?.warehouseCode ?? '',
      sku: balance?.sku ?? '',
      adjustmentType: StockAdjustmentType.CORRECTION,
      reasonCode: StockAdjustmentReason.MANUAL,
      externalReference: '',
      sourceName: '',
      quantityDelta: 0,
      reason: '',
    });
  }, [balance, form, open]);

  const mutation = useCreateStockAdjustment({
    request: { headers: { 'Idempotency-Key': idempotencyKey.current } },
    mutation: {
      onSuccess: async (result) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListInventoryBalancesQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListStockAdjustmentsQueryKey() }),
        ]);
        void message.success(`Đã ghi phiếu ${result.adjustmentNo}.`);
        onClose();
      },
      onError: (error) =>
        void message.error(getApiErrorMessage(error, 'Không thể điều chỉnh tồn kho.')),
    },
  });
  const submit = form.handleSubmit((values) => {
    mutation.mutate({
      data: {
        warehouseCode: values.warehouseCode,
        adjustmentType: values.adjustmentType,
        reasonCode: values.reasonCode,
        ...(values.externalReference ? { externalReference: values.externalReference } : {}),
        ...(values.sourceName ? { sourceName: values.sourceName } : {}),
        reason: values.reason,
        items: [{ sku: values.sku, quantityDelta: values.quantityDelta }],
      },
    });
  });

  return (
    <FormDrawer
      title={balance ? `Điều chỉnh tồn — ${balance.sku}` : 'Điều chỉnh tồn kho'}
      size="sm"
      open={open}
      onClose={onClose}
      onSubmit={() => void submit()}
      submitting={mutation.isPending}
      submitText="Ghi điều chỉnh"
      isDirty={() => form.formState.isDirty}
    >
      <Form layout="vertical" onFinish={() => void submit()}>
        {balance && (
          <Alert
            className="mb-5"
            showIcon
            type="info"
            message={`${balance.productName} · ${balance.warehouseCode}`}
            description={`Tồn vật lý: ${balance.onHand} · Đang giữ: ${balance.reserved} · Có thể bán: ${balance.available}. Điều chỉnh tạo phiếu mới, không sửa lịch sử tồn kho.`}
          />
        )}
        <Form.Item label="Kho" required validateStatus={form.formState.errors.warehouseCode ? 'error' : undefined} help={form.formState.errors.warehouseCode?.message}>
          <Controller
            name="warehouseCode"
            control={form.control}
            render={({ field }) => (
              <Select
                {...field}
                showSearch
                filterOption={false}
                onSearch={warehouses.onSearch}
                loading={warehouses.query.isFetching}
                options={warehouses.options}
                onChange={(value) => {
                  field.onChange(value);
                  form.setValue('sku', '');
                }}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Loại phiếu" required validateStatus={form.formState.errors.adjustmentType ? 'error' : undefined} help={form.formState.errors.adjustmentType?.message}>
          <Controller name="adjustmentType" control={form.control} render={({ field }) => <Select {...field} options={adjustmentTypeOptions} />} />
        </Form.Item>
        <Form.Item label="Nguyên nhân" required validateStatus={form.formState.errors.reasonCode ? 'error' : undefined} help={form.formState.errors.reasonCode?.message}>
          <Controller name="reasonCode" control={form.control} render={({ field }) => <Select {...field} options={adjustmentReasonOptions} />} />
        </Form.Item>
        {adjustmentType === StockAdjustmentType.MANUAL_RECEIPT && (
          <>
            <Form.Item label="Số chứng từ nguồn" required validateStatus={form.formState.errors.externalReference ? 'error' : undefined} help={form.formState.errors.externalReference?.message}>
              <Controller name="externalReference" control={form.control} render={({ field }) => <Input {...field} placeholder="VD: PN-2026-0001" maxLength={100} />} />
            </Form.Item>
            <Form.Item label="Nhà cung cấp / nguồn nhập" extra="Dùng để đối chiếu chứng từ.">
              <Controller name="sourceName" control={form.control} render={({ field }) => <Input {...field} maxLength={255} />} />
            </Form.Item>
          </>
        )}
        <Form.Item label="SKU" required validateStatus={form.formState.errors.sku ? 'error' : undefined} help={form.formState.errors.sku?.message}>
          <Controller
            name="sku"
            control={form.control}
            render={({ field }) => (
              <Select
                {...field}
                showSearch
                filterOption={false}
                onSearch={variants.onSearch}
                loading={variants.query.isFetching}
                disabled={!warehouseCode}
                options={variants.options}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Số lượng thay đổi" required extra={adjustmentType === StockAdjustmentType.CORRECTION ? 'Dùng số dương để nhập thêm, số âm để giảm tồn.' : 'Phiếu nhập chỉ chấp nhận số nguyên dương.'} validateStatus={form.formState.errors.quantityDelta ? 'error' : undefined} help={form.formState.errors.quantityDelta?.message}>
          <Controller name="quantityDelta" control={form.control} render={({ field }) => <InputNumber {...field} precision={0} className="w-full" />} />
        </Form.Item>
        <Form.Item label="Lý do" required validateStatus={form.formState.errors.reason ? 'error' : undefined} help={form.formState.errors.reason?.message}>
          <Controller name="reason" control={form.control} render={({ field }) => <Input.TextArea {...field} rows={4} />} />
        </Form.Item>
      </Form>
    </FormDrawer>
  );
}
