import { Modal, type ModalProps } from 'antd';
import { MODAL_WIDTH } from './modal-width';
import { useConfirmDiscard } from './use-confirm-discard';

export interface FormModalProps extends Omit<ModalProps, 'width' | 'onCancel' | 'onOk' | 'confirmLoading'> {
  size?: keyof typeof MODAL_WIDTH;
  onClose: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  /** Đọc lúc người dùng đóng; `true` thì hỏi lại trước khi bỏ nội dung đã nhập (ví dụ lý do). */
  isDirty?: () => boolean;
}

const NEVER_DIRTY = () => false;

/**
 * Modal có form/ô nhập (lý do huỷ, từ chối…): cỡ chuẩn, nút Huỷ/OK tiếng Việt, chặn đóng khi đang gửi
 * và hỏi lại khi còn nội dung chưa gửi. Tương đương `FormDrawer` cho modal.
 */
export function FormModal({
  size = 'md',
  onClose,
  onSubmit,
  submitting = false,
  isDirty = NEVER_DIRTY,
  okText = 'Xác nhận',
  cancelText = 'Huỷ',
  children,
  ...modalProps
}: FormModalProps) {
  const requestClose = useConfirmDiscard(isDirty, onClose);
  return (
    <Modal
      destroyOnHidden
      {...modalProps}
      width={MODAL_WIDTH[size]}
      okText={okText}
      cancelText={cancelText}
      confirmLoading={submitting}
      maskClosable={!submitting}
      cancelButtonProps={{ disabled: submitting, ...modalProps.cancelButtonProps }}
      onOk={onSubmit}
      onCancel={() => {
        if (!submitting) requestClose();
      }}
    >
      {children}
    </Modal>
  );
}
