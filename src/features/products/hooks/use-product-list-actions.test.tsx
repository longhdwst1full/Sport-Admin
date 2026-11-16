// @vitest-environment jsdom
import { QueryClient, QueryClientProvider, useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { App } from 'antd';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/fetcher';
import { useProductListActions } from './use-product-list-actions';

const { updateAdminProductMock } = vi.hoisted(() => ({ updateAdminProductMock: vi.fn() }));

vi.mock('@/core/auth/permissions', () => ({ useCan: () => true }));

vi.mock('@/generated/api/catalog/catalog', () => {
  // Hook generated thật bọc `useMutation` với option của caller; giữ đúng hình dạng đó để onError/onSuccess chạy thật.
  const wrap = (fn: (variables: unknown) => Promise<unknown>) =>
    (options?: { mutation?: UseMutationOptions<unknown, unknown, unknown> }) =>
      useMutation({ ...options?.mutation, mutationFn: fn });
  return {
    useUpdateAdminProduct: wrap((variables) => updateAdminProductMock(variables)),
    usePublishAdminProduct: wrap(() => Promise.resolve({})),
    useArchiveAdminProduct: wrap(() => Promise.resolve({})),
    useReactivateAdminProduct: wrap(() => Promise.resolve({})),
    getListAdminProductsQueryKey: () => ['/api/v1/admin/catalog/products'],
    getGetAdminProductQueryKey: (slug: string) => ['/api/v1/admin/catalog/products/' + slug],
    getGetAdminProductSetupStatusQueryKey: (id: string) => ['/api/v1/admin/catalog/products/' + id + '/setup-status'],
  };
});

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <App>{children}</App>
    </QueryClientProvider>
  );
  const { result } = renderHook(useProductListActions, { wrapper });
  return { result, invalidate };
}

const row = { id: 'p-1', version: 3 } as Parameters<ReturnType<typeof useProductListActions>['toggleVisibility']>[0];

describe('useProductListActions visibility toggle', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('reloads the product list after a 409 so the next toggle uses the fresh version', async () => {
    updateAdminProductMock.mockRejectedValue(
      new ApiError(409, { statusCode: 409, code: 'CONFLICT', message: 'Product version conflict' }),
    );
    const { result, invalidate } = setup();

    act(() => result.current.toggleVisibility(row, false));

    await waitFor(() => expect(updateAdminProductMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['/api/v1/admin/catalog/products'] }),
    );
  });

  it('does not reload the list for non-conflict errors', async () => {
    updateAdminProductMock.mockRejectedValue(
      new ApiError(403, { statusCode: 403, code: 'FORBIDDEN', message: 'Không có quyền' }),
    );
    const { result, invalidate } = setup();

    act(() => result.current.toggleVisibility(row, false));

    await waitFor(() => expect(updateAdminProductMock).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(invalidate).not.toHaveBeenCalled();
  });
});
