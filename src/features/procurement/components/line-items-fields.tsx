import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Select } from 'antd';
import type { FormListFieldData } from 'antd';

export interface LineItemsFieldsProps {
  variantOptions: Array<{ value: string; label: string }>;
  onVariantSearch: (value: string) => void;
  quantityName: 'orderedQty' | 'quantity';
  quantityLabel: string;
  unitCostRequired?: boolean;
  taxRate?: boolean;
  purchaseOrderItem?: boolean;
  costName?: 'unitCost' | 'invoiceUnitCost';
  costLabel?: string;
}

function LineRow({
  field,
  remove,
  props,
}: {
  field: FormListFieldData;
  remove: (index: number | number[]) => void;
  props: LineItemsFieldsProps;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(240px,2fr)_120px_150px_120px_40px]">
      <Form.Item
        {...field}
        name={[field.name, 'productVariantId']}
        label="SKU"
        rules={[{ required: true, message: 'Chọn SKU' }]}
        className="!mb-0"
      >
        <Select
          showSearch
          filterOption={false}
          onSearch={props.onVariantSearch}
          options={props.variantOptions}
          placeholder="Tìm theo SKU/tên"
        />
      </Form.Item>
      <Form.Item
        {...field}
        name={[field.name, props.quantityName]}
        label={props.quantityLabel}
        rules={[{ required: true, message: 'Nhập số lượng' }]}
        className="!mb-0"
      >
        <InputNumber min={1} precision={0} className="!w-full" />
      </Form.Item>
      <Form.Item
        {...field}
        name={[field.name, props.costName ?? 'unitCost']}
        label={props.costLabel ?? 'Đơn giá chưa VAT'}
        rules={props.unitCostRequired ? [{ required: true, message: 'Nhập đơn giá' }] : undefined}
        className="!mb-0"
      >
        <Input min="0" inputMode="decimal" placeholder={props.unitCostRequired ? '0' : 'Theo PO'} />
      </Form.Item>
      {props.taxRate ? (
        <Form.Item {...field} name={[field.name, 'taxRate']} label="VAT (%)" className="!mb-0">
          <Input min="0" max="100" inputMode="decimal" placeholder="0" />
        </Form.Item>
      ) : props.purchaseOrderItem ? (
        <Form.Item {...field} name={[field.name, 'purchaseOrderItemId']} label="Dòng PO" className="!mb-0">
          <Input placeholder="Tự khớp SKU" />
        </Form.Item>
      ) : <div />}
      <Button
        className="self-end"
        danger
        type="text"
        aria-label="Xoá dòng"
        icon={<DeleteOutlined />}
        onClick={() => remove(field.name)}
      />
    </div>
  );
}

export function LineItemsFields(props: LineItemsFieldsProps) {
  return (
    <Form.List name="items" initialValue={[{}]}>
      {(fields, { add, remove }) => (
        <div className="space-y-3">
          {fields.map((field) => <LineRow key={field.key} field={field} remove={remove} props={props} />)}
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()} block>
            Thêm dòng hàng
          </Button>
        </div>
      )}
    </Form.List>
  );
}
