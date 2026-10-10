import { Button, Form, Input, Select } from 'antd';
import { useEffect, useRef } from 'react';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { TableSkeleton } from '@/foundation/feedback/page-skeleton';
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
import { costAllocationOptions, directReceiptReasonOptions, goodsReceiptTypeOptions, receiptCostTypeOptions, withSelectedOption, withSelectedParty } from '../constants/procurement.constants';
import { useReceivablePurchaseOrderLookup, useSupplierLookup, useVariantLookup, useWarehouseLookup } from '../hooks/use-procurement-lookups';
import { useDocumentSave } from '../hooks/use-procurement-mutations';
import { toRemainingPoReceiptItems } from '../model/po-receipt.mapper';
import { LineItemsFields } from './line-items-fields';
import { PoReceiptItemsFields } from './po-receipt-items-fields';
import { FormDrawer } from '@/foundation/overlay';

const RECEIPT_KEYS = { list: getListGoodsReceiptsQueryKey(), detail: getGetGoodsReceiptQueryKey };

export function GoodsReceiptFormDrawer({ open, editing, onClose }: { open: boolean; editing?: GoodsReceiptDetailDto; onClose: () => void }) {
  const [form] = Form.useForm<CreateGoodsReceiptDto>();
  const receiptType = Form.useWatch('receiptType', form) ?? GoodsReceiptType.WITH_PO;
  const purchaseOrderId = Form.useWatch('purchaseOrderId', form);
  const withPo = receiptType === GoodsReceiptType.WITH_PO;
  const purchaseOrder = useGetPurchaseOrder(purchaseOrderId ?? '', { query: { enabled: open && withPo && Boolean(purchaseOrderId) } });
  // PERF: chỉ tải lookup của nhánh đang hiển thị (theo PO hoặc nhập trực tiếp) và khi drawer mở.
  const purchaseOrders = useReceivablePurchaseOrderLookup(open && withPo && !editing);
  const suppliers = useSupplierLookup(open && !withPo);
  const warehouses = useWarehouseLookup(open && !withPo);
  const variants = useVariantLookup(open && !withPo);
  const hydratedPoRef = useRef<string | undefined>(undefined);
  const { save, submitting, resetKey } = useDocumentSave(RECEIPT_KEYS);

  useEffect(() => {
    if (!open) return;
    resetKey();
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
    } : { receiptType: GoodsReceiptType.WITH_PO, costAllocation: GoodsReceiptCostAllocation.VALUE, items: [{}], costs: [] });
  }, [editing, form, open, resetKey]);

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
    await save({
      payload,
      update: editing && { id: editing.id, run: (data) => updateGoodsReceipt(editing.id, { ...data, expectedVersion: editing.version }) },
      create: (data, options) => createGoodsReceipt(data, options),
      successText: editing ? 'Đã cập nhật phiếu nhập.' : 'Đã tạo phiếu nhập nháp.',
      errorText: 'Không lưu được phiếu nhập.',
      onDone: onClose,
    });
  };

  return <FormDrawer title={editing ? `Sửa ${editing.receiptNo}` : 'Tạo phiếu nhập'} size="xl" open={open} onClose={onClose} onSubmit={() => form.submit()} submitting={submitting} submitText="Lưu nháp" isDirty={() => form.isFieldsTouched()}>
    <Form form={form} layout="vertical" disabled={submitting} onFinish={(values) => void submit(values)}>
      <div className="grid gap-x-4 md:grid-cols-2 lg:grid-cols-3">
        <Form.Item name="receiptType" label="Loại phiếu" rules={[{ required: true }]}><Select disabled={Boolean(editing)} options={goodsReceiptTypeOptions} onChange={() => { hydratedPoRef.current = undefined; form.setFieldsValue({ purchaseOrderId: undefined, items: [] }); }} /></Form.Item>
        {withPo ? <Form.Item name="purchaseOrderId" label="Đơn mua hàng" rules={[{ required: true }]}><Select disabled={Boolean(editing)} showSearch optionFilterProp="label" options={withSelectedOption(purchaseOrders.options, editing?.purchaseOrder && { value: editing.purchaseOrder.id, label: editing.purchaseOrder.poNo })} filterOption={false} onSearch={purchaseOrders.onSearch} onChange={() => { hydratedPoRef.current = undefined; form.setFieldValue('items', []); }} /></Form.Item> : <>
          <Form.Item name="supplierId" label="Nhà cung cấp" rules={[{ required: true }]}><Select showSearch filterOption={false} onSearch={suppliers.onSearch} options={withSelectedParty(suppliers.options, editing?.supplier)} /></Form.Item>
          <Form.Item name="warehouseId" label="Kho nhận" rules={[{ required: true }]}><Select showSearch filterOption={false} onSearch={warehouses.onSearch} options={withSelectedParty(warehouses.options, editing?.warehouse)} /></Form.Item>
          <Form.Item name="reasonCode" label="Lý do nhập trực tiếp" rules={[{ required: true }]}><Select options={directReceiptReasonOptions} /></Form.Item>
        </>}
        <Form.Item name="supplierInvoiceNo" label="Số hoá đơn NCC"><Input maxLength={64} /></Form.Item>
        <Form.Item name="costAllocation" label="Phân bổ chi phí"><Select options={costAllocationOptions} /></Form.Item>
        <Form.Item name="note" label="Ghi chú"><Input maxLength={2000} /></Form.Item>
      </div>
      <div className="mb-2 font-semibold text-slate-800">Dòng hàng <span className="text-red-500">*</span></div>
      {withPo ? purchaseOrder.isPending && purchaseOrderId ? <TableSkeleton rows={3} /> : purchaseOrder.isError ? <QueryErrorAlert message="Không tải được dòng đơn mua hàng" error={purchaseOrder.error} retry={() => void purchaseOrder.refetch()} /> : <PoReceiptItemsFields purchaseOrder={purchaseOrder.data} /> : <LineItemsFields variantOptions={variants.options} onVariantSearch={variants.onSearch} quantityName="quantity" quantityLabel="Số nhận" unitCostRequired />}
      <div className="mb-2 mt-6 font-semibold text-slate-800">Chi phí nhập</div>
      <Form.List name="costs">{(fields, { add, remove }) => <div className="space-y-3">{fields.map((field) => <div key={field.key} className="grid gap-3 md:grid-cols-[180px_180px_1fr_90px]">
        <Form.Item {...field} name={[field.name, 'costType']} rules={[{ required: true }]}><Select placeholder="Loại chi phí" options={receiptCostTypeOptions} /></Form.Item>
        <Form.Item {...field} name={[field.name, 'amount']} rules={[{ required: true }]}><Input inputMode="decimal" placeholder="Số tiền" /></Form.Item>
        <Form.Item {...field} name={[field.name, 'note']}><Input placeholder="Ghi chú" /></Form.Item>
        <Button danger type="text" onClick={() => remove(field.name)}>Xoá</Button>
      </div>)}<Button type="dashed" onClick={() => add()}>Thêm chi phí</Button></div>}</Form.List>
    </Form>
  </FormDrawer>;
}
