import { useRef, useState } from 'react';
import { Alert, App, Button, DatePicker, Descriptions, Empty, Form, Image, Input, Space, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmAdminPayment,
  getAdminPayment,
  getGetAdminPaymentQueryKey,
  getListAdminPaymentsQueryKey,
  recordLatePaymentReceipt,
  recordManualRefundAdmin,
  rejectAdminPayment,
} from '@/generated/api/payments/payments';
import { getGetAdminFulfillmentByOrderQueryKey } from '@/generated/api/fulfillments/fulfillments';
import { getGetAdminOrderQueryKey, getListAdminOrdersQueryKey } from '@/generated/api/orders/orders';
import { OrderStatus } from '@/generated/api/orders/orders.schemas';
import { useCan } from '@/core/auth/permissions';
import { getApiErrorMessage } from '@/lib/api/error';
import { formatDateTime } from '@/lib/format/datetime';
import { MoneyInput } from '@/foundation/inputs/money-input';
import { StatusTag } from '@/foundation/management';
import { DetailDrawer, FormModal, useConfirmWithReason } from '@/foundation/overlay';
import { nextIdempotencyKey } from '@/shared/utils/idempotency';
import { parseEnum } from '@/shared/utils/parse-enum';
import {
  moneyFormatter,
  paymentEvidenceStatusPresentation,
  paymentMethodLabels,
  paymentStatusPresentation,
} from '../constants/payment.constants';
import { orderStatusPresentation } from '@/features/order-status';

/**
 * `receivedAmount` giữ dạng SỐ trong form để ô nhập nhóm được hàng nghìn, và chỉ đổi sang chuỗi
 * đúng lúc gọi API — contract nhận chuỗi thập phân. Tiền VND không dùng phần lẻ nên không mất
 * thông tin; nếu sau này có phần lẻ thì phải đổi lại cả ô nhập lẫn chỗ chuyển kiểu này.
 */
interface ConfirmValues {
  receivedAmount: number;
  reference: string;
  note?: string;
}

interface LateReceiptValues {
  amount: number;
  bankReference: string;
  receivedAt: Dayjs;
  note?: string;
}

interface ManualRefundValues {
  amount: number;
  externalRef: string;
  note?: string;
}

type SettleRequest = { action: 'confirm'; values: ConfirmValues } | { action: 'reject'; reason: string };

