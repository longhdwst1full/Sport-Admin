import { Input, Typography } from 'antd';
import { FormModal } from '@/foundation/overlay';
import { orderActionCopy } from '../constants/order.constants';
import type { OrderAction } from '../model/order-actions.policy';

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
  // Modal đóng (`action` undefined) vẫn cần copy để render; giá trị dự phòng không hiển thị.
  const copy = orderActionCopy[action ?? 'complete'];
  const minimumReasonLength = copy.minReasonLength;
  // Nút xác nhận đã khoá khi lý do quá ngắn; báo lỗi tại ô khi người dùng đã bắt đầu gõ để họ biết vì sao.
  const reasonError =
    reason.length > 0 && reason.trim().length < minimumReasonLength
      ? `Lý do tối thiểu ${minimumReasonLength} ký tự`
      : undefined;
  return (
    <FormModal
      open={Boolean(action)}
      title={copy.title}
      okText={copy.okText}
      okButtonProps={{ danger: action === 'cancel', disabled: reason.trim().length < minimumReasonLength }}
      submitting={pending}
      onClose={onCancel}
      onSubmit={onConfirm}
      isDirty={() => reason.trim().length > 0}
    >
      <Typography.Paragraph type="secondary">
        {copy.description}
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
