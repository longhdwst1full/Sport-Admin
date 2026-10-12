import { Input, Typography } from 'antd';
import { FormModal } from '@/foundation/overlay';

export type OrderAction = 'confirm' | 'cancel' | 'complete';

interface OrderActionConfirmationProps {
  action?: OrderAction;
  reason: string;
  pending: boolean;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function OrderActionConfirmation({
  action,
  reason,
  pending,
  onReasonChange,
  onCancel,
  onConfirm,
}: OrderActionConfirmationProps) {
  const title = action === 'cancel'
    ? 'Xác nhận huỷ đơn hàng'
    : action === 'confirm'
      ? 'Xác nhận tiếp nhận đơn hàng'
      : 'Xác nhận hoàn tất đơn';
  const okText = action === 'cancel' ? 'Huỷ đơn' : action === 'confirm' ? 'Xác nhận đơn' : 'Hoàn tất';
  const minimumReasonLength = action === 'cancel' ? 3 : 5;
  // Nút xác nhận đã khoá khi lý do quá ngắn; báo lỗi tại ô khi người dùng đã bắt đầu gõ để họ biết vì sao.
  const reasonError =
    reason.length > 0 && reason.trim().length < minimumReasonLength
      ? `Lý do tối thiểu ${minimumReasonLength} ký tự`
      : undefined;
  return (
    <FormModal
      open={Boolean(action)}
      title={title}
      okText={okText}
      okButtonProps={{ danger: action === 'cancel', disabled: reason.trim().length < minimumReasonLength }}
      submitting={pending}
      onClose={onCancel}
      onSubmit={onConfirm}
      isDirty={() => reason.trim().length > 0}
    >
      <Typography.Paragraph type="secondary">
        {action === 'cancel'
          ? 'Hệ thống sẽ giải phóng toàn bộ số lượng đang giữ trong kho. Thao tác không áp dụng khi đơn đã thanh toán hoặc bắt đầu xử lý.'
          : action === 'confirm'
            ? 'Xác nhận đơn đã đủ điều kiện xử lý: chuyển khoản đã thành công hoặc đơn COD đã được tiếp nhận.'
            : 'Chỉ dùng khi đã chắc chắn khách nhận đủ hàng và đã thu đủ tiền, kể cả đơn giao ngay trong ngày.'}
      </Typography.Paragraph>
      <label className="mb-2 block font-medium" htmlFor="order-action-reason">Lý do <span className="text-red-500">*</span></label>
      <Input.TextArea
        id="order-action-reason"
        value={reason}
        rows={4}
        maxLength={500}
        showCount
        status={reasonError ? 'error' : undefined}
        aria-invalid={Boolean(reasonError)}
        aria-describedby={reasonError ? 'order-action-reason-error' : undefined}
        onChange={(event) => onReasonChange(event.target.value)}
      />
      {reasonError && (
        <Typography.Text id="order-action-reason-error" type="danger" className="mt-1 block text-sm">
          {reasonError}
        </Typography.Text>
      )}
    </FormModal>
  );
}
