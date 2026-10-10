// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickAdminFulfillment } from '@/generated/api/fulfillments/fulfillments';
import { FulfillmentWorkflowPanel } from './fulfillment-workflow-panel';

// AntD's Grid.useBreakpoint subscribes via matchMedia; jsdom doesn't implement it.
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

const { useGetAdminFulfillmentByOrderMock, retryAdminFulfillmentCarrierShipmentMock, useCanMock } = vi.hoisted(() => ({
  useGetAdminFulfillmentByOrderMock: vi.fn(),
  retryAdminFulfillmentCarrierShipmentMock: vi.fn(),
  useCanMock: vi.fn<(permission: string) => boolean>(() => true),
}));

vi.mock('@/core/auth/permissions', () => ({ useCan: useCanMock }));

vi.mock('@/generated/api/fulfillments/fulfillments', () => ({
  deliverAdminFulfillment: vi.fn(),
  failAdminFulfillmentDelivery: vi.fn(),
  getGetAdminFulfillmentByOrderQueryKey: (orderId: string) => ['fulfillment-by-order', orderId],
  getGetAdminFulfillmentQueryKey: (id: string) => ['fulfillment', id],
  getListAdminFulfillmentsQueryKey: () => ['fulfillments'],
  packAdminFulfillment: vi.fn(),
  pickAdminFulfillment: vi.fn(),
  receiveAdminFulfillmentReturn: vi.fn(),
  retryAdminFulfillmentCarrierShipment: retryAdminFulfillmentCarrierShipmentMock,
  shipAdminFulfillment: vi.fn(),
  useGetAdminFulfillmentByOrder: useGetAdminFulfillmentByOrderMock,
}));

vi.mock('@/generated/api/orders/orders', () => ({
  getGetAdminOrderQueryKey: () => ['order'],
  getListAdminOrdersQueryKey: () => ['orders'],
}));

function baseFulfillment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'f-1',
    fulfillmentNo: 'FF-001',
    status: 'SHIPPED',
    version: 1,
    warehouseName: 'Kho HN',
    carrierCode: 'GHN',
    trackingNo: null,
    carrierShipmentStatus: 'CREATE_FAILED',
    carrierShipmentError: 'GHN từ chối: sai địa chỉ',
    history: [],
    ...overrides,
  };
}

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FulfillmentWorkflowPanel orderId="order-1" />
    </QueryClientProvider>,
  );
}

describe('FulfillmentWorkflowPanel retry carrier shipment button', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useCanMock.mockReturnValue(true);
  });

  it('shows an enabled retry button when carrier shipment creation failed and the actor can ship', () => {
    useGetAdminFulfillmentByOrderMock.mockReturnValue({
      data: baseFulfillment(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderPanel();

    const retryButton = screen.getByRole('button', { name: 'Tạo lại vận đơn' });
    expect(retryButton).toBeTruthy();
    expect((retryButton as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText('GHN từ chối: sai địa chỉ')).toBeTruthy();
  });

  it('hides the retry button when the actor lacks fulfillment.ship permission', () => {
    useCanMock.mockImplementation((permission: string) => permission !== 'fulfillment.ship');
    useGetAdminFulfillmentByOrderMock.mockReturnValue({
      data: baseFulfillment(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderPanel();

    expect(screen.queryByRole('button', { name: 'Tạo lại vận đơn' })).toBeNull();
  });

  it('does not render the retry alert when carrier shipment is not CREATE_FAILED', () => {
    useGetAdminFulfillmentByOrderMock.mockReturnValue({
      data: baseFulfillment({ carrierShipmentStatus: 'CREATED', carrierShipmentError: null }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderPanel();

    expect(screen.queryByRole('button', { name: 'Tạo lại vận đơn' })).toBeNull();
  });

  it('calls retryAdminFulfillmentCarrierShipment with the fulfillment id on click and reports success', async () => {
    retryAdminFulfillmentCarrierShipmentMock.mockResolvedValue(
      baseFulfillment({ carrierShipmentStatus: 'CREATED', carrierShipmentError: null }),
    );
    useGetAdminFulfillmentByOrderMock.mockReturnValue({
      data: baseFulfillment(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Tạo lại vận đơn' }));

    await waitFor(() => expect(retryAdminFulfillmentCarrierShipmentMock).toHaveBeenCalledWith('f-1'));
  });
});

describe('FulfillmentWorkflowPanel transition modal', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useCanMock.mockReturnValue(true);
  });

  it('closes the action modal after the transition succeeds', async () => {
    // Giữ request treo tới khi UI đã render trạng thái pending — giống độ trễ mạng thật,
    // để onSuccess chạy với closure của lần render mà mutation.isPending === true.
    let resolvePick: (value: unknown) => void = () => undefined;
    vi.mocked(pickAdminFulfillment).mockImplementation(() => new Promise((resolve) => { resolvePick = resolve; }) as never);
    useGetAdminFulfillmentByOrderMock.mockReturnValue({
      data: baseFulfillment({ status: 'PENDING', carrierShipmentStatus: null, carrierShipmentError: null }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <App>
          <FulfillmentWorkflowPanel orderId="order-1" />
        </App>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Lấy hàng/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: 'đã kiểm' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu lấy' }));

    await waitFor(() => expect(pickAdminFulfillment).toHaveBeenCalledWith(
      'f-1',
      { expectedVersion: 1, note: 'đã kiểm' },
      expect.objectContaining({ headers: expect.any(Object) }),
    ));
    await waitFor(() => expect(screen.getByRole('button', { name: /Bắt đầu lấy/ }).className).toContain('ant-btn-loading'));
    resolvePick(baseFulfillment({ status: 'PICKING', version: 2, carrierShipmentStatus: null }));
    // Trước bản sửa: closeModal bị chặn bởi isPending trong onSuccess nên modal vẫn mở.
    // FormModal dùng destroyOnHidden: modal đóng thì hoặc đã bị gỡ khỏi DOM, hoặc còn đang ẩn.
    await waitFor(() => {
      const wrap = dialog.closest('.ant-modal-wrap');
      expect(!dialog.isConnected || (wrap?.getAttribute('style') ?? '').includes('display: none')).toBe(true);
    });
  });
});
