import { App, Input } from 'antd';
import { useCallback, type ReactNode } from 'react';

export interface ConfirmWithReasonOptions {
  title: ReactNode;
  /** Hệ quả nghiệp vụ hiển thị trên ô lý do (RULE 04: nói rõ chuyện gì sẽ xảy ra). */
  consequence?: ReactNode;
  okText: string;
  danger?: boolean;
  placeholder?: string;
  /** Số ký tự tối thiểu của lý do (sau trim); 0 = không bắt buộc. */
  minLength?: number;
  maxLength?: number;
  /** Trả promise để nút OK hiện loading; reject thì modal giữ nguyên để thử lại. */
  onOk: (reason: string) => Promise<unknown> | void;
}

/**
 * Hộp xác nhận có ô lý do cho thao tác rủi ro (ngừng dùng, huỷ phiếu, xoá vai trò…), thay cho việc
 * mỗi màn tự dựng `modal.confirm` + `Input.TextArea` + kiểm độ dài.
 */
export function useConfirmWithReason() {
  const { modal, message } = App.useApp();
  return useCallback(
    ({ title, consequence, okText, danger = true, placeholder = 'Nhập lý do...', minLength = 1, maxLength = 500, onOk }: ConfirmWithReasonOptions) => {
      let reason = '';
      modal.confirm({
        title,
        content: (
          <div className="space-y-2">
            {consequence && <div className="text-sm text-slate-500">{consequence}</div>}
            <Input.TextArea
              rows={2}
              maxLength={maxLength}
              placeholder={placeholder}
              onChange={(event) => {
                reason = event.target.value;
              }}
            />
          </div>
        ),
        okText,
        okButtonProps: { danger },
        cancelText: 'Huỷ',
        onOk: () => {
          const trimmed = reason.trim();
          if (trimmed.length < minLength) {
            void message.error(
              minLength > 1 ? `Vui lòng nhập lý do tối thiểu ${minLength} ký tự` : 'Vui lòng nhập lý do',
            );
            return Promise.reject(new Error('reason-required'));
          }
          return onOk(trimmed);
        },
      });
    },
    [message, modal],
  );
}
