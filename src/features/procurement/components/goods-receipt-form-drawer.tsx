import { Alert, App, Button, Drawer, Form, Input, Select, Skeleton } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  createGoodsReceipt,
  getGetGoodsReceiptQueryKey,
  getListGoodsReceiptsQueryKey,
  useGetPurchaseOrder,
  updateGoodsReceipt,
} from '@/generated/api/procurement/procurement';
import {
  GoodsReceiptCostAllocation,
  GoodsReceiptType,
  type CreateGoodsReceiptDto,
  type GoodsReceiptDetailDto,
} from '@/generated/api/procurement/procurement.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { nextIdempotencyKey } from '@/shared/utils/idempotency';
import { costAllocationOptions, directReceiptReasonOptions, goodsReceiptTypeOptions, receiptCostTypeOptions, withSelectedParty } from '../constants/procurement.constants';
import { useProcurementLookups } from '../hooks/use-procurement-lookups';
import { toRemainingPoReceiptItems } from '../model/po-receipt.mapper';
import { LineItemsFields } from './line-items-fields';
import { PoReceiptItemsFields } from './po-receipt-items-fields';

export function GoodsReceiptFormDrawer({ open, editing, onClose }: { open: boolean; editing?: GoodsReceiptDetailDto; onClose: () => void }) {
  const [form] = Form.useForm<CreateGoodsReceiptDto>();
  const receiptType = Form.useWatch('receiptType', form) ?? GoodsReceiptType.WITH_PO;
  const purchaseOrderId = Form.useWatch('purchaseOrderId', form) as string | undefined;
  const purchaseOrder = useGetPurchaseOrder(purchaseOrderId ?? '', { query: { enabled: open && receiptType === GoodsReceiptType.WITH_PO && Boolean(purchaseOrderId) } });
  const lookups = useProcurementLookups();
  const keyRef = useRef<{ signature: string; key: string } | undefined>(undefined);
  const hydratedPoRef = useRef<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  useEffect(() => {
    if (!open) return;
    keyRef.current = undefined;
    hydratedPoRef.current = undefined;
    form.setFieldsValue(editing ? {
      receiptType: editing.receiptType,
      purchaseOrderId: editing.purchaseOrder?.id,
      supplierId: editing.supplier.id,
      warehouseId: editing.warehouse.id,
      reasonCode: editing.reasonCode ?? undefined,
      supplierInvoiceNo: editing.supplierInvoiceNo ?? undefined,
      costAllocation: editing.costAllocation,
      note: editing.note ?? undefined,
      items: editing.items.map((item) => ({ productVariantId: item.productVariantId, quantity: item.quantity, unitCost: item.unitCost, purchaseOrderItemId: item.purchaseOrderItemId ?? undefined })),
      costs: editing.costs.map((item) => ({ costType: item.costType, amount: item.amount, note: item.note ?? undefined })),
    } : { receiptType: GoodsReceiptType.WITH_PO, costAllocation: GoodsReceiptCostAllocation.VALUE, items: [{} as never], costs: [] });
  }, [editing, form, open]);

  useEffect(() => {
    if (!open || editing || !purchaseOrder.data || purchaseOrder.data.id !== purchaseOrderId) return;
    // CONTRACT: Phiếu mới lấy dòng, SKU và giá từ PO; backend vẫn kiểm tra số lượng khi ghi/post.
    if (hydratedPoRef.current === purchaseOrderId) return;
    hydratedPoRef.current = purchaseOrderId;
    form.setFieldValue('items', toRemainingPoReceiptItems(purchaseOrder.data));
  }, [editing, form, open, purchaseOrder.data, purchaseOrderId]);

  const submit = async (values: CreateGoodsReceiptDto) => {
    const direct = values.receiptType === GoodsReceiptType.DIRECT_RECEIPT;
    const payload: CreateGoodsReceiptDto = {
      ...values,
      purchaseOrderId: direct ? undefined : values.purchaseOrderId,
      supplierId: direct ? values.supplierId : undefined,
      warehouseId: direct ? values.warehouseId : undefined,
      reasonCode: direct ? values.reasonCode : undefined,
      supplierInvoiceNo: values.supplierInvoiceNo?.trim() || undefined,
      note: values.note?.trim() || undefined,
      items: values.items.map((item) => ({ ...item, unitCost: direct && item.unitCost !== undefined ? String(item.unitCost) : undefined, purchaseOrderItemId: direct ? undefined : item.purchaseOrderItemId })),
      costs: values.costs?.filter((cost) => cost.amount).map((cost) => ({ ...cost, amount: String(cost.amount), note: cost.note?.trim() || undefined })),
    };
    setSubmitting(true);
    try {
      if (editing) await updateGoodsReceipt(editing.id, { ...payload, expectedVersion: editing.version });
      else {
        keyRef.current = nextIdempotencyKey(keyRef.current, JSON.stringify(payload));
        await createGoodsReceipt(payload, { headers: { 'Idempotency-Key': keyRef.current.key } });
      }
      keyRef.current = undefined;
      await queryClient.invalidateQueries({ queryKey: getListGoodsReceiptsQueryKey() });
      if (editing) await queryClient.invalidateQueries({ queryKey: getGetGoodsReceiptQueryKey(editing.id) });
      void message.success(editing ? 'Đã cập nhật phiếu nhập.' : 'Đã tạo phiếu nhập nháp.');
      onClose();
    } catch (error) { void message.error(getApiErrorMessage(error, 'Không lưu được phiếu nhập.')); }
    finally { setSubmitting(false); }
  };

  return <Drawer title={editing ? `Sửa ${editing.receiptNo}` : 'Tạo phiếu nhập'} width="min(1120px, 96vw)" open={open} destroyOnClose onClose={onClose} extra={<Button type="primary" loading={submitting} onClick={() => form.submit()}>Lưu nháp</Button>}>
    <Form form={form} layout="vertical" disabled={submitting} onFinish={(values) => void submit(values)}>
      <div className="grid gap-x-4 md:grid-cols-2 lg:grid-cols-3">
        <Form.Item name="receiptType" label="Loại phiếu" rules={[{ required: true }]}><Select disabled={Boolean(editing)} options={goodsReceiptTypeOptions} onChange={() => { hydratedPoRef.current = undefined; form.setFieldsValue({ purchaseOrderId: undefined, items: [] }); }} /></Form.Item>
        {receiptType === GoodsReceiptType.WITH_PO ? <Form.Item name="purchaseOrderId" label="Đơn mua hàng" rules={[{ required: true }]}><Select disabled={Boolean(editing)} showSearch optionFilterProp="label" options={[
          ...(editing?.purchaseOrder && !lookups.purchaseOrderOptions.some((option) => option.value === editing.purchaseOrder?.id) ? [{ value: editing.purchaseOrder.id, label: editing.purchaseOrder.poNo }] : []),
          ...lookups.purchaseOrderOptions,
        ]} filterOption={false} onSearch={lookups.setPurchaseOrderSearch} onChange={() => { hydratedPoRef.current = undefined; form.setFieldValue('items', []); }} /></Form.Item> : <>
          <Form.Item name="supplierId" label="Nhà cung cấp" rules={[{ required: true }]}><Select showSearch filterOption={false} onSearch={lookups.setSupplierSearch} options={[
            ...withSelectedParty(lookups.supplierOptions, editing?.supplier),
            ...lookups.supplierOptions,
          ]} /></Form.Item>
          <Form.Item name="warehouseId" label="Kho nhận" rules={[{ required: true }]}><Select showSearch filterOption={false} onSearch={lookups.setWarehouseSearch} options={[
            ...withSelectedParty(lookups.warehouseOptions, editing?.warehouse),
            ...lookups.warehouseOptions,
          ]} /></Form.Item>
          <Form.Item name="reasonCode" label="Lý do nhập trực tiếp" rules={[{ required: true }]}><Select options={directReceiptReasonOptions} /></Form.Item>
        </>}
        <Form.Item name="supplierInvoiceNo" label="Số hoá đơn NCC"><Input maxLength={64} /></Form.Item>
        <Form.Item name="costAllocation" label="Phân bổ chi phí"><Select options={costAllocationOptions} /></Form.Item>
        <Form.Item name="note" label="Ghi chú"><Input maxLength={2000} /></Form.Item>
      </div>
      <div className="mb-2 font-semibold text-slate-800">Dòng hàng <span className="text-red-500">*</span></div>
      {receiptType === GoodsReceiptType.WITH_PO ? purchaseOrder.isPending && purchaseOrderId ? <Skeleton active paragraph={{ rows: 3 }} /> : purchaseOrder.isError ? <Alert type="error" showIcon message="Không tải được dòng đơn mua hàng" description={getApiErrorMessage(purchaseOrder.error)} action={<Button onClick={() => void purchaseOrder.refetch()}>Thử lại</Button>} /> : <PoReceiptItemsFields purchaseOrder={purchaseOrder.data} /> : <LineItemsFields variantOptions={lookups.variantOptions} onVariantSearch={lookups.setVariantSearch} quantityName="quantity" quantityLabel="Số nhận" unitCostRequired />}
      <div className="mb-2 mt-6 font-semibold text-slate-800">Chi phí nhập</div>
      <Form.List name="costs">{(fields, { add, remove }) => <div className="space-y-3">{fields.map((field) => <div key={field.key} className="grid gap-3 md:grid-cols-[180px_180px_1fr_90px]">
        <Form.Item {...field} name={[field.name, 'costType']} rules={[{ required: true }]}><Select placeholder="Loại chi phí" options={receiptCostTypeOptions} /></Form.Item>
        <Form.Item {...field} name={[field.name, 'amount']} rules={[{ required: true }]}><Input inputMode="decimal" placeholder="Số tiền" /></Form.Item>
        <Form.Item {...field} name={[field.name, 'note']}><Input placeholder="Ghi chú" /></Form.Item>
        <Button danger type="text" onClick={() => remove(field.name)}>Xoá</Button>
      </div>)}<Button type="dashed" onClick={() => add()}>Thêm chi phí</Button></div>}</Form.List>
    </Form>
  </Drawer>;
}
