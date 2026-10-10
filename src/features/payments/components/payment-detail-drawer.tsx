import { useRef, useState } from 'react';
import { Alert, App, Button, Descriptions, Empty, Form, Image, Input, Space, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmAdminPayment,
  getAdminPayment,
  getGetAdminPaymentQueryKey,
  getListAdminPaymentsQueryKey,
  rejectAdminPayment,
} from '@/generated/api/payments/payments';
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

type SettleRequest = { action: 'confirm'; values: ConfirmValues } | { action: 'reject'; reason: string };

export function PaymentDetailDrawer({ paymentId, onClose }: { paymentId?: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const confirmWithReason = useConfirmWithReason();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form] = Form.useForm<ConfirmValues>();
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
    onSuccess: async (updated) => {
      queryClient.setQueryData(getGetAdminPaymentQueryKey(updated.id), updated);
      // Không truyền params: khớp tiền tố nên mọi trang/filter đang cache của danh sách payment đều bị invalidate.
      await queryClient.invalidateQueries({ queryKey: getListAdminPaymentsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetAdminOrderQueryKey(updated.orderId) });
      await queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
      // onSuccess chạy khi mutation vẫn còn isPending (query-core await onSuccess trước khi dispatch success),
      // nên phải gọi bản reset không chặn; closeConfirm chỉ dành cho thao tác huỷ của người dùng.
      resetAction();
    },
    onError: (error) => {
      void message.error(getApiErrorMessage(error, 'Không cập nhật được thanh toán.'));
    },
  });
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
    if (mutation.isPending) return;
    closeConfirm();
    onClose();
  };
  // UX: COD chỉ mở thao tác thu tiền khi đơn đã giao; backend vẫn kiểm tra lại
  // để UI không bao giờ trở thành ranh giới bảo mật/nghiệp vụ duy nhất.
  // SECURITY: payment.confirm là quyền riêng với payment.view. Không có nó thì hai thao tác
  // đối soát phải tắt ngay ở UI thay vì để người dùng bấm rồi nhận 403 từ backend.
  const canSettle = useCan('payment.confirm');
  const canConfirm = canSettle && payment && !['SUCCESS', 'CANCELLED'].includes(payment.status)
    && (payment.method === 'COD'
      ? payment.orderStatus === 'DELIVERED'
      : ['AWAITING_CONFIRMATION', 'NEED_REVIEW'].includes(payment.status));
  const canReject = canSettle && payment && ['AWAITING_CONFIRMATION', 'NEED_REVIEW'].includes(payment.status);
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
          <Form.Item name="reference" label="Mã giao dịch/đối soát" rules={[{ required: true, message: 'Vui lòng nhập mã đối soát' }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={3} maxLength={1000} />
          </Form.Item>
        </Form>
      </FormModal>
    </>
  );
}
