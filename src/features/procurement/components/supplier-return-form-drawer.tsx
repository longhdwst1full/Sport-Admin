import { App, Button, Drawer, Form, Input, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  createSupplierReturn,
  getGetSupplierReturnQueryKey,
  getListSupplierReturnsQueryKey,
  updateSupplierReturn,
} from '@/generated/api/procurement/procurement';
import type { CreateSupplierReturnDto, SupplierReturnDetailDto } from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { withSelectedParty } from '../constants/procurement.constants';
import { nextIdempotencyKey } from '@/shared/utils/idempotency';
import { useProcurementLookups } from '../hooks/use-procurement-lookups';
import { LineItemsFields } from './line-items-fields';

export function SupplierReturnFormDrawer({ open, editing, onClose }: { open: boolean; editing?: SupplierReturnDetailDto; onClose: () => void }) {
  const [form] = Form.useForm<CreateSupplierReturnDto>();
  const supplierId = Form.useWatch('supplierId', form) as string | undefined;
  const warehouseId = Form.useWatch('warehouseId', form) as string | undefined;
  const lookups = useProcurementLookups({ supplierId, warehouseId });
  const keyRef = useRef<{ signature: string; key: string } | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient(); const { message } = App.useApp();
  useEffect(() => {
    if (!open) return;
    keyRef.current = undefined;
    form.setFieldsValue(editing ? {
      supplierId: editing.supplier.id, warehouseId: editing.warehouse.id, goodsReceiptId: editing.goodsReceipt?.id,
      reason: editing.reason, items: editing.items.map((item) => ({ productVariantId: item.productVariantId, quantity: item.quantity, invoiceUnitCost: item.invoiceUnitCost ?? undefined })),
    } : { items: [{} as never], reason: '' });
  }, [editing, form, open]);
  const submit = async (values: CreateSupplierReturnDto) => {
    const payload = { ...values, goodsReceiptId: values.goodsReceiptId || undefined, reason: values.reason.trim(), items: values.items.map((item) => ({ ...item, invoiceUnitCost: item.invoiceUnitCost ? String(item.invoiceUnitCost) : undefined })) };
    setSubmitting(true);
    try {
      if (editing) await updateSupplierReturn(editing.id, { expectedVersion: editing.version, reason: payload.reason, items: payload.items });
      else { keyRef.current = nextIdempotencyKey(keyRef.current, JSON.stringify(payload)); await createSupplierReturn(payload, { headers: { 'Idempotency-Key': keyRef.current.key } }); }
      keyRef.current = undefined;
      await queryClient.invalidateQueries({ queryKey: getListSupplierReturnsQueryKey() });
      if (editing) await queryClient.invalidateQueries({ queryKey: getGetSupplierReturnQueryKey(editing.id) });
      void message.success(editing ? 'Đã cập nhật phiếu trả.' : 'Đã tạo phiếu trả nhà cung cấp.'); onClose();
    } catch (error) { void message.error(getApiErrorMessage(error, 'Không lưu được phiếu trả.')); } finally { setSubmitting(false); }
  };
  return <Drawer title={editing ? `Sửa ${editing.returnNo}` : 'Tạo phiếu trả nhà cung cấp'} width="min(1080px, 96vw)" open={open} destroyOnClose onClose={onClose} extra={<Button type="primary" loading={submitting} onClick={() => form.submit()}>Lưu nháp</Button>}>
    <Form form={form} layout="vertical" disabled={submitting} onFinish={(values) => void submit(values)}>
      <div className="grid gap-x-4 md:grid-cols-2">
        <Form.Item name="supplierId" label="Nhà cung cấp" rules={[{ required: true }]}><Select disabled={Boolean(editing)} showSearch filterOption={false} onSearch={lookups.setSupplierSearch} options={[
          ...withSelectedParty(lookups.supplierOptions, editing?.supplier),
        ]} onChange={() => form.setFieldValue('goodsReceiptId', undefined)} /></Form.Item>
        <Form.Item name="warehouseId" label="Kho xuất trả" rules={[{ required: true }]}><Select disabled={Boolean(editing)} showSearch filterOption={false} onSearch={lookups.setWarehouseSearch} options={[
          ...withSelectedParty(lookups.warehouseOptions, editing?.warehouse),
        ]} onChange={() => form.setFieldValue('goodsReceiptId', undefined)} /></Form.Item>
        <Form.Item name="goodsReceiptId" label="Phiếu nhập gốc (nếu có)"><Select disabled={Boolean(editing) || !supplierId || !warehouseId} allowClear showSearch filterOption={false} onSearch={lookups.setReceiptSearch} options={[
          ...(editing?.goodsReceipt && !lookups.receiptOptions.some((option) => option.value === editing.goodsReceipt?.id) ? [{ value: editing.goodsReceipt.id, label: editing.goodsReceipt.receiptNo }] : []), ...lookups.receiptOptions,
        ]} /></Form.Item>
        <Form.Item name="reason" label="Lý do trả" rules={[{ required: true, min: 3 }]}><Input.TextArea rows={2} maxLength={1000} /></Form.Item>
      </div>
      <div className="mb-2 font-semibold text-slate-800">Dòng hàng <span className="text-red-500">*</span></div>
      <LineItemsFields variantOptions={lookups.variantOptions} onVariantSearch={lookups.setVariantSearch} quantityName="quantity" quantityLabel="Số trả" unitCostRequired={false} costName="invoiceUnitCost" costLabel="Giá hoá đơn" />
    </Form>
  </Drawer>;
}
