import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Form, Input, InputNumber, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useDebounce } from 'use-debounce';
import * as yup from 'yup';
import { useSearchActiveAdminProductVariants } from '@/generated/api/catalog/catalog';
import {
  getGetStockTransferQueryKey,
  getListStockTransfersQueryKey,
  useCreateStockTransfer,
  useUpdateStockTransfer,
} from '@/generated/api/inventory/inventory';
import type { StockTransferDetailDto } from '@/generated/api/inventory/inventory.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { FormDrawer } from '@/foundation/overlay';
import { useWarehouseOptions } from '../hooks/use-warehouse-options';

interface StockTransferLineValues {
  sku: string;
  requestedQuantity: number;
}

interface StockTransferValues {
  fromWarehouseCode: string;
  toWarehouseCode: string;
  reason: string;
  items: StockTransferLineValues[];
}

const schema: yup.ObjectSchema<StockTransferValues> = yup.object({
  fromWarehouseCode: yup.string().trim().required('Chọn kho xuất'),
  toWarehouseCode: yup.string().trim()
    .required('Chọn kho nhận')
    .notOneOf([yup.ref('fromWarehouseCode')], 'Kho nhận phải khác kho xuất'),
  reason: yup.string().trim().min(3, 'Lý do cần ít nhất 3 ký tự').required('Nhập lý do chuyển kho'),
  items: yup.array()
    .of(yup.object({
      sku: yup.string().trim().required('Chọn SKU'),
      requestedQuantity: yup.number().integer('Số lượng phải là số nguyên').min(1, 'Tối thiểu 1').required(),
    }))
    .min(1, 'Phiếu phải có ít nhất một SKU')
    .test('unique-sku', 'Mỗi SKU chỉ được xuất hiện một lần', (items) => {
      const skus = (items ?? []).map(({ sku }) => sku.trim().toUpperCase()).filter(Boolean);
      return new Set(skus).size === skus.length;
    })
    .required(),
});

const emptyValues: StockTransferValues = {
  fromWarehouseCode: '',
  toWarehouseCode: '',
  reason: '',
  items: [{ sku: '', requestedQuantity: 1 }],
};

