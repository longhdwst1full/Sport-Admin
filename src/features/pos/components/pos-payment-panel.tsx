import { Alert, Descriptions, Form, Radio, Switch } from 'antd';
import { MoneyInput } from '@/foundation/inputs/money-input';
import { PosPaymentMethod } from '@/generated/api/orders/orders.schemas';
import { changeFor, shortfallFor } from '../model/pos-cash';
import {
  moneyFormatter,
  posPaymentMethodHints,
  posPaymentMethodLabels,
} from '../constants/pos.constants';

/**
 * Khối thu tiền của phiếu bán tại quầy.
 *
 * Tiền khách đưa và tiền thối chỉ sống trên màn hình. Backend chỉ ghi nhận đơn đã thu đủ hay chưa;
 * gửi thêm số tiền đưa sẽ tạo ra một khoản thu không khớp tổng đơn mà không ai đối soát được.
 */
export function PosPaymentPanel({
  total,
  method,
  isDelivery,
  handOverImmediately,
  cashReceived,
  disabled,
  onChange,
}: {
  total: number;
  method: PosPaymentMethod;
  isDelivery: boolean;
  handOverImmediately: boolean;
  cashReceived: number | null;
  disabled?: boolean;
  onChange: (patch: {
    paymentMethod?: PosPaymentMethod;
    cashReceived?: number | null;
    handOverImmediately?: boolean;
  }) => void;
}) {
  const change = changeFor(total, cashReceived);
  const shortfall = shortfallFor(total, cashReceived);

  return (
    <Form layout="vertical">
      <Form.Item label="Hình thức thanh toán" extra={posPaymentMethodHints[method]} className="!mb-3">
        <Radio.Group
          value={method}
          buttonStyle="solid"
          disabled={disabled}
          onChange={(event) =>
            onChange({ paymentMethod: event.target.value as PosPaymentMethod })
          }
        >
          {Object.values(PosPaymentMethod).map((value) => (
            <Radio.Button
              key={value}
              value={value}
              // Thu hộ khi giao không áp dụng cho khách cầm hàng về ngay tại quầy.
              disabled={value === PosPaymentMethod.COD && !isDelivery}
            >
              {posPaymentMethodLabels[value]}
            </Radio.Button>
          ))}
        </Radio.Group>
      </Form.Item>

      {method === PosPaymentMethod.CASH && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Form.Item label="Tiền khách đưa" className="!mb-0">
            {/* Dùng MoneyInput thay cho formatter/parser viết tay: hai bản quy tắc phân cách
                hàng nghìn là hai chỗ để chúng lệch nhau. */}
            <MoneyInput
              className="!w-full"
              size="large"
              step={1000}
              disabled={disabled}
              value={cashReceived ?? undefined}
              placeholder="Nhập số tiền nhận"
              onChange={(value) => onChange({ cashReceived: value == null ? null : Number(value) })}
            />
          </Form.Item>
          <Form.Item label="Tiền thối lại" className="!mb-0">
            <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-base font-bold text-emerald-700">
              {change === null ? '—' : moneyFormatter.format(change)}
            </div>
          </Form.Item>
          {shortfall !== null && (
            <Alert
              className="sm:col-span-2"
              type="warning"
              showIcon
              message={`Khách còn thiếu ${moneyFormatter.format(shortfall)}`}
            />
          )}
        </div>
      )}

      {method === PosPaymentMethod.BANK_TRANSFER && (
        <Descriptions bordered size="small" column={1} className="mb-3">
          <Descriptions.Item label="Số tiền cần chuyển">
            <strong>{moneyFormatter.format(total)}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Nội dung chuyển khoản">
            {/* Mã đơn chỉ có sau khi tạo; ghi rõ để nhân viên không đọc nhầm số nào cho khách. */}
            Mã đơn được sinh sau khi tạo đơn — đọc cho khách ở màn hình hoá đơn.
          </Descriptions.Item>
          <Descriptions.Item label="Xác nhận">
            Chỉ bấm tạo đơn sau khi đã thấy báo có trong tài khoản cửa hàng.
          </Descriptions.Item>
        </Descriptions>
      )}

      {isDelivery && (
        <Form.Item
          label="Khách lấy hàng ngay"
          extra="Bật khi khách tới cửa hàng lấy luôn; đơn sẽ được đánh dấu đã giao ngay sau khi tạo."
          className="!mb-0"
        >
          <Switch
            checked={handOverImmediately}
            disabled={disabled}
            onChange={(next) => onChange({ handOverImmediately: next })}
          />
        </Form.Item>
      )}
    </Form>
  );
}
