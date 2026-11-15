// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { useMasterListUrl } from './use-master-list-url';

function harness(entry: string) {
  return renderHook(() => ({ list: useMasterListUrl(), location: useLocation() }), {
    wrapper: ({ children }: PropsWithChildren) => <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>,
  });
}
describe('Master list URL pagination and status', () => {
  afterEach(cleanup);
  it.each([20, 50, 100])('retains %i rows after selection, resets page and preserves filters', (size) => {
    const { result } = harness('/categories?page=3&q=giay&status=ACTIVE');
    expect(result.current.list.pagination.pageSize).toBe(30);
    act(() => result.current.list.pagination.onChange(3, size));
    expect(result.current.list.pagination.pageSize).toBe(size);
    expect(result.current.list.pagination.current).toBe(1);
    expect(result.current.list.keyword).toBe('giay');
    expect(result.current.list.status).toBe('ACTIVE');
    expect(result.current.location.search).toContain(`pageSize=${size}`);
    expect(result.current.list.pagination.hideOnSinglePage).toBe(false);
  });
  it('reads size/status from reload URL, keeps size on page change, and clears default 30', () => {
    const { result } = harness('/brands?pageSize=50&status=INACTIVE');
    expect(result.current.list.pagination.pageSize).toBe(50);
    act(() => result.current.list.pagination.onChange(2, 50));
    expect(result.current.list.pagination.current).toBe(2);
    act(() => result.current.list.pagination.onChange(1, 30));
    expect(result.current.location.search).not.toContain('pageSize');
  });
  it('changes and clears status without dropping search/size, always resetting page', () => {
    const { result } = harness('/categories?page=3&q=giay&pageSize=20');
    act(() => result.current.list.onStatusChange('INACTIVE'));
    expect(result.current.list.status).toBe('INACTIVE');
    expect(result.current.list.pagination.current).toBe(1);
    expect(result.current.list.pagination.pageSize).toBe(20);
    act(() => result.current.list.onStatusChange(undefined));
    expect(result.current.list.status).toBeUndefined();
    expect(result.current.list.keyword).toBe('giay');
  });
  it('rejects unknown status and unsupported size in a pasted URL', () => {
    const { result } = harness('/brands?pageSize=999&status=UNKNOWN');
    expect(result.current.list.status).toBeUndefined();
    expect(result.current.list.pagination.pageSize).toBe(30);
  });
});
