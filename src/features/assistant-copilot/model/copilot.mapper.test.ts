import { describe, expect, it } from 'vitest';
import type { AdminActionDraftDto, AdminChatMessageDto } from '@/generated/api/assistant/assistant.schemas';
import {
  appendChatMessages,
  toCopilotMessage,
  toCopilotMessagePage,
  toSendAdminChatMessageBody,
  toStockAdjustmentDraft,
} from './copilot.mapper';

const draftDto: AdminActionDraftDto = {
  id: '11',
  conversationId: '5',
  actionType: 'STOCK_ADJUSTMENT',
  status: 'PENDING',
  preview: {
    warehouseCode: 'WH1',
    branchId: null,
    branchName: null,
    sku: 'SKU-1',
    productName: 'Bóng',
    currentOnHand: 10,
    requestedOnHand: 7,
    delta: -3,
    reason: 'Hỏng',
  },
  payloadHash: 'a'.repeat(64),
  version: 3,
  createdBy: '2',
  decidedBy: null,
  expiresAt: '2026-09-29T10:00:00Z',
  decidedAt: null,
  executedAt: null,
  resultRef: null,
  errorCode: null,
  createdAt: '2026-09-29T09:50:00Z',
};

const message = (id: string, actionDraftIds: string[] = []): AdminChatMessageDto => ({
  id,
  role: 'ASSISTANT',
  content: 'ok',
  actionDraftIds,
  createdAt: '2026-09-29T09:00:00Z',
});

describe('toStockAdjustmentDraft', () => {
  it('flattens the preview, turns nulls into undefined and keeps the numeric version', () => {
    const draft = toStockAdjustmentDraft(draftDto);
    expect(draft).toMatchObject({
      sku: 'SKU-1',
      warehouseCode: 'WH1',
      productName: 'Bóng',
      delta: -3,
      version: 3,
      consistent: true,
    });
    expect(draft.branchName).toBeUndefined();
    expect(draft.branchId).toBeUndefined();
    expect(draft.resultRef).toBeUndefined();
    expect(draft.errorCode).toBeUndefined();
    expect(draft.decidedAt).toBeUndefined();
  });

  it('marks a draft whose delta does not match requested - current as inconsistent', () => {
    const draft = toStockAdjustmentDraft({ ...draftDto, preview: { ...draftDto.preview, delta: 3 } });
    expect(draft.consistent).toBe(false);
  });

  it('exposes resultRef for EXECUTED and errorCode for FAILED', () => {
    expect(toStockAdjustmentDraft({ ...draftDto, status: 'EXECUTED', resultRef: 'ADJ-1' }).resultRef).toBe('ADJ-1');
    expect(
      toStockAdjustmentDraft({ ...draftDto, status: 'FAILED', errorCode: 'INVENTORY_EXPECTED_ON_HAND_MISMATCH' }).errorCode,
    ).toBe('INVENTORY_EXPECTED_ON_HAND_MISMATCH');
  });

  it('keeps branch info when present', () => {
    const draft = toStockAdjustmentDraft({
      ...draftDto,
      preview: { ...draftDto.preview, branchId: '7', branchName: 'CN Cầu Giấy' },
    });
    expect(draft).toMatchObject({ branchId: '7', branchName: 'CN Cầu Giấy' });
  });
});

describe('toCopilotMessage / toCopilotMessagePage', () => {
  it('keeps the draft ids of the turn', () => {
    expect(toCopilotMessage(message('m1', ['11', '12'])).actionDraftIds).toEqual(['11', '12']);
  });

  it('maps items and hasMore', () => {
    const page = toCopilotMessagePage({
      items: [message('m1')],
      meta: { limit: 50, hasMore: true, nextCursor: '9' },
    });
    expect(page.hasMore).toBe(true);
    expect(page.items.map((item) => item.id)).toEqual(['m1']);
  });
});

describe('appendChatMessages', () => {
  it('creates a page when the cache is empty', () => {
    expect(appendChatMessages(undefined, [message('m1')]).items.map((item) => item.id)).toEqual(['m1']);
  });

  it('appends new messages and skips ids already cached (idempotent replay)', () => {
    const page = { items: [message('m1')], meta: { limit: 50, hasMore: false, nextCursor: null } };
    expect(appendChatMessages(page, [message('m1'), message('m2')]).items.map((item) => item.id)).toEqual(['m1', 'm2']);
  });
});

describe('toSendAdminChatMessageBody', () => {
  it('trims content and omits pageContext without hints', () => {
    expect(toSendAdminChatMessageBody('  tồn kho?  ', undefined)).toEqual({ content: 'tồn kho?' });
    expect(toSendAdminChatMessageBody('x', { orderId: '' })).toEqual({ content: 'x' });
  });

  it('sends only the hints that have a value', () => {
    expect(toSendAdminChatMessageBody('x', { sku: 'A', warehouseCode: 'WH1' })).toEqual({
      content: 'x',
      pageContext: { sku: 'A', warehouseCode: 'WH1' },
    });
  });
});
