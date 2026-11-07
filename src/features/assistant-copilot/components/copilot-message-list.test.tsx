// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CopilotMessage } from '../model/copilot.types';
import { CopilotMessageList } from './copilot-message-list';

vi.mock('./action-draft-card', () => ({ ActionDraftCard: () => null }));
afterEach(cleanup);
const content = 'nay có những đơn hàng nào, số lượng, doanh thu ra sao';
const user: CopilotMessage = { id: '1', role: 'USER', content, actionDraftIds: [], createdAt: '2026-11-07T10:03:00Z' };

describe('Copilot pending message rendering', () => {
  it('renders the persisted pending question once, keeping the typing indicator', () => {
    render(<CopilotMessageList messages={[user]} pendingContent={content} onAskAgain={vi.fn()} />);
    expect(screen.getAllByText(content)).toHaveLength(1);
    expect(screen.getByText('Trợ lý đang tra cứu…')).toBeTruthy();
  });
  it('shows an optimistic bubble before the question is persisted', () => {
    render(<CopilotMessageList messages={[]} pendingContent={content} onAskAgain={vi.fn()} />);
    expect(screen.getAllByText(content)).toHaveLength(1);
  });
  it('does not hide a new identical question after the earlier one was answered', () => {
    render(<CopilotMessageList messages={[user, { ...user, id: '2', role: 'ASSISTANT', content: 'Kết quả trước' }]}
      pendingContent={content} onAskAgain={vi.fn()} />);
    expect(screen.getAllByText(content)).toHaveLength(2);
  });
  it('removes typing indicator on success or timeout', () => {
    render(<CopilotMessageList messages={[user]} onAskAgain={vi.fn()} />);
    expect(screen.queryByText('Trợ lý đang tra cứu…')).toBeNull();
  });
});
