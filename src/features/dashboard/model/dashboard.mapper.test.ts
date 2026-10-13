import { describe, expect, it } from 'vitest';
import type { RevenuePointDto } from '@/generated/api/reporting/reporting.schemas';
import {
  formatCompactMoney,
  toKpiCards,
  toPeriodKeys,
  toReportRange,
  toRevenueSeries,
  toScopeLabel,
  toStatusSlices,
  type KpiInput,
} from './dashboard.mapper';

const point = (date: string, netAmount: string, orderCount: number): RevenuePointDto => ({
  date,
  amount: netAmount,
  orderCount,
  refundAmount: '0',
  netAmount,
});

const idle = { isPending: false, isError: false, retry: () => undefined };

function kpiInput(overrides: Partial<KpiInput> = {}): KpiInput {
  return {
    granularity: 'DAY',
    revenue: { allowed: true, data: undefined, state: idle },
    overview: { allowed: true, data: undefined, state: idle },
    inventory: { allowed: true, data: undefined, state: idle },
    ...overrides,
  };
}

describe('dashboard.mapper', () => {
  it('toReportRange lùi đúng số ngày theo mức gom', () => {
    const now = new Date('2026-10-06T00:00:00.000Z');
    expect(toReportRange('DAY', now)).toEqual({
      from: '2026-09-06T00:00:00.000Z',
      to: '2026-10-06T00:00:00.000Z',
    });
    expect(toReportRange('MONTH', now).from).toBe('2025-10-06T00:00:00.000Z');
  });

  it('toPeriodKeys cắt kỳ theo giờ Việt Nam như Backend', () => {
    // 17:30 UTC = 00:30 ngày hôm sau ở Việt Nam.
    const range = { from: '2026-09-29T17:30:00.000Z', to: '2026-10-01T10:00:00.000Z' };
    expect(toPeriodKeys(range, 'DAY')).toEqual(['2026-09-30', '2026-10-01']);
    expect(
      toPeriodKeys({ from: '2025-11-15T00:00:00Z', to: '2026-02-01T00:00:00Z' }, 'QUARTER'),
    ).toEqual(['2025-Q4', '2026-Q1']);
    expect(
      toPeriodKeys({ from: '2025-11-15T00:00:00Z', to: '2026-01-01T00:00:00Z' }, 'MONTH'),
    ).toEqual(['2025-11', '2025-12', '2026-01']);
    expect(
      toPeriodKeys({ from: '2024-06-01T00:00:00Z', to: '2026-01-01T00:00:00Z' }, 'YEAR'),
    ).toEqual(['2024', '2025', '2026']);
  });

  it('toRevenueSeries điền kỳ trống bằng 0, nhãn kiểu Việt Nam, đổi tiền sang số', () => {
    const range = { from: '2026-09-28T03:00:00.000Z', to: '2026-09-30T03:00:00.000Z' };
    expect(toRevenueSeries([point('2026-09-30', '1500000.50', 3)], 'DAY', range)).toEqual([
      { key: '2026-09-28', label: '28/09', fullLabel: '28/09/2026', amount: 0, orders: 0 },
      { key: '2026-09-29', label: '29/09', fullLabel: '29/09/2026', amount: 0, orders: 0 },
      { key: '2026-09-30', label: '30/09', fullLabel: '30/09/2026', amount: 1500000.5, orders: 3 },
    ]);
    const quarter = toRevenueSeries([point('2026-Q3', '10', 1)], 'QUARTER', {
      from: '2026-08-01T00:00:00Z',
      to: '2026-08-02T00:00:00Z',
    });
    expect(quarter).toEqual([
      { key: '2026-Q3', label: 'Q3/2026', fullLabel: 'Quý 3/2026', amount: 10, orders: 1 },
    ]);
  });

  it('toRevenueSeries không dựng đường 0 khi chưa có điểm nào', () => {
    expect(toRevenueSeries([], 'DAY', toReportRange('DAY', new Date()))).toEqual([]);
  });

  it('toStatusSlices giữ mã thô khi trạng thái không có nhãn và tính tỷ lệ', () => {
    expect(toStatusSlices([{ status: 'UNKNOWN_X', count: 2 }])).toEqual([
      { key: 'UNKNOWN_X', name: 'UNKNOWN_X', value: 2, color: '#047857', percentLabel: '100%' },
    ]);
  });

  it('toStatusSlices gộp đuôi thành "Khác" để không lặp màu', () => {
    const rows = Array.from({ length: 8 }, (_, index) => ({
      status: `S${index}`,
      count: 8 - index,
    }));
    const slices = toStatusSlices(rows);
    expect(slices).toHaveLength(6);
    expect(slices[5]).toMatchObject({ key: 'OTHER', name: 'Khác', value: 3 + 2 + 1 });
    expect(new Set(slices.map((slice) => slice.color)).size).toBe(6);
  });

  it('formatCompactMoney rút gọn kiểu Việt Nam', () => {
    expect(formatCompactMoney(0)).toBe('0');
    expect(formatCompactMoney(1_200_000)).toBe('1,2 tr');
    expect(formatCompactMoney(3_400_000_000)).toBe('3,4 tỷ');
    expect(formatCompactMoney(500_000)).toBe('500 k');
  });

  it('toScopeLabel ưu tiên phạm vi toàn hệ thống', () => {
    expect(toScopeLabel([{ type: 'BRANCH' }, { type: 'GLOBAL' }])).toBe('Toàn hệ thống');
    expect(toScopeLabel([{ type: 'BRANCH' }, { type: 'BRANCH' }])).toBe(
      '2 chi nhánh được phân quyền',
    );
    expect(toScopeLabel(undefined)).toBe('0 chi nhánh được phân quyền');
  });

  it('toKpiCards ẩn số và không loading khi thiếu quyền', () => {
    const pending = { ...idle, isPending: true };
    const cards = toKpiCards(
      kpiInput({
        revenue: { allowed: false, data: undefined, state: pending },
        overview: { allowed: false, data: undefined, state: pending },
        inventory: { allowed: false, data: undefined, state: pending },
      }),
    );
    expect(cards.map((card) => card.value)).toEqual(['—', '—', '—', '—', '—']);
    expect(cards.every((card) => card.status === 'denied')).toBe(true);
    expect(cards[0].hint).toBe('Cần quyền xem doanh thu');
  });

  it('toKpiCards lấy trạng thái theo đúng endpoint sở hữu', () => {
    const cards = toKpiCards(
      kpiInput({
        granularity: 'MONTH',
        revenue: { allowed: true, data: undefined, state: { ...idle, isPending: true } },
        inventory: {
          allowed: true,
          data: { trackedBalances: 1, outOfStock: 4, lowStock: 7, items: [] },
          state: idle,
        },
      }),
    );
    expect(cards.map((card) => card.status)).toEqual([
      'loading',
      'loading',
      'ready',
      'ready',
      'ready',
    ]);
    expect(cards[4]).toMatchObject({
      value: '7',
      hint: 'Gồm 4 dòng tồn (SKU × kho) đã hết hàng bán',
    });
    expect(cards[0]).toMatchObject({ label: 'Doanh thu thuần', period: '12 tháng gần nhất' });
  });

  it('toKpiCards hiện lỗi thay vì số 0 khi tải thất bại', () => {
    const retry = () => undefined;
    const cards = toKpiCards(
      kpiInput({
        inventory: { allowed: true, data: undefined, state: { ...idle, isError: true, retry } },
      }),
    );
    expect(cards[4]).toMatchObject({
      status: 'error',
      value: '—',
      hint: 'Không tải được số liệu',
      retry,
    });
  });
});
