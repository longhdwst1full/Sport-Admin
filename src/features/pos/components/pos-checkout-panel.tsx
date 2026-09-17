import { Alert, Button, Divider, Form, Input, Radio, Select, Statistic } from 'antd';
import { WalletOutlined } from '@ant-design/icons';
import { useListAdminBranches } from '@/generated/api/organization/organization';
import { BranchDtoStatus } from '@/generated/api/organization/models';
import { CreatePosOrderDtoPaymentMethod } from '@/generated/api/orders/models';
import { CustomerLookup } from './customer-lookup';
import {
  moneyFormatter,
  posPaymentMethodHints,
  posPaymentMethodLabels,
} from '../constants/pos.constants';

export interface PosCheckoutValues {
  branchId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  paymentMethod: CreatePosOrderDtoPaymentMethod;
  note: string;
}

export function PosCheckoutPanel({
  values,
  onChange,
  total,
  quantity,
  submitting,
  blockedReason,
  onSubmit,
}: {
  values: PosCheckoutValues;
  onChange: (patch: Partial<PosCheckoutValues>) => void;
  total: number;
  quantity: number;
  submitting: boolean;
  /** Lý do chưa thu tiền được; undefined nghĩa là đã đủ điều kiện bán. */
  blockedReason?: string;
  onSubmit: () => void;
}) {
  const branches = useListAdminBranches();
  // Chỉ chi nhánh đang hoạt động mới bán được; chi nhánh đã ngừng vẫn tồn tại trong
  // dữ liệu để đọc lại lịch sử nhưng không phải nơi thu tiền hôm nay.
  const activeBranches = (branches.data?.items ?? []).filter(
    (branch) => branch.status === BranchDtoStatus.ACTIVE,
  );

  return (
    <div className="flex h-full flex-col">
      <Form layout="vertical" className="flex-1">
        <Form.Item label="Chi nhánh bán" required>
          <Select
            size="large"
            loading={branches.isLoading}
            value={values.branchId}
            placeholder="Chọn chi nhánh đang đứng quầy"
            onChange={(branchId) => onChange({ branchId })}
            options={activeBranches.map((branch) => ({
              value: branch.id,
              label: branch.name,
            }))}
          />
        </Form.Item>

        <Divider className="!my-3" orientation="left" plain>
          Khách hàng
        </Divider>

        <Form.Item label="Họ tên" required>
          <Input
            size="large"
            value={values.customerName}
            placeholder="Tên khách mua hàng"
            onChange={(event) => onChange({ customerName: event.target.value })}
          />
        </Form.Item>

        <Form.Item
          label="Số điện thoại"
          required
          extra="Gõ từ 3 số để tìm khách đã có trong hệ thống; khách mới thì nhập tay."
        >
          <CustomerLookup
            disabled={submitting}
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

        <Form.Item label="Email (không bắt buộc)">
          <Input
            size="large"
            value={values.customerEmail}
            placeholder="email@example.com"
            onChange={(event) => onChange({ customerEmail: event.target.value })}
          />
        </Form.Item>

        <Divider className="!my-3" orientation="left" plain>
          Thanh toán
        </Divider>

        <Form.Item
          label="Hình thức"
          extra={posPaymentMethodHints[values.paymentMethod]}
        >
          <Radio.Group
            value={values.paymentMethod}
            buttonStyle="solid"
            onChange={(event) =>
              onChange({ paymentMethod: event.target.value as CreatePosOrderDtoPaymentMethod })
            }
          >
            {Object.values(CreatePosOrderDtoPaymentMethod).map((method) => (
              <Radio.Button key={method} value={method}>
                {posPaymentMethodLabels[method]}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>

        <Form.Item label="Ghi chú tại quầy">
          <Input.TextArea
            rows={2}
            maxLength={1000}
            showCount
            value={values.note}
            placeholder="Ví dụ: khách hẹn quay lại lắp đặt, đã tặng kèm thảm"
            onChange={(event) => onChange({ note: event.target.value })}
          />
        </Form.Item>
      </Form>

      <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
        <Statistic
          title={`Tổng tiền · ${quantity} sản phẩm`}
          value={moneyFormatter.format(total)}
          valueStyle={{ color: '#047857', fontWeight: 700 }}
        />
        <p className="mt-1 text-xs text-slate-500">
          Số tiền cuối cùng do hệ thống tính lại khi tạo đơn.
        </p>

        {blockedReason && <Alert className="mt-3" type="warning" showIcon message={blockedReason} />}

        <Button
          block
          size="large"
          type="primary"
          className="mt-3"
          icon={<WalletOutlined />}
          loading={submitting}
          disabled={Boolean(blockedReason)}
          onClick={onSubmit}
        >
          Thu tiền và giao hàng
        </Button>
      </div>
    </div>
  );
}
