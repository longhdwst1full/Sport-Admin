import { DatePicker, Form, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import {
  createPurchaseOrder,
  getGetPurchaseOrderQueryKey,
  getListPurchaseOrdersQueryKey,
  updatePurchaseOrder,
} from '@/generated/api/procurement/procurement';
import type { CreatePurchaseOrderDto, PurchaseOrderDetailDto } from '@/generated/api/procurement/procurement.schemas';
import { withSelectedParty } from '../constants/procurement.constants';
import { useSupplierLookup, useVariantLookup, useWarehouseLookup } from '../hooks/use-procurement-lookups';
import { useDocumentSave } from '../hooks/use-procurement-mutations';
import { LineItemsFields } from './line-items-fields';
import { FormDrawer } from '@/foundation/overlay';

type FormValues = Omit<CreatePurchaseOrderDto, 'expectedAt'> & { expectedAt?: dayjs.Dayjs };

const PO_KEYS = { list: getListPurchaseOrdersQueryKey(), detail: getGetPurchaseOrderQueryKey };

export function PurchaseOrderFormDrawer({ open, editing, onClose }: { open: boolean; editing?: PurchaseOrderDetailDto; onClose: () => void }) {
  const [form] = Form.useForm<FormValues>();
  const suppliers = useSupplierLookup(open);
  const warehouses = useWarehouseLookup(open);
  const variants = useVariantLookup(open);
  const { save, submitting, resetKey } = useDocumentSave(PO_KEYS);

  useEffect(() => {
    if (!open) return;
    resetKey();
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
    } : { supplierId: undefined, warehouseId: undefined, items: [{}] });
  }, [editing, form, open, resetKey]);

  const submit = async (values: FormValues) => {
    const payload: CreatePurchaseOrderDto = {
      supplierId: values.supplierId,
      warehouseId: values.warehouseId,
      // CONTRACT: backend nhận `date` (YYYY-MM-DD); toISOString() đổi sang UTC sẽ lùi một ngày với giờ VN.
      expectedAt: values.expectedAt?.format('YYYY-MM-DD') ?? null,
      note: values.note?.trim() || null,
      items: values.items.map((item) => ({ ...item, unitCost: String(item.unitCost), taxRate: String(item.taxRate || '0') })),
    };
    await save({
      payload,
      update: editing && { id: editing.id, run: (data) => updatePurchaseOrder(editing.id, { ...data, expectedVersion: editing.version }) },
      create: (data, options) => createPurchaseOrder(data, options),
      successText: editing ? 'Đã cập nhật đơn mua hàng.' : 'Đã tạo đơn mua hàng nháp.',
      errorText: 'Không lưu được đơn mua hàng.',
      onDone: onClose,
    });
  };

  return (
    <FormDrawer title={editing ? `Sửa ${editing.poNo}` : 'Tạo đơn mua hàng'} size="xl" open={open} onClose={onClose} onSubmit={() => form.submit()} submitting={submitting} submitText="Lưu nháp" isDirty={() => form.isFieldsTouched()}>
      <Form form={form} layout="vertical" disabled={submitting} onFinish={(values) => void submit(values)}>
        <div className="grid gap-x-4 md:grid-cols-2">
          <Form.Item name="supplierId" label="Nhà cung cấp" rules={[{ required: true, message: 'Chọn nhà cung cấp' }]}><Select showSearch filterOption={false} onSearch={suppliers.onSearch} options={withSelectedParty(suppliers.options, editing?.supplier)} /></Form.Item>
          <Form.Item name="warehouseId" label="Kho nhận" rules={[{ required: true, message: 'Chọn kho nhận' }]}><Select showSearch filterOption={false} onSearch={warehouses.onSearch} options={withSelectedParty(warehouses.options, editing?.warehouse)} /></Form.Item>
          <Form.Item name="expectedAt" label="Ngày dự kiến nhận"><DatePicker className="!w-full" format="DD/MM/YYYY" /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} maxLength={2000} /></Form.Item>
        </div>
        <div className="mb-2 font-semibold text-slate-800">Dòng hàng <span className="text-red-500">*</span></div>
        <LineItemsFields variantOptions={variants.options} onVariantSearch={variants.onSearch} quantityName="orderedQty" quantityLabel="Số đặt" unitCostRequired taxRate />
      </Form>
    </FormDrawer>
  );
}
