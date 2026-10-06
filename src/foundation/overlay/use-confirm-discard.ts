import { App } from 'antd';
import { useCallback } from 'react';

/**
 * Bọc `onClose` của drawer/modal có form: còn thay đổi chưa lưu thì hỏi lại trước khi đóng.
 *
 * Chỉ gắn vào đường đóng do người dùng (nút X, mask, Esc, nút "Huỷ"); đường đóng sau khi lưu thành
 * công vẫn gọi `onClose` gốc. `isDirty` là hàm để đọc trạng thái tại thời điểm bấm, ví dụ
 * `() => form.isFieldsTouched()` với antd Form.
 */
export function useConfirmDiscard(isDirty: () => boolean, onClose: () => void): () => void {
  const { modal } = App.useApp();
  return useCallback(() => {
    if (!isDirty()) {
      onClose();
      return;
    }
    modal.confirm({
      title: 'Bỏ thay đổi chưa lưu?',
      content: 'Thông tin vừa nhập sẽ mất nếu đóng lúc này.',
      okText: 'Bỏ thay đổi',
      okButtonProps: { danger: true },
      cancelText: 'Tiếp tục sửa',
      onOk: onClose,
    });
  }, [isDirty, modal, onClose]);
}
