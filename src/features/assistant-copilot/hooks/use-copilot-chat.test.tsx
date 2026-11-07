// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { AdminChatMessageListDto, SendAdminChatMessageResponseDto } from '@/generated/api/assistant/assistant.schemas';
import { useCopilotChat } from './use-copilot-chat';

const api = vi.hoisted(() => ({ create: vi.fn(), send: vi.fn(), list: vi.fn() }));
vi.mock('@/generated/api/assistant/assistant', () => ({
  createAdminChatConversation: api.create,
  sendAdminChatMessage: api.send,
  listAdminChatMessages: api.list,
  useListAdminChatMessages: () => ({ data: undefined }),
  getListAdminChatMessagesQueryKey: (id: string) => ['chat', id],
  getGetAdminActionDraftQueryKey: (id: string) => ['draft', id],
}));
const response: SendAdminChatMessageResponseDto = {
  conversation: { id: '1', status: 'ACTIVE', createdAt: '2026-11-07T00:00:00Z', lastMessageAt: null },
  userMessage: { id: '11', role: 'USER', content: 'Đơn hôm nay?', actionDraftIds: [], createdAt: '2026-11-07T00:00:00Z' },
  assistantMessage: { id: '12', role: 'ASSISTANT', content: 'Kết quả', actionDraftIds: [], createdAt: '2026-11-07T00:00:01Z' },
  actionDrafts: [],
};
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const hook = renderHook(useCopilotChat, { wrapper: ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  ) });
  return { ...hook, client };
}
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  api.create.mockResolvedValue(response.conversation);
  api.send.mockResolvedValue(response);
});

describe('useCopilotChat request lifecycle', () => {
  it('shares one create/send request for double-submit before React updates isPending', async () => {
    const { result } = setup();
    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    await act(async () => {
      first = result.current.send.mutateAsync({ content: 'Đơn hôm nay?' });
      second = result.current.send.mutateAsync({ content: 'Đơn hôm nay?' });
      await Promise.all([first, second]);
    });
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.send).toHaveBeenCalledTimes(1);
    expect(api.send.mock.calls[0][2]).toMatchObject({ timeout: 90000 });
    expect(api.send.mock.calls[0][3]).toBeInstanceOf(AbortSignal);
  });
  it('reuses the same key after a failed POST and cancels stale history before caching the answer', async () => {
    const { result, client } = setup();
    api.send.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      await expect(result.current.send.mutateAsync({ content: 'Đơn hôm nay?' })).rejects.toThrow('offline');
    });
    await waitFor(() => expect(result.current.conversationId).toBe('1'));
    const cancel = vi.spyOn(client, 'cancelQueries');
    await act(async () => { await result.current.send.mutateAsync({ content: 'Đơn hôm nay?' }); });
    expect(api.send.mock.calls[1][2].headers).toEqual(api.send.mock.calls[0][2].headers);
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith({ queryKey: ['chat', '1'] });
    const cache = client.getQueryData<AdminChatMessageListDto>(['chat', '1']);
    expect(cache?.items.map((item) => item.id)).toEqual(['11', '12']);
  });
});