export function PaymentDetailDrawer({ paymentId, onClose }: { paymentId?: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const confirmWithReason = useConfirmWithReason();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form] = Form.useForm<ConfirmValues>();
  const idempotencyRef = useRef<{ signature: string; key: string } | undefined>(undefined);
  const [lateReceiptOpen, setLateReceiptOpen] = useState(false);
  const [lateReceiptForm] = Form.useForm<LateReceiptValues>();
  const lateReceiptIdempotencyRef = useRef<{ signature: string; key: string } | undefined>(undefined);
  const [manualRefundOpen, setManualRefundOpen] = useState(false);
  const [manualRefundForm] = Form.useForm<ManualRefundValues>();
  const manualRefundIdempotencyRef = useRef<{ signature: string; key: string } | undefined>(undefined);
  const detail = useQuery({
    queryKey: getGetAdminPaymentQueryKey(paymentId),
    enabled: Boolean(paymentId),
    retry: false,
    queryFn: ({ signal }) => getAdminPayment(paymentId!, signal),
  });
  const payment = detail.data;
  const mutation = useMutation({
    retry: false,
    mutationFn: async (request: SettleRequest) => {
      if (!payment) throw new Error('Chưa tải được thanh toán');
      const receivedAmount = request.action === 'confirm' ? String(request.values.receivedAmount ?? '') : '';
      const signature = request.action === 'confirm'
        ? `confirm:${payment.id}:${payment.version}:${receivedAmount}:${request.values.reference.trim()}:${request.values.note?.trim() ?? ''}`
        : `reject:${payment.id}:${payment.version}:${request.reason}`;
      idempotencyRef.current = nextIdempotencyKey(idempotencyRef.current, signature);
      const options = { headers: { 'idempotency-key': idempotencyRef.current.key } };
      return request.action === 'confirm'
        ? confirmAdminPayment(
          payment.id,
          { expectedVersion: payment.version, receivedAmount, reference: request.values.reference, note: request.values.note },
          options,
        )
        : rejectAdminPayment(payment.id, { expectedVersion: payment.version, reason: request.reason }, options);
    },
    onSuccess: async (updated, variables) => {
      queryClient.setQueryData(getGetAdminPaymentQueryKey(updated.id), updated);
      // Không truyền params: khớp tiền tố nên mọi trang/filter đang cache của danh sách payment đều bị invalidate.
      await queryClient.invalidateQueries({ queryKey: getListAdminPaymentsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetAdminOrderQueryKey(updated.orderId) });
      await queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
      // Đơn trả trước đủ tiền thì API tạo vận đơn GHN ngay: panel giao vận của đơn phải tải lại.
      await queryClient.invalidateQueries({ queryKey: getGetAdminFulfillmentByOrderQueryKey(updated.orderId) });
      void message.success(variables.action === 'confirm' ? 'Đã xác nhận thanh toán' : 'Đã từ chối bằng chứng thanh toán');
      // onSuccess chạy khi mutation vẫn còn isPending (query-core await onSuccess trước khi dispatch success),
      // nên phải gọi bản reset không chặn; closeConfirm chỉ dành cho thao tác huỷ của người dùng.
      resetAction();
    },
    onError: (error) => {
      void message.error(getApiErrorMessage(error, 'Không cập nhật được thanh toán.'));
    },
  });
  // D04: chỉ ghi sổ tiền về trễ để đối soát/hoàn tay; payment và đơn vẫn CANCELLED nên chỉ cần làm mới payment.
  const lateReceipt = useMutation({
    retry: false,
    mutationFn: async (values: LateReceiptValues) => {
      if (!payment) throw new Error('Chưa tải được thanh toán');
      const body = {
        expectedVersion: payment.version,
        amount: String(values.amount),
        bankReference: values.bankReference.trim(),
        receivedAt: values.receivedAt.toISOString(),
        note: values.note?.trim() || undefined,
      };
      const signature = `late-receipt:${payment.id}:${JSON.stringify(body)}`;
      lateReceiptIdempotencyRef.current = nextIdempotencyKey(lateReceiptIdempotencyRef.current, signature);
      return recordLatePaymentReceipt(payment.id, body, {
        headers: { 'idempotency-key': lateReceiptIdempotencyRef.current.key },
      });
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(getGetAdminPaymentQueryKey(updated.id), updated);
      await queryClient.invalidateQueries({ queryKey: getListAdminPaymentsQueryKey() });
      void message.success('Đã ghi nhận tiền về trễ');
      resetLateReceipt();
    },
    onError: (error) => {
      void message.error(getApiErrorMessage(error, 'Không ghi nhận được tiền về trễ.'));
    },
  });
  // Đóng cờ hoàn tiền thủ công: payment và trạng thái thanh toán của đơn chuyển REFUNDED.
  const manualRefund = useMutation({
    retry: false,
    mutationFn: async (values: ManualRefundValues) => {
      if (!payment) throw new Error('Chưa tải được thanh toán');
      const body = {
        expectedVersion: payment.version,
        amount: String(values.amount),
        externalRef: values.externalRef.trim(),
        note: values.note?.trim() || undefined,
      };
      const signature = `manual-refund:${payment.id}:${JSON.stringify(body)}`;
      manualRefundIdempotencyRef.current = nextIdempotencyKey(manualRefundIdempotencyRef.current, signature);
      return recordManualRefundAdmin(payment.id, body, {
        headers: { 'idempotency-key': manualRefundIdempotencyRef.current.key },
      });
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(getGetAdminPaymentQueryKey(updated.id), updated);
      await queryClient.invalidateQueries({ queryKey: getListAdminPaymentsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetAdminOrderQueryKey(updated.orderId) });
      await queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
      void message.success('Đã ghi nhận hoàn tiền thủ công');
      resetManualRefund();
    },
    onError: (error) => {
      void message.error(getApiErrorMessage(error, 'Không ghi nhận được hoàn tiền thủ công.'));
    },
  });
  const resetManualRefund = () => {
    manualRefund.reset();
    manualRefundIdempotencyRef.current = undefined;
    manualRefundForm.resetFields();
    setManualRefundOpen(false);
  };
  const closeManualRefund = () => {
    if (manualRefund.isPending) return;
    resetManualRefund();
  };
  const resetLateReceipt = () => {
    lateReceipt.reset();
    lateReceiptIdempotencyRef.current = undefined;
    lateReceiptForm.resetFields();
    setLateReceiptOpen(false);
  };
  const closeLateReceipt = () => {
    if (lateReceipt.isPending) return;
    resetLateReceipt();
  };
  const resetAction = () => {
    mutation.reset();
    idempotencyRef.current = undefined;
    form.resetFields();
    setConfirmOpen(false);
  };
  const closeConfirm = () => {
    if (mutation.isPending) return;
    resetAction();
  };
  const closeDrawer = () => {
    if (mutation.isPending || lateReceipt.isPending || manualRefund.isPending) return;
    closeConfirm();
    closeLateReceipt();
    closeManualRefund();
    onClose();
  };
  // UX: COD chỉ mở thao tác thu tiền khi đơn đã giao; backend vẫn kiểm tra lại
  // để UI không bao giờ trở thành ranh giới bảo mật/nghiệp vụ duy nhất.
  // SECURITY: payment.confirm là quyền riêng với payment.view. Không có nó thì hai thao tác
  // đối soát phải tắt ngay ở UI thay vì để người dùng bấm rồi nhận 403 từ backend.
  const canSettle = useCan('payment.confirm');
  const canConfirm = canSettle && payment && !['SUCCESS', 'CANCELLED', 'REFUNDED'].includes(payment.status)
    && (payment.method === 'COD'
      ? payment.orderStatus === 'DELIVERED'
      : ['AWAITING_CONFIRMATION', 'NEED_REVIEW'].includes(payment.status));
  const canReject = canSettle && payment && ['AWAITING_CONFIRMATION', 'NEED_REVIEW'].includes(payment.status);
  // API chỉ nhận tiền về trễ cho payment chuyển khoản đã CANCELLED (đơn đã nhả hàng).
  const canRecordLateReceipt = canSettle && payment?.method === 'BANK_TRANSFER' && payment.status === 'CANCELLED';
  // API chỉ cho đóng cờ hoàn tay khi payment SUCCESS, đơn CANCELLED và còn cờ chưa hoàn (quyền payment.refund.approve).
  const canRefundManually = useCan('payment.refund.approve');
  const canRecordManualRefund = canRefundManually && payment?.status === 'SUCCESS' && payment.orderStatus === 'CANCELLED'
    && Boolean(payment.manualRefund) && !payment.manualRefund?.refundedAt;
  const orderStatus = payment ? parseEnum(OrderStatus, payment.orderStatus) : undefined;

  const reject = () => {
    if (!payment) return;
    confirmWithReason({
      title: 'Từ chối bằng chứng',
      consequence: `Bằng chứng chuyển khoản của thanh toán ${payment.paymentRef} sẽ bị từ chối.`,
      okText: 'Từ chối',
      minLength: 3,
      onOk: (reason) => mutation.mutateAsync({ action: 'reject', reason }),
    });
  };

  return (
    <>
      <DetailDrawer
        open={Boolean(paymentId)}
        onClose={closeDrawer}
        size="md"
        title={payment ? `Thanh toán ${payment.paymentRef}` : 'Chi tiết thanh toán'}
        status={payment && <StatusTag status={payment.status} presentations={paymentStatusPresentation} />}
        loading={detail.isLoading}
        error={detail.isError ? detail.error : undefined}
        onRetry={() => void detail.refetch()}
      >
        {!payment ? <Empty /> : (
          <div className="space-y-6">
            <div>
              <Typography.Title level={4} className="!mb-1">{payment.orderNo}</Typography.Title>
              <Typography.Text type="secondary">{paymentMethodLabels[payment.method] ?? payment.method}</Typography.Text>
            </div>
            <Descriptions bordered size="small" column={2} items={[
              { key: 'expected', label: 'Phải thu', children: moneyFormatter.format(Number(payment.expectedAmount)) },
              { key: 'received', label: 'Đã nhận', children: moneyFormatter.format(Number(payment.receivedAmount)) },
              { key: 'orderStatus', label: 'Trạng thái đơn', children: orderStatus ? <StatusTag status={orderStatus} presentations={orderStatusPresentation} /> : 'Không xác định' },
              { key: 'version', label: 'Phiên bản', children: payment.version },
              { key: 'expiry', label: 'Hết hạn', children: payment.expiresAt ? formatDateTime(payment.expiresAt) : 'Không áp dụng' },
            ]} />
            {payment.failureReason && <Alert type="warning" showIcon message={payment.failureReason} />}
            <section>
              <Typography.Title level={5}>Bằng chứng chuyển khoản</Typography.Title>
              {payment.evidences.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có bằng chứng" />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {payment.evidences.map((evidence) => (
                    <div key={evidence.id} className="rounded-xl border border-slate-200 p-3">
                      <Image
                        src={evidence.thumbnailUrl}
                        preview={{ src: evidence.fileUrl }}
                        alt={`Bằng chứng #${evidence.id}`}
                        loading="lazy"
                        width="100%"
                        height={192}
                        className="rounded-lg object-contain"
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <span>#{evidence.id}</span>
                        <StatusTag status={evidence.status} presentations={paymentEvidenceStatusPresentation} />
                      </div>
                      {evidence.note && <p className="mt-2 text-sm text-slate-600">{evidence.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
            {(payment.lateReceipts?.length ?? 0) > 0 && (
              <section>
                <Typography.Title level={5}>Tiền về sau khi hủy</Typography.Title>
                <Alert className="!mb-3" type="warning" showIcon message="Khoản tiền này cần hoàn thủ công cho khách; đơn và thanh toán vẫn giữ trạng thái đã hủy." />
                <Space direction="vertical" className="w-full">
                  {payment.lateReceipts?.map((receipt) => (
                    <Descriptions key={receipt.id} bordered size="small" column={2} items={[
                      { key: 'amount', label: 'Số tiền', children: moneyFormatter.format(Number(receipt.amount)) },
                      { key: 'reference', label: 'Tham chiếu', children: receipt.reference },
                      { key: 'receivedAt', label: 'Tiền về lúc', children: formatDateTime(receipt.receivedAt) },
                      { key: 'provider', label: 'Nguồn', children: receipt.provider === 'VNPAY' ? 'VNPay' : 'Ghi nhận thủ công' },
                      ...(receipt.note ? [{ key: 'note', label: 'Ghi chú', span: 2, children: receipt.note }] : []),
                    ]} />
                  ))}
                </Space>
              </section>
            )}
            {payment.manualRefund && (
              <section>
                <Typography.Title level={5}>Hoàn tiền thủ công</Typography.Title>
                {!payment.manualRefund.refundedAt && (
                  <Alert className="!mb-3" type="warning" showIcon message="Đơn đã huỷ sau giao thất bại; kế toán cần chuyển trả số tiền đã thu cho khách rồi ghi nhận tại đây." />
                )}
                <Descriptions bordered size="small" column={2} items={[
                  { key: 'required', label: 'Phải hoàn', children: moneyFormatter.format(Number(payment.manualRefund.requiredAmount)) },
                  { key: 'flaggedAt', label: 'Phát sinh lúc', children: formatDateTime(payment.manualRefund.flaggedAt) },
                  ...(payment.manualRefund.refundedAt ? [
                    { key: 'refunded', label: 'Đã hoàn', children: moneyFormatter.format(Number(payment.manualRefund.refundedAmount ?? 0)) },
                    { key: 'refundedAt', label: 'Hoàn lúc', children: formatDateTime(payment.manualRefund.refundedAt) },
                    { key: 'externalRef', label: 'Mã giao dịch', span: 2, children: payment.manualRefund.externalRef ?? '—' },
                  ] : []),
                  ...(payment.manualRefund.note ? [{ key: 'note', label: 'Ghi chú', span: 2, children: payment.manualRefund.note }] : []),
                ]} />
              </section>
            )}
            {!canSettle && <Alert type="info" showIcon message="Bạn chỉ có quyền xem thanh toán; thao tác đối soát cần quyền payment.confirm." />}
            <Space>
              <Button
                type="primary"
                disabled={!canConfirm}
                onClick={() => {
                  setConfirmOpen(true);
                  form.setFieldsValue({ receivedAmount: Number(payment.expectedAmount) });
                }}
              >
                Xác nhận đủ tiền
              </Button>
              <Button danger disabled={!canReject} loading={mutation.isPending && mutation.variables?.action === 'reject'} onClick={reject}>
                Từ chối bằng chứng
              </Button>
              {canRecordLateReceipt && (
                <Button onClick={() => setLateReceiptOpen(true)}>Ghi nhận tiền về trễ</Button>
              )}
              {canRecordManualRefund && (
                <Button
                  onClick={() => {
                    setManualRefundOpen(true);
                    manualRefundForm.setFieldsValue({ amount: Number(payment.manualRefund?.requiredAmount ?? payment.receivedAmount) });
                  }}
                >
                  Ghi nhận đã hoàn tiền
                </Button>
              )}
            </Space>
          </div>
        )}
      </DetailDrawer>
      <FormModal
        open={confirmOpen}
        title="Xác nhận thanh toán"
        onClose={closeConfirm}
        onSubmit={() => form.submit()}
        submitting={mutation.isPending}
        isDirty={() => form.isFieldsTouched()}
      >
        <Form form={form} layout="vertical" onFinish={(values) => mutation.mutate({ action: 'confirm', values })}>
          <Form.Item name="receivedAmount" label="Số tiền thực nhận" rules={[{ required: true, message: 'Vui lòng nhập số tiền thực nhận' }, { type: 'number', min: 1, message: 'Số tiền phải lớn hơn 0' }]}>
            <MoneyInput className="!w-full" />
          </Form.Item>
          <Form.Item name="reference" label="Mã giao dịch/đối soát" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập mã đối soát' }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={3} maxLength={1000} />
          </Form.Item>
        </Form>
      </FormModal>
      <FormModal
        open={lateReceiptOpen}
        title="Ghi nhận tiền về trễ"
        okText="Ghi nhận"
        onClose={closeLateReceipt}
        onSubmit={() => lateReceiptForm.submit()}
        submitting={lateReceipt.isPending}
        isDirty={() => lateReceiptForm.isFieldsTouched()}
      >
        <Typography.Paragraph type="secondary">
          Chỉ ghi sổ để đối soát và hoàn tiền thủ công. Thanh toán và đơn vẫn giữ trạng thái đã hủy, không giữ lại hàng.
        </Typography.Paragraph>
        <Form form={lateReceiptForm} layout="vertical" onFinish={(values) => lateReceipt.mutate(values)}>
          <Form.Item name="amount" label="Số tiền nhận được" rules={[{ required: true, message: 'Vui lòng nhập số tiền nhận được' }, { type: 'number', min: 1, message: 'Số tiền phải lớn hơn 0' }]}>
            <MoneyInput className="!w-full" />
          </Form.Item>
          <Form.Item name="bankReference" label="Số tham chiếu sao kê" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập số tham chiếu' }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="receivedAt" label="Thời điểm tiền về" rules={[{ required: true, message: 'Vui lòng chọn thời điểm tiền về' }]}>
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              className="w-full"
              disabledDate={(date) => date.isAfter(dayjs(), 'day')}
            />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={3} maxLength={1000} />
          </Form.Item>
        </Form>
      </FormModal>
      <FormModal
        open={manualRefundOpen}
        title="Ghi nhận hoàn tiền thủ công"
        okText="Ghi nhận"
        onClose={closeManualRefund}
        onSubmit={() => manualRefundForm.submit()}
        submitting={manualRefund.isPending}
        isDirty={() => manualRefundForm.isFieldsTouched()}
      >
        <Typography.Paragraph type="secondary">
          Chỉ ghi nhận sau khi đã chuyển trả tiền cho khách ngoài hệ thống. Thanh toán và đơn sẽ chuyển sang đã hoàn tiền, không thể hoàn tác.
        </Typography.Paragraph>
        <Form form={manualRefundForm} layout="vertical" onFinish={(values) => manualRefund.mutate(values)}>
          <Form.Item
            name="amount"
            label="Số tiền đã chuyển trả"
            rules={[
              { required: true, message: 'Vui lòng nhập số tiền đã chuyển trả' },
              { type: 'number', min: 1, message: 'Số tiền phải lớn hơn 0' },
              { type: 'number', max: Number(payment?.receivedAmount ?? 0), message: 'Số tiền không được vượt số đã thu' },
            ]}
          >
            <MoneyInput className="!w-full" />
          </Form.Item>
          <Form.Item name="externalRef" label="Mã giao dịch chuyển trả" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập mã giao dịch chuyển trả' }]}>
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={3} maxLength={1000} />
          </Form.Item>
        </Form>
      </FormModal>
    </>
  );
}
