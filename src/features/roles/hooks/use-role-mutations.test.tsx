// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { RoleDto } from '@/generated/api/iam/iam.schemas';
import { PERMISSION_CHANGING_OPERATIONS } from '@/core/auth/auth-context';
import { useRoleMutations } from './use-role-mutations';

const { apiFetcherMock } = vi.hoisted(() => ({ apiFetcherMock: vi.fn() }));

vi.mock('@/lib/api/fetcher', () => ({ apiFetcher: apiFetcherMock }));

const role = { id: 'role-1', code: 'CASHIER', version: 3 } as RoleDto;

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const succeededKeys: unknown[] = [];
  // Cùng cách AuthProvider lắng nghe: mutation thành công + mutationKey[0]. Cache phát nhiều sự
  // kiện 'updated' cho cùng một mutation thành công nên test so theo tập khoá.
  queryClient.getMutationCache().subscribe((event) => {
    if (event.mutation?.state.status === 'success') {
      succeededKeys.push(event.mutation.options.mutationKey?.[0]);
    }
  });
  const callbacks = {
    onSaved: vi.fn(),
    onSaveError: vi.fn(),
    onDeleted: vi.fn(),
    onDeleteError: vi.fn(),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useRoleMutations(callbacks), { wrapper });
  return { result, callbacks, succeededKeys };
}

describe('useRoleMutations', () => {
  it('tạo vai trò mang mutationKey kích hoạt làm mới /auth/me', async () => {
    apiFetcherMock.mockResolvedValueOnce(role);
    const { result, callbacks, succeededKeys } = setup();

    act(() => result.current.save({ code: ' cashier ', name: 'Thu ngân', permissionCodes: [] }));

    await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledWith('create'));
    expect(apiFetcherMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        method: 'POST',
        data: expect.objectContaining({ code: 'CASHIER' }),
      }),
    );
    expect(new Set(succeededKeys)).toEqual(new Set(['createAdminRole']));
    expect(PERMISSION_CHANGING_OPERATIONS.has('createAdminRole')).toBe(true);
  });

  it('sửa vai trò gửi expectedVersion và mang mutationKey updateAdminRole', async () => {
    apiFetcherMock.mockResolvedValueOnce(role);
    const { result, callbacks, succeededKeys } = setup();

    act(() => result.current.save({ name: 'Thu ngân', permissionCodes: ['a'] }, role));

    await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledWith('update'));
    expect(apiFetcherMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ expectedVersion: 3 }) }),
    );
    expect(new Set(succeededKeys)).toEqual(new Set(['updateAdminRole']));
    expect(PERMISSION_CHANGING_OPERATIONS.has('updateAdminRole')).toBe(true);
  });

  it('xoá vai trò mang mutationKey deleteAdminRole', async () => {
    const deleted = { roleId: role.id };
    apiFetcherMock.mockResolvedValueOnce(deleted);
    const { result, callbacks, succeededKeys } = setup();

    await act(() => result.current.deleteRole(role, 'không dùng nữa'));

    expect(callbacks.onDeleted).toHaveBeenCalledWith(deleted, expect.anything(), undefined);
    expect(new Set(succeededKeys)).toEqual(new Set(['deleteAdminRole']));
    expect(PERMISSION_CHANGING_OPERATIONS.has('deleteAdminRole')).toBe(true);
  });
});
