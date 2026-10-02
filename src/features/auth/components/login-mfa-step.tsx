import { ArrowLeftOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, Button } from 'antd';
import { useEffect, useState } from 'react';
import { confirmAdminMfaEnrollment, verifyAdminMfaLogin } from '@/generated/api/auth/auth';
import type { MfaProvisioningDto, TokenPairDto } from '@/generated/api/auth/auth.schemas';
import { MFA_CODE_PATTERN, MFA_ERROR_CODE } from '../constants/mfa.constants';
import { MFA_CHALLENGE_EXPIRED_MESSAGE } from '../model/login-step';
import { getMfaErrorCode, getMfaErrorMessage, isMfaChallengeInvalid } from '../model/mfa-error';
import { MfaCodeInput } from './mfa-code-input';
import { MfaQrPanel } from './mfa-qr-panel';

export interface LoginMfaChallenge {
  kind: 'MFA_REQUIRED' | 'MFA_ENROLLMENT_REQUIRED';
  challengeToken: string;
  expiresAt: number;
  /** Chỉ có ở bước thiết lập (MFA_ENROLLMENT_REQUIRED). */
  provisioning?: MfaProvisioningDto;
}

interface LoginMfaStepProps {
  challenge: LoginMfaChallenge;
  onAuthenticated: (tokens: TokenPairDto) => Promise<void>;
  /** Quay về bước mật khẩu, kèm lý do để trang đăng nhập báo cho người dùng. */
  onRestart: (reason?: { type: 'warning' | 'error'; message: string }) => void;
}

export function LoginMfaStep({ challenge, onAuthenticated, onRestart }: LoginMfaStepProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const enrolling = challenge.kind === 'MFA_ENROLLMENT_REQUIRED';

  // Challenge chỉ sống 5 phút: hết hạn thì quay về bước mật khẩu thay vì để người dùng nhập mã vô ích.
  useEffect(() => {
    const timer = setTimeout(
      () => onRestart({ type: 'warning', message: MFA_CHALLENGE_EXPIRED_MESSAGE }),
      Math.max(0, challenge.expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [challenge.expiresAt, onRestart]);

  const submit = async (value: string) => {
    if (submitting || !MFA_CODE_PATTERN.test(value)) return;
    setSubmitting(true);
    setError(undefined);
    const data = { challengeToken: challenge.challengeToken, code: value };
    let tokens: TokenPairDto;
    try {
      tokens = enrolling ? await confirmAdminMfaEnrollment(data) : await verifyAdminMfaLogin(data);
    } catch (reason) {
      setSubmitting(false);
      setCode('');
      if (isMfaChallengeInvalid(reason)) {
        onRestart({ type: 'warning', message: MFA_CHALLENGE_EXPIRED_MESSAGE });
      } else if (getMfaErrorCode(reason) === MFA_ERROR_CODE.ACCOUNT_LOCKED) {
        onRestart({ type: 'error', message: getMfaErrorMessage(reason) });
      } else {
        setError(getMfaErrorMessage(reason, 'Không xác thực được mã. Vui lòng thử lại.'));
      }
      return;
    }
    try {
      await onAuthenticated(tokens);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {enrolling && challenge.provisioning ? (
        <>
          <Alert
            type="info"
            showIcon
            icon={<SafetyCertificateOutlined />}
            message="Tài khoản cần bật xác thực 2 lớp"
            description="Quét mã QR bằng Google Authenticator, sau đó nhập mã 6 chữ số để hoàn tất."
          />
          <MfaQrPanel
            otpauthUri={challenge.provisioning.otpauthUri}
            secret={challenge.provisioning.secret}
            note="Không chia sẻ mã QR hoặc khoá này với bất kỳ ai."
          />
        </>
      ) : (
        <p className="text-center text-sm text-slate-500">
          Mở Google Authenticator và nhập mã 6 chữ số hiện tại.
        </p>
      )}

      <div className="flex justify-center">
        <MfaCodeInput
          value={code}
          autoFocus
          disabled={submitting}
          onChange={(next) => {
            setCode(next);
            if (MFA_CODE_PATTERN.test(next)) void submit(next);
          }}
        />
      </div>
      {error && <Alert type="error" showIcon message={error} />}

      <Button
        block
        size="large"
        type="primary"
        loading={submitting}
        disabled={!MFA_CODE_PATTERN.test(code)}
        onClick={() => void submit(code)}
        className="!h-11 !rounded-xl !bg-gradient-to-r !from-emerald-600 !to-teal-600 !text-sm !font-semibold !shadow-md !shadow-emerald-600/20 hover:!from-emerald-500 hover:!to-teal-500 active:scale-[0.99] transition-all"
      >
        {submitting ? 'Đang xác thực...' : enrolling ? 'Kích hoạt & đăng nhập' : 'Xác nhận mã'}
      </Button>
      <Button block type="link" icon={<ArrowLeftOutlined />} disabled={submitting} onClick={() => onRestart()}>
        Quay lại đăng nhập
      </Button>
    </div>
  );
}
