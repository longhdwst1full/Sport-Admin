import { describe, expect, it } from 'vitest';
import type { RevenuePointDto } from '@/generated/api/reporting/reporting.schemas';
import { toKpiCards, toReportRange, toRevenueSeries, toScopeLabel, toStatusSlices } from './dashboard.mapper';

const point = (date: string, netAmount: string, orderCount: number): RevenuePointDto => ({
  date,
  amount: netAmount,
  orderCount,
  refundAmount: '0',
  netAmount,
});

describe('dashboard.mapper', () => {
  it('toReportRange lùi đúng số ngày theo mức gom', () => {
    const now = new Date('2026-10-06T00:00:00.000Z');
    expect(toReportRange('DAY', now)).toEqual({
      from: '2026-09-06T00:00:00.000Z',
      to: '2026-10-06T00:00:00.000Z',
    });
    expect(toReportRange('MONTH', now).from).toBe('2025-10-06T00:00:00.000Z');
  });

  it('toRevenueSeries cắt năm chỉ ở mức ngày và đổi tiền sang số', () => {
    const series = [point('2026-09-30', '1500000.50', 3)];
    expect(toRevenueSeries(series, 'DAY')).toEqual([{ date: '09-30', amount: 1500000.5, orders: 3 }]);
    expect(toRevenueSeries([point('2026-Q3', '10', 1)], 'QUARTER')[0].date).toBe('2026-Q3');
  });

  it('toStatusSlices giữ mã thô khi trạng thái không có nhãn', () => {
    expect(toStatusSlices([{ status: 'UNKNOWN_X', count: 2 }])).toEqual([{ name: 'UNKNOWN_X', value: 2 }]);
  });

  it('toScopeLabel ưu tiên phạm vi toàn hệ thống', () => {
    expect(toScopeLabel([{ type: 'BRANCH' }, { type: 'GLOBAL' }])).toBe('Toàn hệ thống');
    expect(toScopeLabel([{ type: 'BRANCH' }, { type: 'BRANCH' }])).toBe('2 chi nhánh được phân quyền');
    expect(toScopeLabel(undefined)).toBe('0 chi nhánh được phân quyền');
  });

  it('toKpiCards ẩn số và không loading khi thiếu quyền', () => {
    const cards = toKpiCards({
      canSeeRevenue: false,
      canSeeOperation: false,
      canSeeInventory: false,
      revenue: undefined,
      overview: undefined,
      inventory: undefined,
      revenuePending: true,
      overviewPending: true,
      inventoryPending: true,
    });
    expect(cards.map((card) => card.value)).toEqual(['—', '—', '—', '—', '—']);
    expect(cards.some((card) => card.loading)).toBe(false);
    expect(cards[0].hint).toBe('Cần quyền xem doanh thu');
  });

  it('toKpiCards lấy loading theo đúng endpoint sở hữu', () => {
    const cards = toKpiCards({
      canSeeRevenue: true,
      canSeeOperation: true,
      canSeeInventory: true,
      revenue: undefined,
      overview: undefined,
      inventory: { trackedBalances: 1, outOfStock: 4, lowStock: 7, items: [] },
      revenuePending: true,
      overviewPending: false,
      inventoryPending: false,
    });
    expect(cards.map((card) => card.loading)).toEqual([true, true, false, false, false]);
    expect(cards[4]).toMatchObject({ value: 7, hint: '4 SKU đã hết hàng bán' });
  });
});
