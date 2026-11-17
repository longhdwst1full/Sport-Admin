// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderLiveWatcher } from './order-live-watcher';

type Latest = { id: string; orderNo: string; placedAt: string } | null;
const live = vi.hoisted(() => ({ value: { isSuccess: false, data: undefined as undefined | { latestWebOrder: Latest } } }));
vi.mock('../hooks/use-order-live-summary', () => ({ useOrderLiveSummary: () => live.value }));

window.matchMedia ??= (query: string) => ({
  matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
});

function setLatest(latest: Latest) {
  live.value = { isSuccess: true, data: { latestWebOrder: latest } };
}

function renderWatcher() {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const view = render(
    <QueryClientProvider client={queryClient}>
      <App>
        <MemoryRouter>
          <OrderLiveWatcher />
        </MemoryRouter>
      </App>
    </QueryClientProvider>,
  );
  const rerender = () => view.rerender(
    <QueryClientProvider client={queryClient}>
      <App>
        <MemoryRouter>
          <OrderLiveWatcher />
        </MemoryRouter>
      </App>
    </QueryClientProvider>,
  );
  return { invalidate, rerender };
}

const order = (id: string): Latest => ({ id, orderNo: `ORD-${id}`, placedAt: '2026-11-17T05:00:00.000Z' });

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  live.value = { isSuccess: false, data: undefined };
});

describe('OrderLiveWatcher', () => {
  it('lần hỏi đầu chỉ lấy mốc: đơn đã có từ trước không bị báo', () => {
    setLatest(order('10'));
    const { invalidate } = renderWatcher();
    expect(screen.queryByText('🛒 Có đơn hàng mới')).toBeNull();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('có đơn web mới thì báo đúng một lần và làm mới danh sách đơn + KPI', async () => {
    setLatest(order('10'));
    const { invalidate, rerender } = renderWatcher();

    setLatest(order('11'));
    await act(async () => rerender());
    expect(await screen.findByText('🛒 Có đơn hàng mới')).toBeTruthy();
    expect(screen.getByText(/ORD-11/)).toBeTruthy();
    expect(invalidate).toHaveBeenCalledTimes(2);

    // Lần hỏi sau vẫn là đơn 11 → không báo lại.
    setLatest(order('11'));
    await act(async () => rerender());
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it('chưa có đơn web nào rồi có đơn đầu tiên thì vẫn báo', async () => {
    setLatest(null);
    const { invalidate, rerender } = renderWatcher();
    setLatest(order('1'));
    await act(async () => rerender());
    expect(await screen.findByText('🛒 Có đơn hàng mới')).toBeTruthy();
    expect(invalidate).toHaveBeenCalledTimes(2);
  });
});
