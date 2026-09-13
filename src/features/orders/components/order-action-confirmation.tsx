import { Alert, Input, Modal, Typography } from 'antd';

export type OrderAction = 'confirm' | 'cancel' | 'complete';

interface OrderActionConfirmationProps {
  action?: OrderAction;
  reason: string;
  pending: boolean;
  errorMessage?: string;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function OrderActionConfirmation({
  action,
  reason,
  pending,
  errorMessage,
  onReasonChange,
  onCancel,
  onConfirm,
}: OrderActionConfirmationProps) {
  const title = action === 'cancel'
    ? 'Xác nhận hủy đơn hàng'
    : action === 'confirm'
      ? 'Xác nhận tiếp nhận đơn hàng'
      : 'Xác nhận hoàn tất đơn';
  const okText = action === 'cancel' ? 'Hủy đơn' : action === 'confirm' ? 'Xác nhận đơn' : 'Hoàn tất';
  const minimumReasonLength = action === 'cancel' ? 3 : 5;
  return (
    <Modal
      open={Boolean(action)}
      title={title}
      okText={okText}
      okButtonProps={{ danger: action === 'cancel', disabled: reason.trim().length < minimumReasonLength }}
      cancelText="Đóng"
      confirmLoading={pending}
      onCancel={onCancel}
      onOk={onConfirm}
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
        status={errorMessage ? 'error' : undefined}
        onChange={(event) => onReasonChange(event.target.value)}
      />
      {errorMessage && <Alert className="mt-3" type="error" showIcon message={errorMessage} />}
    </Modal>
  );
}
