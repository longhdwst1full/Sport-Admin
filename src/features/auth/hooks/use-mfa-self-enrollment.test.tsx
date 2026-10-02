// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/fetcher';
import { useMfaSelfEnrollment } from './use-mfa-self-enrollment';

const { startMock, confirmMock } = vi.hoisted(() => ({ startMock: vi.fn(), confirmMock: vi.fn() }));

vi.mock('@/generated/api/auth/auth', () => ({
  getGetAdminMfaStatusQueryKey: () => ['/api/v1/admin/auth/mfa'],
  startAdminMfaSelfEnrollment: startMock,
  confirmAdminMfaSelfEnrollment: confirmMock,
}));

beforeAll(() => {
  const getComputedStyle = window.getComputedStyle.bind(window);
  window.getComputedStyle = (element: Element) => getComputedStyle(element);
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
});

let api: ReturnType<typeof useMfaSelfEnrollment> | undefined;
function Harness() {
  api = useMfaSelfEnrollment();
  return <>{api.selfEnrollmentModal}</>;
}

function renderHarness() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <App>
        <Harness />
      </App>
    </QueryClientProvider>,
  );
  return queryClient;
}

async function typeCode(code: string) {
  const cells = await screen.findAllByRole('textbox');
  await act(async () => {
    fireEvent.input(cells[0], { target: { value: code } });
  });
}

const provisioning = { otpauthUri: 'otpauth://totp/DCTD:me?secret=SELF', secret: 'SELFSECRET' };
const active = { status: 'ACTIVE', enforced: true, exempt: false, confirmedAt: '2026-10-02T00:00:00.000Z' };

describe('useMfaSelfEnrollment', () => {
  it('sinh QR một lần, kích hoạt bằng mã đầu tiên và cập nhật trạng thái 2FA', async () => {
    startMock.mockResolvedValue(provisioning);
    confirmMock.mockResolvedValue(active);
    const queryClient = renderHarness();

    await act(async () => {
      await api!.startSelfEnrollment();
    });
    expect(startMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('SELFSECRET')).toBeTruthy();

    await typeCode('123456');

    expect(confirmMock).toHaveBeenCalledWith({ code: '123456' });
    await waitFor(() => expect(queryClient.getQueryData(['/api/v1/admin/auth/mfa'])).toEqual(active));
  });

  it('mã sai: giữ QR và báo lỗi để nhập lại', async () => {
    startMock.mockResolvedValue(provisioning);
    confirmMock.mockRejectedValue(new ApiError(403, { statusCode: 403, code: 'MFA_CODE_INVALID', message: 'x' }));
    renderHarness();

    await act(async () => {
      await api!.startSelfEnrollment();
    });
    await typeCode('000000');

    expect(await screen.findByText('Mã xác thực không đúng hoặc đã được sử dụng.')).toBeTruthy();
    expect(screen.getByText('SELFSECRET')).toBeTruthy();
  });
});
