import { App, Button, DatePicker, Drawer, Form, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  createPurchaseOrder,
  getGetPurchaseOrderQueryKey,
  getListPurchaseOrdersQueryKey,
  updatePurchaseOrder,
} from '@/generated/api/procurement/procurement';
import type { CreatePurchaseOrderDto, PurchaseOrderDetailDto } from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { withSelectedParty } from '../constants/procurement.constants';
import { nextIdempotencyKey } from '@/shared/utils/idempotency';
import { useProcurementLookups } from '../hooks/use-procurement-lookups';
import { LineItemsFields } from './line-items-fields';

type FormValues = Omit<CreatePurchaseOrderDto, 'expectedAt'> & { expectedAt?: dayjs.Dayjs };

export function PurchaseOrderFormDrawer({ open, editing, onClose }: { open: boolean; editing?: PurchaseOrderDetailDto; onClose: () => void }) {
  const [form] = Form.useForm<FormValues>();
  const { supplierOptions, warehouseOptions, variantOptions, setVariantSearch, setSupplierSearch, setWarehouseSearch } = useProcurementLookups();
  const keyRef = useRef<{ signature: string; key: string } | undefined>(undefined);
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    keyRef.current = undefined;
    form.setFieldsValue(editing ? {
      supplierId: editing.supplier.id,
      warehouseId: editing.warehouse.id,
      expectedAt: editing.expectedAt ? dayjs(editing.expectedAt) : undefined,
      note: editing.note ?? undefined,
      items: editing.items.map((item) => ({
        productVariantId: item.productVariantId,
        orderedQty: item.orderedQty,
        unitCost: item.unitCost,
        taxRate: item.taxRate,
      })),
    } : { supplierId: undefined as never, warehouseId: undefined as never, items: [{} as never] });
  }, [editing, form, open]);

  const submit = async (values: FormValues) => {
    const payload: CreatePurchaseOrderDto = {
      supplierId: values.supplierId,
      warehouseId: values.warehouseId,
      // CONTRACT: backend nhận `date` (YYYY-MM-DD); toISOString() đổi sang UTC sẽ lùi một ngày với giờ VN.
      expectedAt: values.expectedAt?.format('YYYY-MM-DD') ?? null,
      note: values.note?.trim() || null,
      items: values.items.map((item) => ({ ...item, unitCost: String(item.unitCost), taxRate: String(item.taxRate || '0') })),
    };
    setSubmitting(true);
    try {
      if (editing) {
        await updatePurchaseOrder(editing.id, { ...payload, expectedVersion: editing.version });
      } else {
        keyRef.current = nextIdempotencyKey(keyRef.current, JSON.stringify(payload));
        await createPurchaseOrder(payload, { headers: { 'Idempotency-Key': keyRef.current.key } });
      }
      keyRef.current = undefined;
      await queryClient.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });
      if (editing) await queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(editing.id) });
      void message.success(editing ? 'Đã cập nhật đơn mua hàng.' : 'Đã tạo đơn mua hàng nháp.');
      onClose();
    } catch (error) {
      void message.error(getApiErrorMessage(error, 'Không lưu được đơn mua hàng.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer title={editing ? `Sửa ${editing.poNo}` : 'Tạo đơn mua hàng'} width="min(1100px, 96vw)" open={open} destroyOnClose onClose={onClose} extra={<Button type="primary" loading={submitting} onClick={() => form.submit()}>Lưu nháp</Button>}>
      <Form form={form} layout="vertical" disabled={submitting} onFinish={(values) => void submit(values)}>
        <div className="grid gap-x-4 md:grid-cols-2">
          <Form.Item name="supplierId" label="Nhà cung cấp" rules={[{ required: true, message: 'Chọn nhà cung cấp' }]}><Select showSearch filterOption={false} onSearch={setSupplierSearch} options={[
            ...withSelectedParty(supplierOptions, editing?.supplier),
          ]} /></Form.Item>
          <Form.Item name="warehouseId" label="Kho nhận" rules={[{ required: true, message: 'Chọn kho nhận' }]}><Select showSearch filterOption={false} onSearch={setWarehouseSearch} options={[
            ...withSelectedParty(warehouseOptions, editing?.warehouse),
          ]} /></Form.Item>
          <Form.Item name="expectedAt" label="Ngày dự kiến nhận"><DatePicker className="!w-full" format="DD/MM/YYYY" /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} maxLength={2000} /></Form.Item>
        </div>
        <div className="mb-2 font-semibold text-slate-800">Dòng hàng <span className="text-red-500">*</span></div>
        <LineItemsFields variantOptions={variantOptions} onVariantSearch={setVariantSearch} quantityName="orderedQty" quantityLabel="Số đặt" unitCostRequired taxRate />
      </Form>
    </Drawer>
  );
}
