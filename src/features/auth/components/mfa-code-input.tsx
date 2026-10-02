import { Input } from 'antd';
import { MFA_CODE_LENGTH } from '../constants/mfa.constants';

interface MfaCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

/** Ô nhập 6 chữ số của Google Authenticator; tự loại ký tự không phải số. */
export function MfaCodeInput({ value, onChange, disabled, autoFocus }: MfaCodeInputProps) {
  return (
    <Input.OTP
      length={MFA_CODE_LENGTH}
      size="large"
      value={value}
      disabled={disabled}
      autoFocus={autoFocus}
      formatter={(text) => text.replace(/\D/g, '')}
      onChange={onChange}
      aria-label="Mã xác thực 6 chữ số"
    />
  );
}
