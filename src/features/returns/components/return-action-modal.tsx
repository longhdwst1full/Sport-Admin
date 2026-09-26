import { useEffect, useState } from 'react';
import { Alert, Checkbox, Form, Input, Modal, Radio, Select, Table, Typography } from 'antd';
import { createAdminReturnRefundProofUpload } from '@/generated/api/returns/returns';
import type {
  ReturnCondition,
  ReturnItemDisposition,
  RefundMethod,
  ReturnDetailDto,
  ReturnItemDto,
} from '@/generated/api/returns/returns.schemas';
import { CurrencyAmount } from '@/foundation/typography/currency-amount';
import { MoneyInput } from '@/foundation/inputs/money-input';
import { getApiErrorMessage } from '@/lib/api/error';
import type { UploadedSignedImage } from '@/lib/media/upload-signed-image';
import {
  inspectionConditionLabels,
  inspectionDispositionLabels,
  refundMethodLabels,
  returnFaultLabels,
} from '../constants/return.constants';
import { INSPECTION_TABLE_COLUMNS, type InspectionColumnId } from '../constants/return-table-columns';
import type { ReturnCommand } from '../hooks/use-return-command';
import { buildTableColumns } from '../model/build-table-columns';
import type { ReturnAction } from '../model/return-actions.policy';
import { toInspectionPayload, toProofImages, type InspectionRow } from '../model/return-form.mapper';
import { EvidenceImageUpload } from './evidence-image-upload';

const titles: Record<ReturnAction, { title: string; okText: string; danger?: boolean }> = {
  approve: { title: 'Duyệt phiếu trả', okText: 'Duyệt' },
  reject: { title: 'Từ chối phiếu trả', okText: 'Từ chối', danger: true },
  cancel: { title: 'Huỷ phiếu trả', okText: 'Huỷ phiếu', danger: true },
  receive: { title: 'Nhận & kiểm hàng trả về', okText: 'Lưu kết quả kiểm' },
  requestRefund: { title: 'Tạo lượt hoàn tiền', okText: 'Tạo lượt hoàn' },
  confirmRefund: { title: 'Xác nhận đã hoàn tiền', okText: 'Xác nhận đã hoàn' },
  failRefund: { title: 'Lượt hoàn không thực hiện được', okText: 'Đánh dấu lỗi', danger: true },
  close: { title: 'Đóng phiếu trả', okText: 'Đóng phiếu' },
};

interface FormValues {
  fault?: 'SHOP' | 'CUSTOMER';
  note?: string;
  reason?: string;
  items?: InspectionRow[];
  method?: RefundMethod;
  amount?: number;
  externalRef?: string;
  cashHandedOver?: boolean;
}

interface ReturnActionModalProps {
  detail: ReturnDetailDto;
  action?: ReturnAction;
  submitting: boolean;
  error: unknown;
  onSubmit: (command: ReturnCommand) => void;
  onClose: () => void;
}

/**
 * Một modal cho mọi lệnh trên phiếu trả. Modal chỉ đóng khi lệnh thành công (component cha gọi
 * `onClose`); lỗi giữ nguyên dữ liệu đã nhập để người dùng sửa rồi gửi lại cùng Idempotency-Key.
 */
