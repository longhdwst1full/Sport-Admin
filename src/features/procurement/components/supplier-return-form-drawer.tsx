import { Form, Input, Select } from 'antd';
import { useEffect } from 'react';
import {
  createSupplierReturn,
  getGetSupplierReturnQueryKey,
  getListSupplierReturnsQueryKey,
  updateSupplierReturn,
} from '@/generated/api/procurement/procurement';
import type { CreateSupplierReturnDto, SupplierReturnDetailDto } from '@/generated/api/procurement/procurement.schemas';
import { withSelectedOption, withSelectedParty } from '../constants/procurement.constants';
import { usePostedReceiptLookup, useSupplierLookup, useVariantLookup, useWarehouseLookup } from '../hooks/use-procurement-lookups';
import { useDocumentSave } from '../hooks/use-procurement-mutations';
import { LineItemsFields } from './line-items-fields';
import { FormDrawer } from '@/foundation/overlay';

const RETURN_KEYS = { list: getListSupplierReturnsQueryKey(), detail: getGetSupplierReturnQueryKey };

export function SupplierReturnFormDrawer({ open, editing, onClose }: { open: boolean; editing?: SupplierReturnDetailDto; onClose: () => void }) {
  const [form] = Form.useForm<CreateSupplierReturnDto>();
  const supplierId = Form.useWatch('supplierId', form);
  const warehouseId = Form.useWatch('warehouseId', form);
  // PERF: NCC/kho/phiếu gốc khoá khi sửa nên chỉ tải lookup lúc tạo; phiếu gốc cần chọn đủ NCC + kho.
  const creating = open && !editing;
  const suppliers = useSupplierLookup(creating);
  const warehouses = useWarehouseLookup(creating);
  const receipts = usePostedReceiptLookup({ supplierId, warehouseId }, creating && Boolean(supplierId && warehouseId));
  const variants = useVariantLookup(open);
  const { save, submitting, resetKey } = useDocumentSave(RETURN_KEYS);
  useEffect(() => {
    if (!open) return;
    resetKey();
    form.setFieldsValue(editing ? {
      supplierId: editing.supplier.id, warehouseId: editing.warehouse.id, goodsReceiptId: editing.goodsReceipt?.id,
      reason: editing.reason, items: editing.items.map((item) => ({ productVariantId: item.productVariantId, quantity: item.quantity, invoiceUnitCost: item.invoiceUnitCost ?? undefined })),
    } : { items: [{}], reason: '' });
  }, [editing, form, open, resetKey]);
  const submit = async (values: CreateSupplierReturnDto) => {
    const payload = { ...values, goodsReceiptId: values.goodsReceiptId || undefined, reason: values.reason.trim(), items: values.items.map((item) => ({ ...item, invoiceUnitCost: item.invoiceUnitCost ? String(item.invoiceUnitCost) : undefined })) };
    await save({
      payload,
      update: editing && { id: editing.id, run: (data) => updateSupplierReturn(editing.id, { expectedVersion: editing.version, reason: data.reason, items: data.items }) },
      create: (data, options) => createSupplierReturn(data, options),
      successText: editing ? 'Đã cập nhật phiếu trả.' : 'Đã tạo phiếu trả nhà cung cấp.',
      errorText: 'Không lưu được phiếu trả.',
      onDone: onClose,
    });
  };
  return <FormDrawer title={editing ? `Sửa ${editing.returnNo}` : 'Tạo phiếu trả nhà cung cấp'} size="xl" open={open} onClose={onClose} onSubmit={() => form.submit()} submitting={submitting} submitText="Lưu nháp" isDirty={() => form.isFieldsTouched()}>
    <Form form={form} layout="vertical" disabled={submitting} onFinish={(values) => void submit(values)}>
      <div className="grid gap-x-4 md:grid-cols-2">
        <Form.Item name="supplierId" label="Nhà cung cấp" rules={[{ required: true }]}><Select disabled={Boolean(editing)} showSearch filterOption={false} onSearch={suppliers.onSearch} options={withSelectedParty(suppliers.options, editing?.supplier)} onChange={() => form.setFieldValue('goodsReceiptId', undefined)} /></Form.Item>
        <Form.Item name="warehouseId" label="Kho xuất trả" rules={[{ required: true }]}><Select disabled={Boolean(editing)} showSearch filterOption={false} onSearch={warehouses.onSearch} options={withSelectedParty(warehouses.options, editing?.warehouse)} onChange={() => form.setFieldValue('goodsReceiptId', undefined)} /></Form.Item>
        <Form.Item name="goodsReceiptId" label="Phiếu nhập gốc (nếu có)"><Select disabled={Boolean(editing) || !supplierId || !warehouseId} allowClear showSearch filterOption={false} onSearch={receipts.onSearch} options={withSelectedOption(receipts.options, editing?.goodsReceipt && { value: editing.goodsReceipt.id, label: editing.goodsReceipt.receiptNo })} /></Form.Item>
        <Form.Item name="reason" label="Lý do trả" rules={[{ required: true, min: 3 }]}><Input.TextArea rows={2} maxLength={1000} /></Form.Item>
      </div>
      <div className="mb-2 font-semibold text-slate-800">Dòng hàng <span className="text-red-500">*</span></div>
      <LineItemsFields variantOptions={variants.options} onVariantSearch={variants.onSearch} quantityName="quantity" quantityLabel="Số trả" unitCostRequired={false} costName="invoiceUnitCost" costLabel="Giá hoá đơn" />
    </Form>
  </FormDrawer>;
}
