import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAdminMfaStatus, getGetAdminMfaStatusQueryKey } from '@/generated/api/auth/auth';
import { MfaCodeModal } from '../components/mfa-code-modal';
import { MFA_CODE_HEADER } from '../constants/mfa.constants';
import {
  MfaCodeCancelledError,
  getMfaErrorMessage,
  isCallerNotEnrolled,
  isRetryableMfaCodeError,
} from '../model/mfa-error';
import { useMfaSelfEnrollment } from './use-mfa-self-enrollment';

/** Request option truyền vào SDK đã override `apiFetcherWithOptions`. */
export interface MfaRequestOptions {
  headers: Record<string, string>;
}

export interface MfaCodeRequest<T> {
  title?: ReactNode;
  description?: ReactNode;
  okText?: string;
  danger?: boolean;
  run: (options: MfaRequestOptions) => Promise<T>;
}

interface PendingRequest {
  request: MfaCodeRequest<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

const MFA_STATUS_STALE_MS = 60_000;

/** Header `x-mfa-code` cho một lần gửi; mã TOTP chỉ dùng được một lần nên không cache. */
export function buildMfaRequestOptions(code: string): MfaRequestOptions {
  return { headers: { [MFA_CODE_HEADER]: code } };
}

/**
 * Hỏi mã TOTP hiện tại của người đang đăng nhập rồi chạy thao tác nhạy cảm với header `x-mfa-code`.
 *
 * - Mã sai/thiếu/vừa dùng (MFA_CODE_INVALID/REQUIRED/ALREADY_USED): giữ hộp thoại, cho nhập lại.
 * - 403 MFA_NOT_ENROLLED (người thao tác chưa bật 2FA): giữ hộp thoại, mời tự thiết lập.
 * - Lỗi khác: đóng hộp thoại, reject để caller báo lỗi như bình thường.
 * - Hủy: reject `MfaCodeCancelledError` (caller bỏ qua bằng `isMfaCodeCancelled`).
 * - Tài khoản được API miễn 2FA (`getAdminMfaStatus().exempt`, break-glass): chạy luôn không hỏi mã.
 *
 * Render `mfaModal` một lần trong component dùng hook.
 */
export function useMfaCode() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingRequest>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [notEnrolled, setNotEnrolled] = useState(false);
  const { startSelfEnrollment, selfEnrollmentModal } = useMfaSelfEnrollment();
  // Chặn gửi trùng khi Enter và tự gửi lúc đủ 6 số xảy ra cùng lúc.
  const inFlight = useRef(false);

  const close = useCallback(() => {
    setPending(undefined);
    setCode('');
    setError(undefined);
    setSubmitting(false);
    setNotEnrolled(false);
  }, []);

  const isExempt = useCallback(async () => {
    try {
      const status = await queryClient.fetchQuery({
        queryKey: getGetAdminMfaStatusQueryKey(),
        queryFn: ({ signal }) => getAdminMfaStatus(signal),
        staleTime: MFA_STATUS_STALE_MS,
      });
      return status.exempt;
    } catch {
      // Không đọc được trạng thái: vẫn hỏi mã, API là nơi quyết định.
      return false;
    }
  }, [queryClient]);

  const withMfaCode = useCallback(
    async <T,>(request: MfaCodeRequest<T>): Promise<T> => {
      if (await isExempt()) return request.run({ headers: {} });
      return new Promise<T>((resolve, reject) => {
        setCode('');
        setError(undefined);
        setPending({
          request: request as MfaCodeRequest<unknown>,
          resolve: resolve as (value: unknown) => void,
          reject,
        });
      });
    },
    [isExempt],
  );

  const submit = useCallback(
    async (value: string) => {
      if (!pending || inFlight.current) return;
      inFlight.current = true;
      setSubmitting(true);
      setError(undefined);
      try {
        const result = await pending.request.run(buildMfaRequestOptions(value));
        pending.resolve(result);
        close();
      } catch (reason) {
        if (isRetryableMfaCodeError(reason) || isCallerNotEnrolled(reason)) {
          setError(getMfaErrorMessage(reason));
          setNotEnrolled(isCallerNotEnrolled(reason));
          setCode('');
          setSubmitting(false);
        } else {
          pending.reject(reason);
          close();
        }
      } finally {
        inFlight.current = false;
      }
    },
    [close, pending],
  );

  const cancel = useCallback(() => {
    if (submitting) return;
    pending?.reject(new MfaCodeCancelledError());
    close();
  }, [close, pending, submitting]);

  const openSelfEnrollment = useCallback(() => {
    // Thao tác gốc không chạy được khi chưa có 2FA: hủy nó (im lặng) rồi mở luồng tự thiết lập.
    pending?.reject(new MfaCodeCancelledError());
    close();
    void startSelfEnrollment();
  }, [close, pending, startSelfEnrollment]);

  const mfaModal = (
    <>
    <MfaCodeModal
      open={Boolean(pending)}
      title={pending?.request.title}
      description={pending?.request.description}
      okText={pending?.request.okText}
      danger={pending?.request.danger}
      code={code}
      error={error}
      submitting={submitting}
      onCodeChange={setCode}
      onSubmit={(value) => void submit(value)}
      onCancel={cancel}
      onStartEnrollment={notEnrolled ? openSelfEnrollment : undefined}
    />
    {selfEnrollmentModal}
    </>
  );

  return { withMfaCode, mfaModal };
}
