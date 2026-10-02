// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/fetcher';
import { MFA_CHALLENGE_EXPIRED_MESSAGE } from '../model/login-step';
import { LoginMfaStep, type LoginMfaChallenge } from './login-mfa-step';

const { verifyMock, confirmMock } = vi.hoisted(() => ({ verifyMock: vi.fn(), confirmMock: vi.fn() }));

vi.mock('@/generated/api/auth/auth', () => ({
  verifyAdminMfaLogin: verifyMock,
  confirmAdminMfaEnrollment: confirmMock,
}));

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

const tokens = { accessToken: 'a', tokenType: 'Bearer', expiresIn: 900, mustChangePassword: false };

function renderStep(challenge: Partial<LoginMfaChallenge> = {}) {
  const onAuthenticated = vi.fn().mockResolvedValue(undefined);
  const onRestart = vi.fn();
  render(
    <LoginMfaStep
      challenge={{ kind: 'MFA_REQUIRED', challengeToken: 'challenge', expiresAt: Date.now() + 300_000, ...challenge }}
      onAuthenticated={onAuthenticated}
      onRestart={onRestart}
    />,
  );
  return { onAuthenticated, onRestart };
}

async function typeCode(code: string) {
  const cells = await screen.findAllByRole('textbox');
  await act(async () => {
    fireEvent.input(cells[0], { target: { value: code } });
  });
}

describe('LoginMfaStep', () => {
  it('MFA_REQUIRED: xác thực OTP rồi dùng token như đăng nhập thường', async () => {
    verifyMock.mockResolvedValue(tokens);
    const { onAuthenticated } = renderStep();

    await typeCode('123456');

    expect(verifyMock).toHaveBeenCalledWith({ challengeToken: 'challenge', code: '123456' });
    expect(onAuthenticated).toHaveBeenCalledWith(tokens);
  });

  it('MFA_ENROLLMENT_REQUIRED: hiện QR + secret và xác nhận bằng confirmAdminMfaEnrollment', async () => {
    confirmMock.mockResolvedValue(tokens);
    const { onAuthenticated } = renderStep({
      kind: 'MFA_ENROLLMENT_REQUIRED',
      provisioning: { otpauthUri: 'otpauth://totp/DCTD:a?secret=ABC', secret: 'ABCSECRET' },
    });

    expect(screen.getByText('ABCSECRET')).toBeTruthy();
    await typeCode('654321');

    expect(confirmMock).toHaveBeenCalledWith({ challengeToken: 'challenge', code: '654321' });
    expect(verifyMock).not.toHaveBeenCalled();
    expect(onAuthenticated).toHaveBeenCalledWith(tokens);
  });

  it('mã sai: ở lại bước OTP và báo lỗi', async () => {
    verifyMock.mockRejectedValue(new ApiError(401, { statusCode: 401, code: 'MFA_CODE_INVALID', message: 'x' }));
    const { onRestart, onAuthenticated } = renderStep();

    await typeCode('000000');

    expect(await screen.findByText('Mã xác thực không đúng hoặc đã được sử dụng.')).toBeTruthy();
    expect(onRestart).not.toHaveBeenCalled();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it('mã vừa được dùng: ở lại bước OTP, báo chờ mã mới', async () => {
    verifyMock.mockRejectedValue(new ApiError(401, { statusCode: 401, code: 'MFA_CODE_ALREADY_USED', message: 'x' }));
    const { onRestart } = renderStep();

    await typeCode('123456');

    expect(await screen.findByText('Mã này vừa được dùng, chờ mã mới (30 giây).')).toBeTruthy();
    expect(onRestart).not.toHaveBeenCalled();
  });

  it('challenge bị API từ chối: quay về bước mật khẩu kèm thông báo', async () => {
    verifyMock.mockRejectedValue(new ApiError(401, { statusCode: 401, code: 'MFA_CHALLENGE_INVALID', message: 'x' }));
    const { onRestart } = renderStep();

    await typeCode('123456');

    expect(onRestart).toHaveBeenCalledWith({ type: 'warning', message: MFA_CHALLENGE_EXPIRED_MESSAGE });
  });

  it('khoá tài khoản sau 5 lần sai: quay về bước mật khẩu với lỗi', async () => {
    verifyMock.mockRejectedValue(new ApiError(401, { statusCode: 401, code: 'ACCOUNT_LOCKED', message: 'x' }));
    const { onRestart } = renderStep();

    await typeCode('123456');

    expect(onRestart).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('challenge hết hạn 5 phút: tự quay về bước mật khẩu', () => {
    vi.useFakeTimers();
    const { onRestart } = renderStep({ expiresAt: Date.now() + 300_000 });

    act(() => {
      vi.advanceTimersByTime(299_999);
    });
    expect(onRestart).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onRestart).toHaveBeenCalledWith({ type: 'warning', message: MFA_CHALLENGE_EXPIRED_MESSAGE });
  });
});
