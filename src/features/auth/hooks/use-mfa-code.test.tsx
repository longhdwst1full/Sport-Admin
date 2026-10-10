// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/fetcher';
import { MFA_ERROR_MESSAGES } from '../constants/mfa.constants';
import { isMfaCodeCancelled } from '../model/mfa-error';
import { buildMfaRequestOptions, useMfaCode, type MfaCodeRequest } from './use-mfa-code';

const { getAdminMfaStatusMock, startSelfMock } = vi.hoisted(() => ({
  getAdminMfaStatusMock: vi.fn(),
  startSelfMock: vi.fn(),
}));

vi.mock('@/generated/api/auth/auth', () => ({
  getAdminMfaStatus: getAdminMfaStatusMock,
  getGetAdminMfaStatusQueryKey: () => ['/api/v1/admin/auth/mfa'],
  startAdminMfaSelfEnrollment: startSelfMock,
  confirmAdminMfaSelfEnrollment: vi.fn(),
}));

beforeAll(() => {
  // jsdom không hỗ trợ tham số pseudoElt mà antd dùng để đo thanh cuộn.
  const getComputedStyle = window.getComputedStyle.bind(window);
  window.getComputedStyle = (element: Element) => getComputedStyle(element);
  // antd đọc matchMedia (responsive observer) mà jsdom không có.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
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
});

let api: ReturnType<typeof useMfaCode> | undefined;

function Harness() {
  api = useMfaCode();
  return <>{api.mfaModal}</>;
}

function renderHarness() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <App>
        <Harness />
      </App>
    </QueryClientProvider>,
  );
}

function start<T>(request: MfaCodeRequest<T>): Promise<T> {
  let promise!: Promise<T>;
  act(() => {
    promise = api!.withMfaCode(request);
  });
  return promise;
}

async function typeCode(code: string) {
  const cells = await screen.findAllByRole('textbox');
  fireEvent.input(cells[0], { target: { value: code } });
}

const mfaError = (code: string) => new ApiError(403, { statusCode: 403, code, message: code });

describe('useMfaCode', () => {
  it('gửi mã người dùng nhập qua header x-mfa-code', async () => {
    getAdminMfaStatusMock.mockResolvedValue({ status: 'ACTIVE', enforced: true, exempt: false, confirmedAt: null });
    renderHarness();
    const run = vi.fn().mockResolvedValue('ok');
    const result = start({ title: 'Xác thực', run });

    await typeCode('123456');

    await expect(result).resolves.toBe('ok');
    expect(run).toHaveBeenCalledWith({ headers: { 'x-mfa-code': '123456' } });
  });

  it('mã sai thì giữ hộp thoại, báo lỗi và cho nhập lại', async () => {
    getAdminMfaStatusMock.mockResolvedValue({ status: 'ACTIVE', enforced: true, exempt: false, confirmedAt: null });
    renderHarness();
    const run = vi.fn().mockRejectedValueOnce(mfaError('MFA_CODE_INVALID')).mockResolvedValueOnce('ok');
    const result = start({ run });

    await typeCode('111111');
    expect(await screen.findByText(MFA_ERROR_MESSAGES.MFA_CODE_INVALID)).toBeTruthy();

    await typeCode('222222');
    await expect(result).resolves.toBe('ok');
    expect(run).toHaveBeenLastCalledWith({ headers: { 'x-mfa-code': '222222' } });
  });

  it('lỗi không phải mã sai thì đóng hộp thoại và trả lỗi cho caller', async () => {
    getAdminMfaStatusMock.mockResolvedValue({ status: 'ACTIVE', enforced: true, exempt: false, confirmedAt: null });
    renderHarness();
    const failure = new ApiError(409, { statusCode: 409, code: 'SYSTEM_PARAMETER_VERSION_STALE', message: 'stale' });
    const result = start({ run: vi.fn().mockRejectedValue(failure) });

    await typeCode('123456');

    await expect(result).rejects.toBe(failure);
  });

  it('mã vừa được dùng: giữ hộp thoại, cho nhập mã mới', async () => {
    getAdminMfaStatusMock.mockResolvedValue({ status: 'ACTIVE', enforced: true, exempt: false, confirmedAt: null });
    renderHarness();
    const run = vi.fn().mockRejectedValueOnce(mfaError('MFA_CODE_ALREADY_USED')).mockResolvedValueOnce('ok');
    const result = start({ run });

    await typeCode('111111');
    expect(await screen.findByText(MFA_ERROR_MESSAGES.MFA_CODE_ALREADY_USED)).toBeTruthy();
    await typeCode('333333');
    await expect(result).resolves.toBe('ok');
  });

  it('403 MFA_NOT_ENROLLED: mời tự bật 2FA, hủy thao tác gốc và mở QR tự thiết lập', async () => {
    getAdminMfaStatusMock.mockResolvedValue({ status: 'NONE', enforced: false, exempt: false, confirmedAt: null });
    startSelfMock.mockResolvedValue({ otpauthUri: 'otpauth://totp/DCTD:me?secret=SELF', secret: 'SELFSECRET' });
    renderHarness();
    const result = start({ run: vi.fn().mockRejectedValue(mfaError('MFA_NOT_ENROLLED')) });

    await typeCode('123456');
    fireEvent.click(await screen.findByRole('button', { name: 'Bật xác thực 2 lớp' }));

    const error = await result.catch((reason: unknown) => reason);
    expect(isMfaCodeCancelled(error)).toBe(true);
    expect(startSelfMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('SELFSECRET')).toBeTruthy();
  });

  it('hủy thì reject MfaCodeCancelledError và không gọi API', async () => {
    getAdminMfaStatusMock.mockResolvedValue({ status: 'ACTIVE', enforced: true, exempt: false, confirmedAt: null });
    renderHarness();
    const run = vi.fn();
    const result = start({ run });

    fireEvent.click(await screen.findByRole('button', { name: /Huỷ/ }));

    const error = await result.catch((reason: unknown) => reason);
    expect(isMfaCodeCancelled(error)).toBe(true);
    expect(run).not.toHaveBeenCalled();
  });

  it('tài khoản được API miễn 2FA thì chạy luôn, không hỏi mã', async () => {
    getAdminMfaStatusMock.mockResolvedValue({ status: 'NONE', enforced: true, exempt: true, confirmedAt: null });
    renderHarness();
    const run = vi.fn().mockResolvedValue('ok');

    await expect(start({ run })).resolves.toBe('ok');
    expect(run).toHaveBeenCalledWith({ headers: {} });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('buildMfaRequestOptions', () => {
  it('đặt đúng tên header', () => {
    expect(buildMfaRequestOptions('654321')).toEqual({ headers: { 'x-mfa-code': '654321' } });
  });
});
