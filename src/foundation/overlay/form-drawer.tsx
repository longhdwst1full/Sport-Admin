import { Button, Drawer, type DrawerProps } from 'antd';
import type { ReactNode } from 'react';
import { DRAWER_WIDTH } from './drawer-width';
import { useConfirmDiscard } from './use-confirm-discard';

export interface FormDrawerProps
  extends Omit<DrawerProps, 'width' | 'size' | 'onClose' | 'footer' | 'extra'> {
  size?: keyof typeof DRAWER_WIDTH;
  onClose: () => void;
  /** Bấm nút lưu; thường là `() => form.submit()` hoặc `handleSubmit(onValid)`. */
  onSubmit: () => void;
  submitting?: boolean;
  submitText?: ReactNode;
  cancelText?: ReactNode;
  /** Đọc lúc người dùng đóng; trả `true` thì hỏi lại trước khi bỏ thay đổi. */
  isDirty?: () => boolean;
  /** Tắt nút lưu (ví dụ form không hợp lệ hoặc chế độ chỉ xem). */
  submitDisabled?: boolean;
  /** Nút phụ hiển thị bên trái cặp Huỷ/Lưu. */
  footerExtra?: ReactNode;
}

const NEVER_DIRTY = () => false;

/**
 * Khung drawer cho form tạo/sửa: cỡ chuẩn, footer Huỷ/Lưu thống nhất, chặn đóng khi đang lưu và hỏi
 * lại khi còn thay đổi chưa lưu. Đường đóng sau khi lưu thành công vẫn do feature gọi `onClose`.
 */
export function FormDrawer({
  size = 'md',
  onClose,
  onSubmit,
  submitting = false,
  submitText = 'Lưu',
  cancelText = 'Huỷ',
  isDirty = NEVER_DIRTY,
  submitDisabled,
  footerExtra,
  children,
  ...drawerProps
}: FormDrawerProps) {
  const requestClose = useConfirmDiscard(isDirty, onClose);
  const close = () => {
    if (!submitting) requestClose();
  };

  return (
    <Drawer
      destroyOnHidden
      {...drawerProps}
      width={DRAWER_WIDTH[size]}
      onClose={close}
      maskClosable={!submitting}
      footer={
        <div className="flex items-center justify-end gap-2">
          {footerExtra && <div className="mr-auto">{footerExtra}</div>}
          <Button onClick={close} disabled={submitting}>
            {cancelText}
          </Button>
          <Button type="primary" loading={submitting} disabled={submitDisabled} onClick={onSubmit}>
            {submitText}
          </Button>
        </div>
      }
    >
      {children}
    </Drawer>
  );
}
