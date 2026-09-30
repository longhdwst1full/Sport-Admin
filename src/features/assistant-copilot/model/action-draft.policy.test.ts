import { describe, expect, it } from 'vitest';
import { ACTION_DRAFT_FAILURE_CODE } from '../constants/copilot.constants';
import {
  actionDraftAffordances,
  askAgainPrompt,
  effectiveDraftStatus,
  formatQuantityDelta,
  formatRemaining,
} from './action-draft.policy';
import type { StockAdjustmentDraft } from './copilot.types';

const NOW = Date.parse('2026-09-29T10:00:00Z');
const adjust = new Set(['inventory.stock.adjust']);

const draft = (overrides: Partial<StockAdjustmentDraft> = {}): StockAdjustmentDraft => ({
  id: 'd1',
  conversationId: 'c1',
  actionType: 'STOCK_ADJUSTMENT',
  status: 'PENDING',
  version: 1,
  payloadHash: 'h',
  warehouseCode: 'WH1',
  sku: 'SKU-1',
  productName: 'Bóng',
  currentOnHand: 10,
  requestedOnHand: 12,
  delta: 2,
  consistent: true,
  reason: 'Kiểm đếm',
  expiresAt: '2026-09-29T10:05:00Z',
  createdAt: '2026-09-29T09:55:00Z',
  ...overrides,
});

describe('effectiveDraftStatus', () => {
  it('treats a PENDING draft past expiresAt as EXPIRED', () => {
    expect(effectiveDraftStatus(draft({ expiresAt: '2026-09-29T10:00:00Z' }), NOW)).toBe('EXPIRED');
    expect(effectiveDraftStatus(draft(), NOW)).toBe('PENDING');
  });

  it('keeps terminal statuses regardless of time', () => {
    expect(effectiveDraftStatus(draft({ status: 'EXECUTED', expiresAt: '2000-01-01T00:00:00Z' }), NOW)).toBe('EXECUTED');
  });
});

describe('actionDraftAffordances', () => {
  it('allows confirm and reject on a pending draft with inventory.stock.adjust', () => {
    expect(actionDraftAffordances(draft(), adjust, NOW)).toMatchObject({
      status: 'PENDING',
      canConfirm: true,
      canReject: true,
      offerAskAgain: false,
    });
  });

  it('blocks confirm (not reject) without inventory.stock.adjust', () => {
    const result = actionDraftAffordances(draft(), new Set(), NOW);
    expect(result.canConfirm).toBe(false);
    expect(result.canReject).toBe(true);
    expect(result.confirmBlockedReason).toContain('quyền điều chỉnh tồn');
  });

  it('blocks confirm on an inconsistent draft and offers to ask again', () => {
    const result = actionDraftAffordances(draft({ consistent: false }), adjust, NOW);
    expect(result.canConfirm).toBe(false);
    expect(result.offerAskAgain).toBe(true);
  });

  it.each(['CONFIRMED', 'EXECUTED', 'REJECTED', 'FAILED', 'EXPIRED'] as const)('offers no command on %s', (status) => {
    const result = actionDraftAffordances(draft({ status }), adjust, NOW);
    expect(result.canConfirm).toBe(false);
    expect(result.canReject).toBe(false);
  });

  it('offers ask-again when the draft expired (locally or on the server)', () => {
    expect(actionDraftAffordances(draft({ expiresAt: '2026-09-29T09:59:59Z' }), adjust, NOW).offerAskAgain).toBe(true);
    expect(actionDraftAffordances(draft({ status: 'EXPIRED' }), adjust, NOW).offerAskAgain).toBe(true);
  });

  it('offers ask-again for a stock-changed failure only', () => {
    const changed = draft({ status: 'FAILED', errorCode: ACTION_DRAFT_FAILURE_CODE.STOCK_CHANGED });
    expect(actionDraftAffordances(changed, adjust, NOW).offerAskAgain).toBe(true);
    const other = draft({ status: 'FAILED', errorCode: 'SOMETHING_ELSE' });
    expect(actionDraftAffordances(other, adjust, NOW).offerAskAgain).toBe(false);
  });
});

describe('formatters', () => {
  it('always signs the delta', () => {
    expect(formatQuantityDelta(5)).toBe('+5');
    expect(formatQuantityDelta(-3)).toBe('-3');
    expect(formatQuantityDelta(0)).toBe('0');
  });

  it('formats the remaining time and returns undefined once expired', () => {
    expect(formatRemaining(65_000)).toBe('01:05');
    expect(formatRemaining(500)).toBe('00:01');
    expect(formatRemaining(3_661_000)).toBe('1:01:01');
    expect(formatRemaining(0)).toBeUndefined();
    expect(formatRemaining(-1)).toBeUndefined();
  });

  it('builds an ask-again prompt naming the SKU and warehouse', () => {
    const prompt = askAgainPrompt(draft());
    expect(prompt).toContain('SKU-1');
    expect(prompt).toContain('WH1');
  });
});
