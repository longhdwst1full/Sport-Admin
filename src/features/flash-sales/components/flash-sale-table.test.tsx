// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FlashSaleCampaignSummaryDto } from '@/generated/api/promotions/promotions.schemas';
import { FlashSaleTable } from './flash-sale-table';

const mutate = vi.hoisted(() => vi.fn());
vi.mock('../hooks/use-change-flash-sale-status', () => ({
  useChangeFlashSaleStatus: () => ({ mutate, isPending: false, variables: undefined }),
}));

type Column = { render?: (value: unknown, row: FlashSaleCampaignSummaryDto) => ReactNode };
// Chỉ cột hành động có `render`; bảng giả vẽ riêng ô hành động của từng dòng.
vi.mock('@/foundation/table', () => ({
  ADMIN_TABLE_DEFAULT_PAGE_SIZE: 20,
  col: {
    text: () => ({}),
    dateTime: () => ({}),
    number: () => ({}),
    status: () => ({}),
    actions: (render: (row: FlashSaleCampaignSummaryDto) => ReactNode) => ({ render: (_: unknown, row: FlashSaleCampaignSummaryDto) => render(row) }),
  },
  AdminTable: ({ dataSource, columns }: { dataSource: FlashSaleCampaignSummaryDto[]; columns: Column[] }) => (
    <div>{dataSource.map((row) => <div key={row.id}>{columns.at(-1)?.render?.(undefined, row)}</div>)}</div>
  ),
  TableActionButton: ({ label, title, onClick }: { label: string; title?: string; onClick?: () => void }) => (
    <button type="button" aria-label={label} title={title} onClick={onClick} />
  ),
}));

window.matchMedia ??= (query: string) => ({
  matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
});

const campaign = (status: FlashSaleCampaignSummaryDto['status']): FlashSaleCampaignSummaryDto => ({
  id: '7', code: 'FS-7', name: 'Sale 11.11', startsAt: '2026-11-11T00:00:00Z', endsAt: '2026-11-12T00:00:00Z',
  status, itemCount: 3, version: '4',
});

function renderTable(row: FlashSaleCampaignSummaryDto, canManage: boolean) {
  render(<FlashSaleTable rows={[row]} loading={false} page={1} total={1} onPageChange={vi.fn()} onOpen={vi.fn()} canManage={canManage} />);
}

afterEach(() => { cleanup(); mutate.mockClear(); });

describe('FlashSaleTable quick status actions', () => {
  it('schedules a draft campaign from the row after confirmation, sending the row version', async () => {
    renderTable(campaign('DRAFT'), true);
    fireEvent.click(screen.getByRole('button', { name: 'Lên lịch Sale 11.11' }));
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận' }));
    expect(mutate).toHaveBeenCalledWith({ id: '7', version: '4', status: 'SCHEDULED' });
  });

  it('runs a scheduled campaign right away after confirmation', async () => {
    renderTable(campaign('SCHEDULED'), true);
    fireEvent.click(screen.getByRole('button', { name: 'Chạy ngay Sale 11.11' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận' }));
    expect(mutate).toHaveBeenCalledWith({ id: '7', version: '4', status: 'ACTIVE' });
  });

  it.each(['ACTIVE', 'ENDED', 'CANCELLED'] as const)('offers no quick action for %s campaigns', (status) => {
    renderTable(campaign(status), true);
    expect(screen.queryByRole('button', { name: /Lên lịch|Chạy ngay/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Xem Sale 11.11' })).toBeTruthy();
  });

  it('hides quick actions without the manage permission', () => {
    renderTable(campaign('DRAFT'), false);
    expect(screen.queryByRole('button', { name: /Lên lịch|Chạy ngay/ })).toBeNull();
  });
});