/** Tạo phiếu nháp, hoặc sửa lý do/danh sách SKU của phiếu DRAFT khi truyền `transfer`. */
export function StockTransferCreateDrawer({
  open,
  transfer,
  onClose,
  onCreated,
}: {
  open: boolean;
  transfer?: StockTransferDetailDto;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const editing = Boolean(transfer);
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [skuSearch, setSkuSearch] = useState('');
  const [debouncedSkuSearch] = useDebounce(skuSearch.trim(), 300);
  const form = useForm<StockTransferValues>({
    resolver: yupResolver(schema),
    defaultValues: emptyValues,
  });
  useEffect(() => {
    if (!open) return;
    form.reset(transfer ? {
      fromWarehouseCode: transfer.fromWarehouseCode,
      toWarehouseCode: transfer.toWarehouseCode,
      reason: transfer.reason,
      items: transfer.items.map((item) => ({ sku: item.sku, requestedQuantity: item.requestedQuantity })),
    } : emptyValues);
  }, [form, open, transfer]);
  const lines = useFieldArray({ control: form.control, name: 'items' });
  const warehouses = useWarehouseOptions();
  const variants = useSearchActiveAdminProductVariants({
    search: debouncedSkuSearch || undefined,
    page: 1,
    limit: 50,
  });
  const variantOptions = (variants.data?.items ?? []).map((item) => ({
    value: item.code,
    label: `${item.code} — ${item.label}`,
  }));
  const mutation = useCreateStockTransfer({
    request: { headers: { 'Idempotency-Key': idempotencyKey.current } },
    mutation: {
      onSuccess: async (result) => {
        await queryClient.invalidateQueries({ queryKey: getListStockTransfersQueryKey() });
        void message.success(`Đã tạo phiếu ${result.transferNo}.`);
        onClose();
        onCreated?.(result.id);
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể tạo phiếu chuyển kho.')),
    },
  });
  const update = useUpdateStockTransfer({
    mutation: {
      onSuccess: async (result) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListStockTransfersQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetStockTransferQueryKey(result.id) }),
        ]);
        void message.success(`Đã cập nhật phiếu ${result.transferNo}.`);
        onClose();
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể cập nhật phiếu chuyển kho.')),
    },
  });
  const submit = form.handleSubmit((values) => {
    if (!transfer) {
      mutation.mutate({ data: values });
      return;
    }
    // CONTRACT: API chỉ cho sửa lý do và danh sách SKU của phiếu DRAFT; kho xuất/nhận cố định sau khi tạo.
    // version cũ trả 409 STOCK_TRANSFER_VERSION_STALE để không ghi đè thay đổi của người khác.
    update.mutate({
      id: transfer.id,
      data: { version: transfer.version, reason: values.reason, items: values.items },
    });
  });
  const pending = mutation.isPending || update.isPending;

  return (
    <FormDrawer
      title={transfer ? `Sửa phiếu ${transfer.transferNo}` : 'Tạo phiếu chuyển kho'}
      open={open}
      onClose={onClose}
      onSubmit={() => void submit()}
      submitting={pending}
      submitText="Lưu bản nháp"
      isDirty={() => form.formState.isDirty}
    >
      <Alert
        className="mb-5"
        type="info"
        showIcon
        message={editing ? 'Chỉ sửa được khi phiếu còn Nháp' : 'Phiếu mới được lưu ở trạng thái Nháp'}
        description={editing
          ? 'Kho xuất và kho nhận không đổi được; danh sách SKU gửi lên sẽ thay toàn bộ danh sách cũ.'
          : 'Tồn kho chỉ giảm khi xác nhận xuất. V1 xuất toàn bộ số lượng đã yêu cầu, không tách nhiều đợt.'}
      />
      <Form layout="vertical" onFinish={() => void submit()}>
        <div className="grid gap-4 md:grid-cols-2">
          <Form.Item label="Kho xuất" required validateStatus={form.formState.errors.fromWarehouseCode ? 'error' : undefined} help={form.formState.errors.fromWarehouseCode?.message}>
            <Controller name="fromWarehouseCode" control={form.control} render={({ field }) => (
              <Select {...field} disabled={editing} showSearch filterOption={false} onSearch={warehouses.onSearch} loading={warehouses.query.isFetching} options={warehouses.options} placeholder="Chọn kho xuất" />
            )} />
          </Form.Item>
          <Form.Item label="Kho nhận" required validateStatus={form.formState.errors.toWarehouseCode ? 'error' : undefined} help={form.formState.errors.toWarehouseCode?.message}>
            <Controller name="toWarehouseCode" control={form.control} render={({ field }) => (
              <Select {...field} disabled={editing} showSearch filterOption={false} onSearch={warehouses.onSearch} loading={warehouses.query.isFetching} options={warehouses.options} placeholder="Chọn kho nhận" />
            )} />
          </Form.Item>
        </div>
        <Form.Item label="Lý do chuyển kho" required validateStatus={form.formState.errors.reason ? 'error' : undefined} help={form.formState.errors.reason?.message}>
          <Controller name="reason" control={form.control} render={({ field }) => <Input.TextArea {...field} rows={3} maxLength={1000} showCount placeholder="VD: Bổ sung hàng cho chi nhánh Hà Nội" />} />
        </Form.Item>

        <div className="mb-3 flex items-center justify-between">
          <strong>Danh sách SKU <span className="text-red-500">*</span></strong>
          <Button icon={<PlusOutlined />} onClick={() => lines.append({ sku: '', requestedQuantity: 1 })}>Thêm SKU</Button>
        </div>
        {typeof form.formState.errors.items?.message === 'string' && (
          <div className="mb-3 text-sm text-red-500">{form.formState.errors.items.message}</div>
        )}
        <div className="space-y-3">
          {lines.fields.map((line, index) => (
            <div key={line.id} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_150px_40px]">
              <Form.Item className="mb-0" label="SKU" required validateStatus={form.formState.errors.items?.[index]?.sku ? 'error' : undefined} help={form.formState.errors.items?.[index]?.sku?.message}>
                <Controller name={`items.${index}.sku`} control={form.control} render={({ field }) => (
                  <Select {...field} showSearch filterOption={false} onSearch={setSkuSearch} loading={variants.isFetching} options={variantOptions} placeholder="Tìm SKU đang hoạt động" />
                )} />
              </Form.Item>
              <Form.Item className="mb-0" label="Số lượng" required validateStatus={form.formState.errors.items?.[index]?.requestedQuantity ? 'error' : undefined} help={form.formState.errors.items?.[index]?.requestedQuantity?.message}>
                <Controller name={`items.${index}.requestedQuantity`} control={form.control} render={({ field }) => <InputNumber {...field} className="w-full" precision={0} min={1} />} />
              </Form.Item>
              <Button className="mt-8" danger type="text" aria-label="Xóa SKU" icon={<DeleteOutlined />} disabled={lines.fields.length === 1} onClick={() => lines.remove(index)} />
            </div>
          ))}
        </div>
      </Form>
    </FormDrawer>
  );
}
