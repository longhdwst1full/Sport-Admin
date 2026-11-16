// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/fetcher';
import { PaymentDetailDrawer } from './payment-detail-drawer';

// AntD Grid/Image dùng matchMedia; jsdom không có.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

const { getAdminPaymentMock, confirmAdminPaymentMock } = vi.hoisted(() => ({
  getAdminPaymentMock: vi.fn(),
  confirmAdminPaymentMock: vi.fn(),
}));

vi.mock('@/core/auth/permissions', () => ({ useCan: () => true }));

vi.mock('@/generated/api/payments/payments', () => ({
  confirmAdminPayment: confirmAdminPaymentMock,
  getAdminPayment: getAdminPaymentMock,
  getGetAdminPaymentQueryKey: (id?: string) => ['payment', id],
  getListAdminPaymentsQueryKey: () => ['payments'],
  recordLatePaymentReceipt: vi.fn(),
  recordManualRefundAdmin: vi.fn(),
  rejectAdminPayment: vi.fn(),
  resendAdminPaymentInstruction: vi.fn(),
}));

vi.mock('@/generated/api/fulfillments/fulfillments', () => ({
  getGetAdminFulfillmentByOrderQueryKey: (orderId: string) => ['fulfillment-by-order', orderId],
}));

vi.mock('@/generated/api/orders/orders', () => ({
  getGetAdminOrderQueryKey: (id: string) => ['order', id],
  getListAdminOrdersQueryKey: () => ['orders'],
}));

function payment(version: string) {
  return {
    id: '11',
    orderId: '21',
    orderNo: 'BA-0001',
    orderStatus: 'PENDING_CONFIRMATION',
    paymentRef: 'PAY-0001',
    method: 'BANK_TRANSFER',
    status: 'AWAITING_CONFIRMATION',
    expectedAmount: '500000',
    receivedAmount: '0',
    currencyCode: 'VND',
    version,
    instruction: {},
    evidences: [],
  };
}

function renderDrawer() {
  // staleTime giống app thật: không có refetch chủ động thì bản cũ sống tiếp tới 20s.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 20_000 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <App>
        <PaymentDetailDrawer paymentId="11" onClose={() => undefined} />
      </App>
    </QueryClientProvider>,
  );
}

describe('PaymentDetailDrawer stale version', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('reloads the payment after a 409 so the next confirm sends the new expectedVersion', async () => {
    getAdminPaymentMock.mockResolvedValueOnce(payment('1')).mockResolvedValue(payment('2'));
    confirmAdminPaymentMock.mockRejectedValue(
      new ApiError(409, {
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Thông tin thanh toán đã thay đổi; vui lòng tải lại trước khi xử lý',
      }),
    );

    renderDrawer();

    const confirmButton = await screen.findByRole('button', { name: 'Xác nhận đủ tiền' });
    await waitFor(() => expect((confirmButton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(confirmButton);
    fireEvent.change(await screen.findByLabelText('Mã giao dịch/đối soát'), { target: { value: 'FT123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));

    await waitFor(() => expect(confirmAdminPaymentMock).toHaveBeenCalledTimes(1));
    expect(confirmAdminPaymentMock.mock.calls[0][1]).toMatchObject({ expectedVersion: '1' });
    await waitFor(() => expect(getAdminPaymentMock).toHaveBeenCalledTimes(2));

    // Gửi lại sau khi đã có bản mới: phải mang version mới, không lặp lại 409 với version cũ.
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    await waitFor(() => expect(confirmAdminPaymentMock).toHaveBeenCalledTimes(2));
    expect(confirmAdminPaymentMock.mock.calls[1][1]).toMatchObject({ expectedVersion: '2' });
    expect(confirmAdminPaymentMock.mock.calls[1][2].headers['idempotency-key']).not.toBe(
      confirmAdminPaymentMock.mock.calls[0][2].headers['idempotency-key'],
    );
  }, 20_000);

  it('does not reload the payment on a non-conflict error', async () => {
    getAdminPaymentMock.mockResolvedValue(payment('1'));
    confirmAdminPaymentMock.mockRejectedValue(
      new ApiError(400, { statusCode: 400, code: 'VALIDATION_FAILED', message: 'Sai dữ liệu' }),
    );

    renderDrawer();

    const confirmButton = await screen.findByRole('button', { name: 'Xác nhận đủ tiền' });
    await waitFor(() => expect((confirmButton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(confirmButton);
    fireEvent.change(await screen.findByLabelText('Mã giao dịch/đối soát'), { target: { value: 'FT123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));

    await waitFor(() => expect(confirmAdminPaymentMock).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(getAdminPaymentMock).toHaveBeenCalledTimes(1);
  }, 20_000);
});
