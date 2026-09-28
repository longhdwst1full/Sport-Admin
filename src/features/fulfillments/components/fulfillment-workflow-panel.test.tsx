// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
