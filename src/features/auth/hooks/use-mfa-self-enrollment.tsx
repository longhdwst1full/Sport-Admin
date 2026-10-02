import { useRef, useState } from 'react';
import { Alert, App, Modal } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import {
  confirmAdminMfaSelfEnrollment,
  getGetAdminMfaStatusQueryKey,
  startAdminMfaSelfEnrollment,
} from '@/generated/api/auth/auth';
import type { MfaProvisioningDto } from '@/generated/api/auth/auth.schemas';
import { MfaCodeInput } from '../components/mfa-code-input';
import { MfaQrPanel } from '../components/mfa-qr-panel';
import { MFA_CODE_PATTERN } from '../constants/mfa.constants';
import { getMfaErrorMessage, isRetryableMfaCodeError } from '../model/mfa-error';

/**
 * Nhân viên đang đăng nhập tự bật 2FA: sinh QR → quét → nhập mã đầu tiên để kích hoạt.
 * `startSelfEnrollment` gọi API ngay theo thao tác bấm (không qua effect) để mỗi lần mở chỉ sinh
 * một secret. Render `selfEnrollmentModal` một lần trong component dùng hook.
 */
export function useMfaSelfEnrollment() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [provisioning, setProvisioning] = useState<MfaProvisioningDto>();
  const [starting, setStarting] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const close = () => {
    setProvisioning(undefined);
    setCode('');
    setError(undefined);
    setSubmitting(false);
  };

  const startSelfEnrollment = async () => {
    if (starting) return;
    setStarting(true);
    try {
      setProvisioning(await startAdminMfaSelfEnrollment());
    } catch (reason) {
      void message.error(getMfaErrorMessage(reason, 'Không tạo được mã QR xác thực 2 lớp.'));
    } finally {
      setStarting(false);
    }
  };

  const confirm = async (value: string) => {
    if (inFlight.current || !MFA_CODE_PATTERN.test(value)) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(undefined);
    try {
      const status = await confirmAdminMfaSelfEnrollment({ code: value });
      queryClient.setQueryData(getGetAdminMfaStatusQueryKey(), status);
      close();
      void message.success('Đã bật xác thực 2 lớp cho tài khoản của bạn.');
    } catch (reason) {
      setSubmitting(false);
      setCode('');
      if (isRetryableMfaCodeError(reason)) setError(getMfaErrorMessage(reason));
      else {
        close();
        void message.error(getMfaErrorMessage(reason, 'Không bật được xác thực 2 lớp.'));
      }
    } finally {
      inFlight.current = false;
    }
  };

  const selfEnrollmentModal = (
    <Modal
      open={Boolean(provisioning)}
      title="Bật xác thực 2 lớp"
      okText="Kích hoạt"
      cancelText="Hủy"
      okButtonProps={{ disabled: !MFA_CODE_PATTERN.test(code) }}
      confirmLoading={submitting}
      onOk={() => void confirm(code)}
      onCancel={() => !submitting && close()}
      maskClosable={false}
      destroyOnHidden
    >
      {provisioning && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Quét mã QR bằng Google Authenticator, sau đó nhập mã 6 chữ số để kích hoạt.
          </p>
          <MfaQrPanel
            otpauthUri={provisioning.otpauthUri}
            secret={provisioning.secret}
            note="Không chia sẻ mã QR hoặc khoá này với bất kỳ ai."
          />
          <div className="flex justify-center">
            <MfaCodeInput
              value={code}
              autoFocus
              disabled={submitting}
              onChange={(next) => {
                setCode(next);
                if (MFA_CODE_PATTERN.test(next)) void confirm(next);
              }}
            />
          </div>
          {error && <Alert type="error" showIcon message={error} />}
        </div>
      )}
    </Modal>
  );

  return { startSelfEnrollment, starting, selfEnrollmentModal };
}