export function ReturnActionModal({ detail, action, submitting, error, onSubmit, onClose }: ReturnActionModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [proofImages, setProofImages] = useState<UploadedSignedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const pendingRefund = detail.refunds.find((refund) => refund.status === 'PENDING');
  const refundable = Number(detail.refundableAmount);
  const method = Form.useWatch('method', form);
  const amount = Form.useWatch('amount', form);
  const conditions = Form.useWatch('items', form);

  useEffect(() => {
    if (!action) return;
    form.resetFields();
    setProofImages([]);
    form.setFieldsValue({
      items: detail.items.map(() => ({ condition: 'SELLABLE' as ReturnCondition })),
      method: detail.allowedRefundMethods[0],
      amount: refundable,
    });
  }, [action, detail, form, refundable]);

  if (!action) return null;
  const meta = titles[action];

  const submit = (values: FormValues) => {
    const expectedVersion = detail.version;
    const note = values.note?.trim() || undefined;
    const reason = values.reason?.trim() ?? '';
    switch (action) {
      case 'approve': return onSubmit({ action, body: { expectedVersion, fault: values.fault!, note } });
      case 'reject':
      case 'cancel': return onSubmit({ action, body: { expectedVersion, reason } });
      case 'close': return onSubmit({ action, body: { expectedVersion, note } });
      case 'receive':
        return onSubmit({ action, body: { expectedVersion, note, items: toInspectionPayload(detail.items, values.items ?? []) } });
      case 'requestRefund':
        // CONTRACT: ô nhập giữ số để nhóm hàng nghìn; API nhận chuỗi thập phân. VND không có phần lẻ.
        return onSubmit({ action, body: { expectedVersion, note, method: values.method!, amount: String(values.amount ?? 0) } });
      case 'confirmRefund':
        return onSubmit({
          action,
          refundId: pendingRefund!.id,
          body: {
            expectedVersion,
            externalRef: values.externalRef?.trim() || undefined,
            cashHandedOver: pendingRefund!.method === 'CASH' ? values.cashHandedOver === true : undefined,
            proofImages: toProofImages(proofImages),
          },
        });
      case 'failRefund': return onSubmit({ action, refundId: pendingRefund!.id, body: { expectedVersion, reason } });
    }
  };

  const reasonField = (
    <Form.Item
      name="reason"
      label="Lý do"
      rules={[{ required: true, whitespace: true, min: 5, message: 'Nhập lý do ít nhất 5 ký tự' }]}
    >
      <Input.TextArea rows={3} maxLength={500} showCount />
    </Form.Item>
  );
  const noteField = (
    <Form.Item name="note" label="Ghi chú">
      <Input.TextArea rows={2} maxLength={500} showCount />
    </Form.Item>
  );

  const inspectionColumns = buildTableColumns<ReturnItemDto, InspectionColumnId>(INSPECTION_TABLE_COLUMNS, {
    product: (item) => (
      <div>
        <strong>{item.productName}</strong>
        <div className="text-xs text-slate-500">{item.sku} · {item.variantName}</div>
        {item.itemType === 'BUNDLE' && <div className="text-xs text-amber-600">Combo: kiểm nguyên bộ</div>}
      </div>
    ),
    condition: (_item, index) => (
      <Form.Item name={['items', index, 'condition']} noStyle rules={[{ required: true }]}>
        <Select
          className="w-full"
          options={Object.entries(inspectionConditionLabels).map(([value, label]) => ({ value, label }))}
        />
      </Form.Item>
    ),
    disposition: (_item, index) => {
      const condition = conditions?.[index]?.condition;
      // UX: chỉ hàng hỏng mới có lựa chọn; hai trường hợp còn lại do API cố định.
      if (condition !== 'DAMAGED') {
        return (
          <Typography.Text type="secondary">
            {inspectionDispositionLabels[condition === 'MISSING' ? 'WRITE_OFF' : 'RESTOCK']}
          </Typography.Text>
        );
      }
      return (
        <Form.Item name={['items', index, 'disposition']} noStyle rules={[{ required: true, message: 'Chọn cách xử lý hàng hỏng' }]}>
          <Select<ReturnItemDisposition>
            className="w-full"
            placeholder="Chọn"
            options={(['HOLD', 'WRITE_OFF'] as const).map((value) => ({ value, label: inspectionDispositionLabels[value] }))}
          />
        </Form.Item>
      );
    },
    note: (_item, index) => (
      <Form.Item name={['items', index, 'note']} noStyle>
        <Input maxLength={500} placeholder="Tuỳ chọn" />
      </Form.Item>
    ),
  });

  return (
    <Modal
      open
      title={meta.title}
      okText={meta.okText}
      cancelText="Đóng"
      width={action === 'receive' ? 860 : 560}
      okButtonProps={{ danger: meta.danger, loading: submitting, disabled: uploading }}
      cancelButtonProps={{ disabled: submitting }}
      maskClosable={!submitting}
      closable={!submitting}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={submit} disabled={submitting}>
        {Boolean(error) && (
          <Alert className="mb-4" type="error" showIcon message={getApiErrorMessage(error)} />
        )}

        {action === 'approve' && (
          <>
            <Form.Item
              name="fault"
              label="Lỗi thuộc về ai"
              extra="Lỗi cửa hàng thì số tiền hoàn cộng thêm phí giao ban đầu."
              rules={[{ required: true, message: 'Chọn lỗi thuộc về ai' }]}
            >
              <Radio.Group
                options={Object.entries(returnFaultLabels).map(([value, label]) => ({ value, label }))}
              />
            </Form.Item>
            {noteField}
          </>
        )}

        {(action === 'reject' || action === 'cancel' || action === 'failRefund') && (
          <>
            {action === 'failRefund' && pendingRefund && (
              <Alert
                className="mb-4"
                type="warning"
                showIcon
                message={`Lượt ${pendingRefund.refundNo} (${refundMethodLabels[pendingRefund.method]}) sẽ không được tính là đã hoàn; có thể tạo lượt mới sau đó.`}
              />
            )}
            {reasonField}
          </>
        )}

        {action === 'close' && (
          <>
            {refundable > 0 && (
              <Alert
                className="mb-4"
                type="warning"
                showIcon
                message={<span>Phiếu vẫn còn <CurrencyAmount amount={refundable} /> có thể hoàn. Đóng phiếu nghĩa là không hoàn thêm.</span>}
              />
            )}
            {noteField}
          </>
        )}

        {action === 'receive' && (
          <>
            <Alert
              className="mb-4"
              type="info"
              showIcon
              message="Chỉ hàng còn bán được mới nhập lại kho bán. Hàng hỏng chọn giữ lại hoặc huỷ; hàng không nhận được không được hoàn tiền."
            />
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={detail.items}
              columns={inspectionColumns}
            />
            <div className="mt-4">{noteField}</div>
          </>
        )}

        {action === 'requestRefund' && (
          <>
            <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
              <div>Trần hoàn của phiếu: <CurrencyAmount amount={detail.refundCap} /></div>
              <div>Đã hoàn: <CurrencyAmount amount={detail.refundedAmount} /></div>
              <div className="font-semibold">Tối đa còn hoàn: <CurrencyAmount amount={refundable} /></div>
            </div>
            <Form.Item name="method" label="Phương thức" rules={[{ required: true }]}>
              <Radio.Group
                options={detail.allowedRefundMethods.map((value) => ({ value, label: refundMethodLabels[value] }))}
              />
            </Form.Item>
            <Form.Item
              name="amount"
              label="Số tiền hoàn"
              rules={[
                { required: true, message: 'Nhập số tiền' },
                {
                  validator: (_, value?: number) =>
                    value && value > 0 && value <= refundable
                      ? Promise.resolve()
                      : Promise.reject(new Error('Số tiền phải lớn hơn 0 và không vượt số còn hoàn')),
                },
              ]}
            >
              <MoneyInput className="w-full" max={refundable} addonAfter="đ" />
            </Form.Item>
            {typeof amount === 'number' && amount > 0 && amount <= refundable && (
              <Alert
                className="mb-4"
                type="error"
                showIcon
                message={(
                  <span>
                    Bạn đang hoàn <CurrencyAmount amount={amount} />. Sau lượt này còn có thể hoàn{' '}
                    <CurrencyAmount amount={refundable - amount} />.
                  </span>
                )}
              />
            )}
            {method === 'BANK_TRANSFER' && (
              <Typography.Paragraph type="secondary" className="text-xs">
                Chuyển khoản xong mới bấm "Xác nhận đã hoàn" và nhập mã giao dịch ngân hàng.
              </Typography.Paragraph>
            )}
            {noteField}
          </>
        )}

        {action === 'confirmRefund' && pendingRefund && (
          <>
            <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
              <div>Lượt: <strong>{pendingRefund.refundNo}</strong></div>
              <div>Phương thức: {refundMethodLabels[pendingRefund.method]}</div>
              <div>Số tiền: <strong><CurrencyAmount amount={pendingRefund.amount} /></strong></div>
            </div>
            {pendingRefund.method === 'BANK_TRANSFER' ? (
              <Form.Item
                name="externalRef"
                label="Mã giao dịch ngân hàng"
                rules={[{ required: true, whitespace: true, message: 'Nhập mã giao dịch để đối chiếu' }]}
              >
                <Input maxLength={255} placeholder="VD: FT24268123456" />
              </Form.Item>
            ) : (
              <>
                <Form.Item
                  name="cashHandedOver"
                  valuePropName="checked"
                  rules={[{
                    validator: (_, value?: boolean) =>
                      value ? Promise.resolve() : Promise.reject(new Error('Phải xác nhận đã đưa tiền cho khách')),
                  }]}
                >
                  <Checkbox>Tôi đã đưa đủ tiền mặt cho khách</Checkbox>
                </Form.Item>
                <Form.Item name="externalRef" label="Số biên nhận (nếu có)">
                  <Input maxLength={255} />
                </Form.Item>
              </>
            )}
            <Form.Item label="Ảnh chứng từ (biên lai, màn hình chuyển khoản)" extra="Lưu cùng lượt hoàn để đối chiếu về sau. Khách không xem được.">
              <EvidenceImageUpload
                value={proofImages}
                onChange={setProofImages}
                onUploadingChange={setUploading}
                disabled={submitting}
                sign={(request) => createAdminReturnRefundProofUpload(detail.id, request)}
              />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
