import { useRef, useState } from 'react';
import { Alert, Button, Descriptions, Drawer, Empty, Form, Image, Input, Modal, Space, Spin, Tag, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmAdminPayment,
  getAdminPayment,
  getGetAdminPaymentQueryKey,
  rejectAdminPayment,
} from '@/generated/api/payments/payments';
import { getGetAdminOrderQueryKey, getListAdminOrdersQueryKey } from '@/generated/api/orders/orders';
import { getApiErrorMessage } from '@/lib/api/error';
import { moneyFormatter, paymentMethodLabels, paymentStatusPresentation } from '../constants/payment.constants';

type Action = 'confirm' | 'reject';

export function PaymentDetailDrawer({ paymentId, onClose }: { paymentId?: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<Action>();
  const [form] = Form.useForm<{ receivedAmount: string; reference: string; note?: string; reason?: string }>();
  const idempotencyRef = useRef<{ signature: string; key: string } | undefined>(undefined);
  const detail = useQuery({
    queryKey: getGetAdminPaymentQueryKey(paymentId),
    enabled: Boolean(paymentId),
    retry: false,
    queryFn: ({ signal }) => getAdminPayment(paymentId!, signal),
  });
  const payment = detail.data;
  const mutation = useMutation({
    retry: false,
    mutationFn: async (values: { receivedAmount: string; reference: string; note?: string; reason?: string }) => {
      if (!payment || !action) throw new Error('Chưa tải được thanh toán');
      const signature = action === 'confirm'
        ? `${action}:${payment.id}:${payment.version}:${values.receivedAmount.trim()}:${values.reference.trim()}:${values.note?.trim() ?? ''}`
        : `${action}:${payment.id}:${payment.version}:${values.reason?.trim() ?? ''}`;
      if (idempotencyRef.current?.signature !== signature) {
        idempotencyRef.current = { signature, key: crypto.randomUUID() };
      }
      const options = { headers: { 'idempotency-key': idempotencyRef.current.key } };
      return action === 'confirm'
        ? confirmAdminPayment(payment.id, { expectedVersion: payment.version, receivedAmount: values.receivedAmount, reference: values.reference, note: values.note }, options)
        : rejectAdminPayment(payment.id, { expectedVersion: payment.version, reason: values.reason ?? '' }, options);
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(getGetAdminPaymentQueryKey(updated.id), updated);
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/payments'] });
      await queryClient.invalidateQueries({ queryKey: getGetAdminOrderQueryKey(updated.orderId) });
      await queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
      closeAction();
    },
  });
  const closeAction = () => {
    if (mutation.isPending) return;
    mutation.reset();
    idempotencyRef.current = undefined;
    form.resetFields();
    setAction(undefined);
  };
  const closeDrawer = () => {
    if (mutation.isPending) return;
    closeAction();
    onClose();
  };
  const status = payment ? paymentStatusPresentation[payment.status] ?? { label: payment.status, color: 'default' } : undefined;
  // UX: COD chỉ mở thao tác thu tiền khi đơn đã giao; backend vẫn kiểm tra lại
  // để UI không bao giờ trở thành ranh giới bảo mật/nghiệp vụ duy nhất.
  const canConfirm = payment && !['SUCCESS', 'CANCELLED'].includes(payment.status)
    && (payment.method === 'COD'
      ? payment.orderStatus === 'DELIVERED'
      : ['AWAITING_CONFIRMATION', 'NEED_REVIEW'].includes(payment.status));
  const canReject = payment && ['AWAITING_CONFIRMATION', 'NEED_REVIEW'].includes(payment.status);

  return (
    <>
      <Drawer open={Boolean(paymentId)} onClose={closeDrawer} width={720} title={payment ? `Thanh toán ${payment.paymentRef}` : 'Chi tiết thanh toán'} destroyOnHidden>
        {detail.isLoading ? <div className="grid min-h-64 place-items-center"><Spin size="large" /></div> : detail.isError ? <Alert type="error" showIcon message="Không tải được thanh toán" description={getApiErrorMessage(detail.error)} /> : !payment ? <Empty /> : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><Typography.Title level={4} className="!mb-1">{payment.orderNo}</Typography.Title><Typography.Text type="secondary">{paymentMethodLabels[payment.method] ?? payment.method}</Typography.Text></div>{status && <Tag color={status.color}>{status.label}</Tag>}</div>
            <Descriptions bordered size="small" column={2} items={[
              { key: 'expected', label: 'Phải thu', children: moneyFormatter.format(Number(payment.expectedAmount)) },
              { key: 'received', label: 'Đã nhận', children: moneyFormatter.format(Number(payment.receivedAmount)) },
              { key: 'orderStatus', label: 'Trạng thái đơn', children: payment.orderStatus },
              { key: 'version', label: 'Phiên bản', children: payment.version },
              { key: 'expiry', label: 'Hết hạn', children: payment.expiresAt ? new Date(payment.expiresAt).toLocaleString('vi-VN') : 'Không áp dụng' },
            ]} />
            {payment.failureReason && <Alert type="warning" showIcon message={payment.failureReason} />}
            <section><Typography.Title level={5}>Bằng chứng chuyển khoản</Typography.Title>{payment.evidences.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có bằng chứng" /> : <div className="grid gap-4 sm:grid-cols-2">{payment.evidences.map((evidence) => <div key={evidence.id} className="rounded-xl border border-slate-200 p-3"><Image src={evidence.thumbnailUrl} preview={{ src: evidence.fileUrl }} className="max-h-48 rounded-lg object-contain" /><div className="mt-2 flex justify-between"><span>#{evidence.id}</span><Tag>{evidence.status}</Tag></div>{evidence.note && <p className="mt-2 text-sm text-slate-600">{evidence.note}</p>}</div>)}</div>}</section>
            <Space><Button type="primary" disabled={!canConfirm} onClick={() => { setAction('confirm'); form.setFieldsValue({ receivedAmount: payment.expectedAmount }); }}>Xác nhận đủ tiền</Button><Button danger disabled={!canReject} onClick={() => setAction('reject')}>Từ chối bằng chứng</Button></Space>
          </div>
        )}
      </Drawer>
      <Modal open={Boolean(action)} title={action === 'confirm' ? 'Xác nhận thanh toán' : 'Từ chối bằng chứng'} onCancel={closeAction} onOk={() => form.submit()} okButtonProps={{ loading: mutation.isPending }} cancelButtonProps={{ disabled: mutation.isPending }} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={(values) => mutation.mutate(values)}>
          {action === 'confirm' ? <><Form.Item name="receivedAmount" label="Số tiền thực nhận" rules={[{ required: true, message: 'Vui lòng nhập số tiền thực nhận' }, { pattern: /^\d{1,17}(\.\d{1,2})?$/, message: 'Số tiền không hợp lệ' }]}><Input /></Form.Item><Form.Item name="reference" label="Mã giao dịch/đối soát" rules={[{ required: true, message: 'Vui lòng nhập mã đối soát' }]}><Input maxLength={255} /></Form.Item><Form.Item name="note" label="Ghi chú"><Input.TextArea rows={3} maxLength={1000} /></Form.Item></> : <Form.Item name="reason" label="Lý do từ chối" rules={[{ required: true, min: 3, message: 'Vui lòng nhập lý do ít nhất 3 ký tự' }]}><Input.TextArea rows={4} maxLength={500} /></Form.Item>}
          {mutation.isError && <Alert type="error" showIcon message={getApiErrorMessage(mutation.error, 'Không cập nhật được thanh toán.')} />}
        </Form>
      </Modal>
    </>
  );
}
