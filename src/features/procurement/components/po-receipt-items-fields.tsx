import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Form, InputNumber, Select } from 'antd';
import type { PurchaseOrderDetailDto, PurchaseOrderItemDto } from '@/generated/api/procurement/procurement.schemas';

function PoReceiptRow({
  index,
  remove,
  items,
}: {
  index: number;
  remove: (index: number) => void;
  items: PurchaseOrderItemDto[];
}) {
  const form = Form.useFormInstance();
  const selectedId = Form.useWatch(['items', index, 'purchaseOrderItemId'], form) as string | undefined;
  const selected = items.find((item) => item.id === selectedId);

  return <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(300px,2fr)_150px_170px_40px]">
    <Form.Item name={[index, 'purchaseOrderItemId']} label="Dòng đơn mua hàng" rules={[{ required: true, message: 'Chọn dòng PO' }]} className="!mb-0">
      <Select
        showSearch
        optionFilterProp="label"
        placeholder="Chọn SKU từ đơn mua hàng"
        options={items.map((item) => ({
          value: item.id,
          label: `${item.sku} · ${item.productName} / ${item.variantName} · còn ${item.remainingQty}/${item.orderedQty}`,
          disabled: item.remainingQty <= 0 && item.id !== selectedId,
        }))}
        onChange={(id: string) => {
          const item = items.find((candidate) => candidate.id === id);
          if (!item) return;
          form.setFieldValue(['items', index, 'productVariantId'], item.productVariantId);
          form.setFieldValue(['items', index, 'unitCost'], undefined);
          form.setFieldValue(['items', index, 'quantity'], Math.min(item.remainingQty, 1));
        }}
      />
    </Form.Item>
    <Form.Item name={[index, 'productVariantId']} hidden><input /></Form.Item>
    <Form.Item name={[index, 'quantity']} label="Số nhận" rules={[
      { required: true, message: 'Nhập số lượng' },
      { type: 'number', min: 1, message: 'Số nhận phải lớn hơn 0' },
    ]} className="!mb-0">
      <InputNumber min={1} precision={0} className="!w-full" />
    </Form.Item>
    <div className="self-center text-sm text-slate-600">{selected ? `Giá PO: ${selected.unitCost} ₫` : 'Chọn dòng PO'}</div>
    <Button className="self-end" danger type="text" aria-label="Xoá dòng" icon={<DeleteOutlined />} onClick={() => remove(index)} />
  </div>;
}

/** Chỉ các dòng của PO đã chọn được nhận; ID dòng PO không bao giờ là input tự do của người dùng. */
export function PoReceiptItemsFields({ purchaseOrder }: { purchaseOrder?: PurchaseOrderDetailDto }) {
  if (!purchaseOrder) return <Alert type="info" showIcon message="Chọn đơn mua hàng để tải các dòng còn nhận." />;
  const available = purchaseOrder.items.filter((item) => item.remainingQty > 0);
  if (available.length === 0) return <Alert type="warning" showIcon message="Đơn mua hàng này không còn dòng để nhận." />;
  return <Form.List name="items" rules={[{
    validator: async (_, items: unknown[]) => {
      if (!items?.length) throw new Error('Cần ít nhất một dòng hàng.');
      const ids = items.map((item) => (item as { purchaseOrderItemId?: string }).purchaseOrderItemId);
      if (ids.some((id) => !id) || new Set(ids).size !== ids.length) throw new Error('Mỗi dòng PO chỉ được chọn một lần.');
    },
  }]}>
    {(fields, { add, remove }, { errors }) => <div className="space-y-3">
      <p className="text-xs text-slate-500">Số còn nhận chỉ là tham chiếu; hệ thống sẽ kiểm tra lại số đã nhận và dung sai khi ghi sổ.</p>
      {fields.map((field) => <PoReceiptRow key={field.key} index={field.name} remove={remove} items={purchaseOrder.items} />)}
      <Form.ErrorList errors={errors} />
      <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()} block>Thêm dòng từ PO</Button>
    </div>}
  </Form.List>;
}
