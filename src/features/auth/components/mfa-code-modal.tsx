import { Alert, Button, Modal, Typography } from 'antd';
import type { ReactNode } from 'react';
import { MFA_CODE_PATTERN, MFA_MAX_FAILED_ATTEMPTS } from '../constants/mfa.constants';
import { MfaCodeInput } from './mfa-code-input';

interface MfaCodeModalProps {
  open: boolean;
  title?: ReactNode;
  description?: ReactNode;
  okText?: string;
  danger?: boolean;
  code: string;
  error?: string;
  submitting: boolean;
  onCodeChange: (code: string) => void;
  onSubmit: (code: string) => void;
  onCancel: () => void;
  /** Có khi API báo người thao tác chưa bật 2FA: hiện nút mở luồng tự thiết lập. */
  onStartEnrollment?: () => void;
}

export function MfaCodeModal({
  open,
  title,
  description,
  okText,
  danger,
  code,
  error,
  submitting,
  onCodeChange,
  onSubmit,
  onCancel,
  onStartEnrollment,
}: MfaCodeModalProps) {
  return (
    <Modal
      open={open}
      title={title ?? 'Nhập mã xác thực'}
      okText={okText ?? 'Xác nhận'}
      cancelText="Hủy"
      okButtonProps={{ danger, disabled: !MFA_CODE_PATTERN.test(code) }}
      confirmLoading={submitting}
      onOk={() => onSubmit(code)}
      onCancel={onCancel}
      maskClosable={false}
      destroyOnHidden
    >
      {description && <div className="mb-4">{description}</div>}
      <Typography.Paragraph className="!mb-3 text-sm text-slate-600">
        Mở Google Authenticator và nhập mã 6 chữ số hiện tại của tài khoản bạn.
      </Typography.Paragraph>
      <div className="flex justify-center">
        <MfaCodeInput
          value={code}
          autoFocus
          disabled={submitting}
          onChange={(next) => {
            onCodeChange(next);
            // Đủ 6 số thì gửi luôn, đúng thói quen nhập OTP.
            if (MFA_CODE_PATTERN.test(next) && !submitting) onSubmit(next);
          }}
        />
      </div>
      {error && (
        <Alert
          className="mt-4"
          type="error"
          showIcon
          message={error}
          action={
            onStartEnrollment && (
              <Button size="small" type="primary" onClick={onStartEnrollment}>
                Bật xác thực 2 lớp
              </Button>
            )
          }
        />
      )}
      <div className="mt-3 text-center text-xs text-slate-400">
        Nhập sai {MFA_MAX_FAILED_ATTEMPTS} lần liên tiếp tài khoản sẽ bị khóa.
      </div>
    </Modal>
  );
}
