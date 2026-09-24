import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Checkbox, Form, Input, InputNumber, Modal, Radio, Select, Table, Typography } from 'antd';
import { useCan } from '@/core/auth/permissions';
import { CurrencyAmount } from '@/foundation/typography/currency-amount';
import {
  createAdminReturn,
  createAdminReturnEvidenceUpload,
  getGetAdminReturnEligibilityQueryKey,
  getGetAdminReturnQueueSummaryQueryKey,
  getListAdminReturnsQueryKey,
} from '@/generated/api/returns/returns';
import type { ReturnDetailDto, ReturnEligibilityDto, ReturnEligibilityLineDto } from '@/generated/api/returns/models';
import { getApiErrorMessage } from '@/lib/api/error';
import type { UploadedSignedImage } from '@/lib/media/upload-signed-image';
import { RETURN_PERMISSION, returnFaultLabels, returnReasonLabels } from '../constants/return.constants';
import { CREATE_RETURN_TABLE_COLUMNS, type CreateReturnColumnId } from '../constants/return-table-columns';
import { buildTableColumns } from '../model/build-table-columns';
import { nextIdempotencyKey } from '../model/return-actions.policy';
import { estimateSelection, toCreateReturnPayload, type CreateReturnFormValues } from '../model/return-form.mapper';
import { EvidenceImageUpload } from './evidence-image-upload';

interface CreateReturnModalProps {
  eligibility: ReturnEligibilityDto;
  open: boolean;
  onClose: () => void;
  onCreated: (created: ReturnDetailDto) => void;
}

/**
 * Nhân viên tạo phiếu trả hộ khách (D55). Người có quyền duyệt tạo thì phiếu được duyệt ngay nên
 * phải chốt lỗi thuộc về ai (D56). Quá hạn chỉ hiện ô lý do khi API báo tài khoản được override.
 */
