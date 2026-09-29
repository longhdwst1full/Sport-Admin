import { describe, expect, it } from 'vitest';
import {
  toListAdminSupportTicketsParams,
  toSupportTicketDetail,
  toSupportTicketPage,
  toSupportTicketSummary,
} from './support-ticket.mapper';

const summaryDto = {
  id: 't1',
  ticketNo: 'TK-1',
  subject: 'Hỏng máy',
  customerName: 'An',
  branchId: null,
  status: 'OPEN',
  priority: 'HIGH',
  assigneeUserId: null,
  assigneeName: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-02T00:00:00Z',
  version: '7',
} as never;

describe('toSupportTicketSummary', () => {
  it('turns nullable fields into undefined and keeps the version as a string', () => {
    const result = toSupportTicketSummary(summaryDto);
    expect(result.branchId).toBeUndefined();
    expect(result.assigneeUserId).toBeUndefined();
    expect(result.assigneeName).toBeUndefined();
    expect(result.version).toBe('7');
  });

  it('keeps present optional values', () => {
    const result = toSupportTicketSummary({
      ...(summaryDto as object),
      branchId: 'b1',
      assigneeUserId: 'u1',
      assigneeName: 'Bình',
    } as never);
    expect(result).toMatchObject({ branchId: 'b1', assigneeUserId: 'u1', assigneeName: 'Bình' });
  });
});

describe('toSupportTicketPage', () => {
  it('maps items and exposes meta.total', () => {
    const page = toSupportTicketPage({ items: [summaryDto], meta: { total: 42 } } as never);
    expect(page.total).toBe(42);
    expect(page.items).toHaveLength(1);
    expect(page.items[0].ticketNo).toBe('TK-1');
  });
});

describe('toSupportTicketDetail', () => {
  it('renames isInternal to internal and nulls to undefined', () => {
    const detail = toSupportTicketDetail({
      ...(summaryDto as object),
      customerNo: 'C1',
      customerPhone: null,
      customerEmail: 'a@b.c',
      resolutionNote: null,
      assignedAt: null,
      resolvedAt: null,
      closedAt: null,
      messages: [
        { id: 'm1', authorType: 'STAFF', authorName: null, body: 'note', isInternal: true, createdAt: 'x' },
        { id: 'm2', authorType: 'CUSTOMER', authorName: 'An', body: 'hi', isInternal: false, createdAt: 'y' },
      ],
    } as never);
    expect(detail.customerPhone).toBeUndefined();
    expect(detail.customerEmail).toBe('a@b.c');
    expect(detail.resolutionNote).toBeUndefined();
    expect(detail.closedAt).toBeUndefined();
    expect(detail.messages[0]).toMatchObject({ internal: true, authorName: undefined });
    expect(detail.messages[1].internal).toBe(false);
    expect(detail.messages[0]).not.toHaveProperty('isInternal');
  });
});

describe('toListAdminSupportTicketsParams', () => {
  it('always sends page and limit and omits empty filters', () => {
    expect(toListAdminSupportTicketsParams({ page: 1, limit: 20, search: '', branchId: '' })).toEqual({
      page: 1,
      limit: 20,
    });
  });

  it('includes every filter that has a value', () => {
    expect(
      toListAdminSupportTicketsParams({
        page: 2,
        limit: 10,
        status: 'ASSIGNED',
        priority: 'URGENT',
        assigneeUserId: 'u1',
        branchId: 'b1',
        search: 'máy',
      }),
    ).toEqual({
      page: 2,
      limit: 10,
      status: 'ASSIGNED',
      priority: 'URGENT',
      assigneeUserId: 'u1',
      branchId: 'b1',
      search: 'máy',
    });
  });
});
