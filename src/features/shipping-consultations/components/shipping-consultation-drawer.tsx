import { useEffect, useState } from 'react';
import { MoneyInput } from '@/foundation/inputs/money-input';
import { Alert, Button, Descriptions, Drawer, Input, InputNumber, Select, Space, Typography } from 'antd';
import { useUpdateAdminManualShippingQuote } from '@/generated/api/checkout/checkout';
import {
  ListAdminShippingConsultationsStatus,
  type AdminShippingConsultationDto,
  type CheckoutQuoteDto,
} from '@/generated/api/checkout/models';
import {
  moneyFormatter,
  shippingProviderOptions,
} from '../constants/shipping-consultation.constants';

interface ShippingConsultationDrawerProps {
  consultation: AdminShippingConsultationDto | null;
  canManage: boolean;
  onClose: () => void;
  onSaved: (updated: CheckoutQuoteDto) => void | Promise<void>;
}

export function ShippingConsultationDrawer({
  consultation,
  canManage,
  onClose,
  onSaved,
}: ShippingConsultationDrawerProps) {
  const [shippingFee, setShippingFee] = useState(200000);
  const [etaMinDays, setEtaMinDays] = useState(1);
  const [etaMaxDays, setEtaMaxDays] = useState(3);
  const [provider, setProvider] = useState('MANUAL');
  const [agreementNote, setAgreementNote] = useState('');
  const manualQuote = useUpdateAdminManualShippingQuote();

  useEffect(() => {
    if (!consultation) return;
    setShippingFee(Number(consultation.shippingTotal ?? 200000));
    setEtaMinDays(consultation.etaMinDays ?? 1);
    setEtaMaxDays(consultation.etaMaxDays ?? 3);
    setProvider(consultation.shippingProvider ?? 'MANUAL');
    setAgreementNote('');
    manualQuote.reset();
  }, [consultation]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!consultation || !canManage) return;
    try {
      const updated = await manualQuote.mutateAsync({
        checkoutToken: consultation.checkoutToken,
        data: {
          shippingFee: String(shippingFee),
          etaMinDays,
          etaMaxDays,
          expectedVersion: consultation.version,
          agreementNote: agreementNote.trim(),
          provider,
        },
      });
      await onSaved(updated);
    } catch {
      // The normalized mutation state is rendered below.
    }
  };

  return (
    <Drawer
      width={620}
      open={Boolean(consultation)}
      title="Chốt phí giao hàng với khách"
      onClose={onClose}
      destroyOnClose
    >
      {consultation && (
        <Space direction="vertical" size="large" className="w-full">
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Khách hàng">
              {consultation.recipient.recipient} · {consultation.recipient.phone}
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">
              {[
                consultation.recipient.addressLine,
                consultation.recipient.ward,
                consultation.recipient.district,
                consultation.recipient.province,
              ].filter(Boolean).join(', ')}
            </Descriptions.Item>
            <Descriptions.Item label="Chi nhánh">{consultation.branchName}</Descriptions.Item>
            <Descriptions.Item label="Sản phẩm">
              {consultation.items.map((item) => `${item.name} ×${item.quantity}`).join('; ')}
            </Descriptions.Item>
            <Descriptions.Item label="Tạm tính">
              {moneyFormatter.format(Number(consultation.itemSubtotal))}
            </Descriptions.Item>
            <Descriptions.Item label="Ghi chú khách">
              {consultation.customerNote || 'Không có'}
            </Descriptions.Item>
          </Descriptions>

          {consultation.status === ListAdminShippingConsultationsStatus.AWAITING_SHIPPING_CONSULTATION && canManage ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <Typography.Title level={5} className="!mt-0">Thông tin đã thống nhất</Typography.Title>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Phí giao <span className="text-red-500">*</span>
                  <MoneyInput className="mt-1 !w-full" min={0} value={shippingFee} onChange={(value) => setShippingFee(value ?? 0)} addonAfter="VND" />
                </label>
                <label className="text-sm font-medium">
                  Hình thức <span className="text-red-500">*</span>
                  <Select className="mt-1 w-full" value={provider} options={[...shippingProviderOptions]} onChange={setProvider} />
                </label>
                <label className="text-sm font-medium">
                  ETA tối thiểu <span className="text-red-500">*</span>
                  <InputNumber className="mt-1 !w-full" min={0} value={etaMinDays} onChange={(value) => setEtaMinDays(value ?? 0)} addonAfter="ngày" />
                </label>
                <label className="text-sm font-medium">
                  ETA tối đa <span className="text-red-500">*</span>
                  <InputNumber className="mt-1 !w-full" min={0} value={etaMaxDays} onChange={(value) => setEtaMaxDays(value ?? 0)} addonAfter="ngày" />
                </label>
                <label className="text-sm font-medium sm:col-span-2">
                  Nội dung khách đã đồng ý <span className="text-red-500">*</span>
                  <Input.TextArea
                    className="mt-1"
                    rows={4}
                    value={agreementNote}
                    onChange={(event) => setAgreementNote(event.target.value)}
                    placeholder="Ví dụ: Đã gọi số 09..., khách đồng ý phí 100.000đ, giao trong 2-3 ngày."
                  />
                </label>
              </div>
              {manualQuote.isError && (
                <Alert
                  className="mt-4"
                  type="error"
                  showIcon
                  message="Không lưu được phí đã thống nhất"
                  description="Dữ liệu có thể vừa thay đổi hoặc phiên không có quyền với chi nhánh. Hãy tải lại rồi thử lại."
                />
              )}
              <Button
                type="primary"
                className="mt-4"
                loading={manualQuote.isPending}
                disabled={agreementNote.trim().length < 10 || etaMaxDays < etaMinDays}
                onClick={() => void save()}
              >
                Lưu và mở lại quote cho khách
              </Button>
            </div>
          ) : consultation.status === ListAdminShippingConsultationsStatus.AWAITING_SHIPPING_CONSULTATION ? (
            <Alert
              type="info"
              showIcon
              message="Bạn chỉ có quyền xem"
              description="Cần quyền order.manage để chốt phí, ETA và phương án giao với khách."
            />
          ) : (
            <Alert type="success" showIcon message="Phí giao đã được chốt; đang chờ khách xác nhận giữ hàng." />
          )}
        </Space>
      )}
    </Drawer>
  );
}
