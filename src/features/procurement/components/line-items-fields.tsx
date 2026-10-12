import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Select } from 'antd';
import type { FormListFieldData } from 'antd';

// CONTRACT: đơn giá là chuỗi thập phân VND ≥ 0, tối đa 2 chữ số lẻ; VAT 0..100 (%).
const MONEY_PATTERN = /^\d{1,17}(\.\d{1,2})?$/;
const TAX_RATE_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

interface LineItemsFieldsProps {
  variantOptions: Array<{ value: string; label: string }>;
  onVariantSearch: (value: string) => void;
  quantityName: 'orderedQty' | 'quantity';
  quantityLabel: string;
  unitCostRequired?: boolean;
  taxRate?: boolean;
  costName?: 'unitCost' | 'invoiceUnitCost';
  costLabel?: string;
  /** Số lượng tối đa mỗi dòng theo contract (PO 100000, phiếu nhập/trả 1000000). */
  maxQuantity?: number;
  /** CONTRACT PO: mỗi SKU chỉ một dòng. */
  uniqueVariant?: boolean;
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
        rules={[
          { required: true, message: 'Nhập số lượng' },
          { type: 'integer', min: 1, max: props.maxQuantity ?? 1_000_000, message: `Số lượng là số nguyên từ 1 đến ${(props.maxQuantity ?? 1_000_000).toLocaleString('vi-VN')}` },
        ]}
        className="!mb-0"
      >
        <InputNumber min={1} max={props.maxQuantity ?? 1_000_000} precision={0} className="!w-full" />
      </Form.Item>
      <Form.Item
        {...field}
        name={[field.name, props.costName ?? 'unitCost']}
        label={props.costLabel ?? 'Đơn giá chưa VAT'}
        rules={[
          { required: Boolean(props.unitCostRequired), message: 'Nhập đơn giá' },
          { pattern: MONEY_PATTERN, message: 'Đơn giá là số ≥ 0, tối đa 2 chữ số thập phân' },
        ]}
        className="!mb-0"
      >
        <Input min="0" inputMode="decimal" placeholder={props.unitCostRequired ? '0' : 'Theo PO'} />
      </Form.Item>
      {props.taxRate ? (
        <Form.Item
          {...field}
          name={[field.name, 'taxRate']}
          label="VAT (%)"
          rules={[
            { pattern: TAX_RATE_PATTERN, message: 'VAT là số từ 0 đến 100' },
            {
              validator: async (_, value?: string | number) => {
                if (value !== undefined && value !== null && value !== '' && Number(value) > 100) throw new Error('VAT là số từ 0 đến 100');
              },
            },
          ]}
          className="!mb-0"
        >
          <Input min="0" max="100" inputMode="decimal" placeholder="0" />
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
  const { uniqueVariant } = props;
  return (
    <Form.List
      name="items"
      initialValue={[{}]}
      rules={[{
        validator: async (_, items?: Array<{ productVariantId?: string }>) => {
          if (!items?.length) throw new Error('Cần ít nhất một dòng hàng.');
          const ids = items.map((item) => item?.productVariantId).filter(Boolean);
          if (uniqueVariant && new Set(ids).size !== ids.length) throw new Error('Mỗi SKU chỉ được nhập một dòng.');
        },
      }]}
    >
      {(fields, { add, remove }, { errors }) => (
        <div className="space-y-3">
          {fields.map((field) => <LineRow key={field.key} field={field} remove={remove} props={props} />)}
          <Form.ErrorList errors={errors} />
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()} block>
            Thêm dòng hàng
          </Button>
        </div>
      )}
    </Form.List>
  );
}
