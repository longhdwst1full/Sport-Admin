// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getGetAdminPostQueryKey, getGetAdminSocialPostQueryKey,
  getListAdminPostsQueryKey, getListAdminSocialPostsQueryKey,
} from '@/generated/api/content/content';
import { useSocialPostCommand } from './use-social-commands';

const mocks = vi.hoisted(() => ({ deletePost: vi.fn() }));
vi.mock('@/generated/api/content/content', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/generated/api/content/content')>(),
  deleteAdminFacebookPost: mocks.deletePost,
}));

describe('Facebook permanent delete response', () => {
  let client: QueryClient;
  beforeEach(() => {
    mocks.deletePost.mockReset();
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    client.setQueryData(getGetAdminSocialPostQueryKey('57'), { id: '57', version: 3 });
    client.setQueryData(getGetAdminPostQueryKey('57'), { id: '57' });
    client.setQueryData(getListAdminSocialPostsQueryKey(), { items: [{ id: '57' }] });
    client.setQueryData(getListAdminPostsQueryKey(), { items: [{ id: '57' }] });
  });
  afterEach(() => { cleanup(); client.clear(); });
  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  it('accepts empty 204, removes detail cache and invalidates both lists', async () => {
    mocks.deletePost.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSocialPostCommand({ id: '57', version: 3 }), { wrapper: Wrapper });
    await act(async () => { await result.current.mutateAsync({ action: 'delete', body: { reason: 'Gỡ bài' } }); });
    expect(mocks.deletePost).toHaveBeenCalledWith('57', { expectedVersion: 3, reason: 'Gỡ bài' },
      expect.objectContaining({ headers: { 'Idempotency-Key': expect.any(String) } }));
    expect(client.getQueryData(getGetAdminSocialPostQueryKey('57'))).toBeUndefined();
    expect(client.getQueryData(getGetAdminPostQueryKey('57'))).toBeUndefined();
    expect(client.getQueryState(getListAdminSocialPostsQueryKey())?.isInvalidated).toBe(true);
    expect(client.getQueryState(getListAdminPostsQueryKey())?.isInvalidated).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
  it('keeps cached data when Facebook rejects deletion', async () => {
    mocks.deletePost.mockRejectedValue(new Error('Facebook rejected'));
    const { result } = renderHook(() => useSocialPostCommand({ id: '57', version: 3 }), { wrapper: Wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ action: 'delete', body: { reason: 'Gỡ bài' } })).rejects.toThrow('Facebook rejected');
    });
    expect(client.getQueryData(getGetAdminSocialPostQueryKey('57'))).toEqual({ id: '57', version: 3 });
    expect(client.getQueryState(getListAdminSocialPostsQueryKey())?.isInvalidated).toBe(false);
  });
});