export function CreateReturnModal({ eligibility, open, onClose, onCreated }: CreateReturnModalProps) {
  const queryClient = useQueryClient();
  const canDecide = useCan(RETURN_PERMISSION.DECIDE);
  const [form] = Form.useForm<CreateReturnFormValues>();
  const [images, setImages] = useState<UploadedSignedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const idempotencyRef = useRef<{ signature: string; key: string } | undefined>(undefined);
  const quantities = Form.useWatch('quantities', form) ?? {};
  const lines = eligibility.items;
  const estimate = estimateSelection(lines, quantities);
  const hasSelection = estimate > 0 || lines.some((line) => (quantities[line.orderItemId] ?? 0) > 0);

  const mutation = useMutation({
    retry: false,
    mutationFn: (values: CreateReturnFormValues) => {
      const payload = toCreateReturnPayload(eligibility.orderId, lines, values, images);
      idempotencyRef.current = nextIdempotencyKey(idempotencyRef.current, JSON.stringify(payload));
      return createAdminReturn(payload, { headers: { 'Idempotency-Key': idempotencyRef.current.key } });
    },
    onSuccess: async (created) => {
      idempotencyRef.current = undefined;
      // CACHE: phiếu mới làm đổi hàng đợi, ô đếm và điều kiện trả của chính đơn này.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminReturnsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetAdminReturnQueueSummaryQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetAdminReturnEligibilityQueryKey(eligibility.orderId) }),
      ]);
      onCreated(created);
      reset();
    },
  });

  const reset = () => {
    form.resetFields();
    setImages([]);
    mutation.reset();
  };
  const close = () => {
    if (mutation.isPending) return;
    reset();
    onClose();
  };

  const createColumns = buildTableColumns<ReturnEligibilityLineDto, CreateReturnColumnId>(CREATE_RETURN_TABLE_COLUMNS, {
    product: (line) => (
      <div>
        <strong>{line.productName}</strong>
        <div className="text-xs text-slate-500">{line.sku} · {line.variantName}</div>
        {line.isBundle && <div className="text-xs text-amber-600">Combo: chỉ trả nguyên bộ</div>}
        {line.blockedByCategory && <div className="text-xs text-rose-600">Danh mục không áp dụng đổi trả</div>}
      </div>
    ),
    requestedQuantity: (line) => {
      if (line.returnableQuantity <= 0) return <span className="text-slate-400">—</span>;
      // UX: combo là một khối — tick để trả toàn bộ phần còn lại, không nhập số lẻ.
      if (line.isBundle) {
        return (
          <Form.Item
            name={['quantities', line.orderItemId]}
            noStyle
            getValueFromEvent={(event: { target: { checked: boolean } }) => (event.target.checked ? line.returnableQuantity : 0)}
            getValueProps={(value?: number) => ({ checked: (value ?? 0) > 0 })}
          >
            <Checkbox>Trả {line.returnableQuantity} bộ</Checkbox>
          </Form.Item>
        );
      }
      return (
        <Form.Item name={['quantities', line.orderItemId]} noStyle>
          <InputNumber min={0} max={line.returnableQuantity} precision={0} className="w-full" />
        </Form.Item>
      );
    },
  });

  return (
    <Modal
      open={open}
      title={`Tạo phiếu trả · Đơn ${eligibility.orderNo}`}
      okText={canDecide ? 'Tạo và duyệt' : 'Gửi yêu cầu'}
      cancelText="Đóng"
      width={860}
      okButtonProps={{ loading: mutation.isPending, disabled: uploading || !hasSelection }}
      cancelButtonProps={{ disabled: mutation.isPending }}
      maskClosable={!mutation.isPending}
      onOk={() => form.submit()}
      onCancel={close}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        disabled={mutation.isPending}
        initialValues={{ quantities: {} }}
        onFinish={(values) => mutation.mutate(values)}
      >
        {mutation.isError && <Alert className="mb-4" type="error" showIcon message={getApiErrorMessage(mutation.error)} />}
        {eligibility.windowOverrideRequired && (
          <Alert
            className="mb-4"
            type="warning"
            showIcon
            message={`Đơn đã quá hạn đổi trả ${eligibility.windowDays} ngày. Bạn có quyền nhận trả ngoại lệ nhưng phải ghi lý do.`}
          />
        )}

        <Table
          rowKey="orderItemId"
          size="small"
          pagination={false}
          dataSource={lines}
          className="mb-4"
          columns={createColumns}
        />

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item name="reasonCode" label="Lý do" rules={[{ required: true, message: 'Chọn lý do' }]}>
            <Select options={Object.entries(returnReasonLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          {canDecide && (
            <Form.Item
              name="fault"
              label="Lỗi thuộc về ai"
              extra="Phiếu do bạn tạo được duyệt ngay."
              rules={[{ required: true, message: 'Chọn lỗi thuộc về ai' }]}
            >
              <Radio.Group options={Object.entries(returnFaultLabels).map(([value, label]) => ({ value, label }))} />
            </Form.Item>
          )}
        </div>
        {eligibility.windowOverrideRequired && (
          <Form.Item
            name="windowOverrideNote"
            label="Lý do nhận trả quá hạn"
            rules={[{ required: true, whitespace: true, min: 5, message: 'Nhập lý do ít nhất 5 ký tự' }]}
          >
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
        )}
        <Form.Item name="description" label="Mô tả của khách">
          <Input.TextArea rows={3} maxLength={2000} showCount />
        </Form.Item>
        <Form.Item label="Ảnh minh chứng (không bắt buộc)">
          <EvidenceImageUpload
            value={images}
            onChange={setImages}
            onUploadingChange={setUploading}
            disabled={mutation.isPending}
            sign={(request) => createAdminReturnEvidenceUpload({ ...request, orderId: eligibility.orderId })}
          />
        </Form.Item>
        <Typography.Paragraph className="mb-0">
          Hoàn dự kiến: <strong><CurrencyAmount amount={estimate} /></strong>
          <Typography.Text type="secondary" className="ml-1 text-xs">
            (chưa gồm phí giao; số chính thức chốt khi kiểm hàng)
          </Typography.Text>
        </Typography.Paragraph>
      </Form>
    </Modal>
  );
}
