import { Form, Input, Radio } from 'antd';
import { DeliveryAddressFields } from './delivery-address-fields';
import { CustomerLookup } from './customer-lookup';
import type { PosCheckoutValues } from '../model/pos-checkout';

/** Khách hàng và hình thức nhận hàng của phiếu bán tại quầy. */
export function PosCustomerPanel({
  values,
  disabled,
  onChange,
}: {
  values: PosCheckoutValues;
  disabled?: boolean;
  onChange: (patch: Partial<PosCheckoutValues>) => void;
}) {
  return (
    <Form layout="vertical">
      <div className="grid gap-x-4 md:grid-cols-3">
        <Form.Item
          label="Số điện thoại"
          required
          extra="Gõ từ 3 số để tìm khách đã có; khách mới thì nhập tay."
        >
          <CustomerLookup
            disabled={disabled}
            value={{
              name: values.customerName,
              phone: values.customerPhone,
              email: values.customerEmail,
            }}
            onChange={(patch) =>
              onChange({
                ...(patch.phone !== undefined ? { customerPhone: patch.phone } : {}),
                ...(patch.name !== undefined ? { customerName: patch.name } : {}),
                ...(patch.email !== undefined ? { customerEmail: patch.email } : {}),
              })
            }
          />
        </Form.Item>
        <Form.Item label="Họ tên" required>
          <Input
            value={values.customerName}
            disabled={disabled}
            placeholder="Tên khách mua hàng"
            onChange={(event) => onChange({ customerName: event.target.value })}
          />
        </Form.Item>
        <Form.Item label="Email">
          <Input
            value={values.customerEmail}
            disabled={disabled}
            placeholder="email@example.com"
            onChange={(event) => onChange({ customerEmail: event.target.value })}
          />
        </Form.Item>
      </div>

      <Form.Item label="Hình thức nhận hàng" className="!mb-3">
        <Radio.Group
          value={values.deliveryMode}
          buttonStyle="solid"
          disabled={disabled}
          onChange={(event) => {
            const mode = event.target.value as PosCheckoutValues['deliveryMode'];
            onChange({
              deliveryMode: mode,
              // COD chỉ có nghĩa với đơn giao hàng; quay về quầy thì phải thu tiền ngay.
              ...(mode === 'PICKUP' && values.paymentMethod === 'COD'
                ? { paymentMethod: 'CASH' as PosCheckoutValues['paymentMethod'] }
                : {}),
            });
          }}
        >
          <Radio.Button value="PICKUP">Khách nhận tại quầy</Radio.Button>
          <Radio.Button value="DELIVERY">Giao tận nơi</Radio.Button>
        </Radio.Group>
      </Form.Item>

      {values.deliveryMode === 'DELIVERY' && (
        <div className="grid gap-x-4 md:grid-cols-2">
          <DeliveryAddressFields
            value={values.delivery}
            onChange={(patch) => onChange({ delivery: { ...values.delivery, ...patch } })}
          />
        </div>
      )}

      <Form.Item label="Ghi chú tại quầy" className="!mb-0">
        <Input.TextArea
          rows={2}
          maxLength={1000}
          showCount
          disabled={disabled}
          value={values.note}
          placeholder="Ví dụ: khách hẹn quay lại lắp đặt, đã tặng kèm thảm"
          onChange={(event) => onChange({ note: event.target.value })}
        />
      </Form.Item>
    </Form>
  );
}
