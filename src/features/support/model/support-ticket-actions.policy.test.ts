import { describe, expect, it } from 'vitest';
import { availableSupportTicketActions, canReplySupportTicket } from './support-ticket-actions.policy';

type Status = 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'CLOSED';
const at = (status: Status) => ({ status });
const all = new Set(['support.ticket.manage', 'support.ticket.assign', 'support.ticket.close']);

describe('availableSupportTicketActions', () => {
  it.each<[Status, string[]]>([
    ['OPEN', ['assign']],
    ['ASSIGNED', ['assign', 'resolve']],
    ['RESOLVED', ['close']],
    ['CLOSED', []],
  ])('with every permission, %s offers %j', (status, expected) => {
    expect(availableSupportTicketActions(at(status), all)).toEqual(expected);
  });

  it('hides assign without the assign permission', () => {
    const perms = new Set(['support.ticket.manage']);
    expect(availableSupportTicketActions(at('OPEN'), perms)).toEqual([]);
    expect(availableSupportTicketActions(at('ASSIGNED'), perms)).toEqual(['resolve']);
  });

  it('hides resolve without manage and close without close', () => {
    expect(availableSupportTicketActions(at('ASSIGNED'), new Set(['support.ticket.assign']))).toEqual(['assign']);
    expect(availableSupportTicketActions(at('RESOLVED'), new Set(['support.ticket.manage']))).toEqual([]);
  });

  it('offers nothing without any permission', () => {
    for (const s of ['OPEN', 'ASSIGNED', 'RESOLVED', 'CLOSED'] as const) {
      expect(availableSupportTicketActions(at(s), new Set())).toEqual([]);
    }
  });
});

describe('canReplySupportTicket', () => {
  const manage = new Set(['support.ticket.manage']);

  it.each<Status>(['OPEN', 'ASSIGNED', 'RESOLVED'])('allows reply on %s with manage', (status) => {
    expect(canReplySupportTicket(at(status), manage)).toBe(true);
  });

  it('blocks reply when CLOSED even with manage', () => {
    expect(canReplySupportTicket(at('CLOSED'), manage)).toBe(false);
  });

  it('blocks reply without manage', () => {
    expect(canReplySupportTicket(at('OPEN'), new Set(['support.ticket.assign']))).toBe(false);
  });
});
