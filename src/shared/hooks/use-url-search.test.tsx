// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useUrlSearch } from './use-url-search';

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={['/organization?q=abc&page=2']}>{children}</MemoryRouter>;
}

function useHarness() {
  return { search: useUrlSearch(['q']), navigate: useNavigate() };
}

describe('useUrlSearch', () => {
  it('initialises from the URL and clears the filter immediately on clear', () => {
    const { result } = renderHook(useHarness, { wrapper });
    expect(result.current.search.values.q).toBe('abc');

    act(() => result.current.search.setter('q')(''));

    expect(result.current.search.values.q).toBe('');
    expect(result.current.search.url.get('q')).toBeUndefined();
    expect(result.current.search.url.get('page')).toBeUndefined();
  });

  it('follows the URL when it changes from outside (menu/tab re-click drops the query)', () => {
    const { result } = renderHook(useHarness, { wrapper });

    act(() => result.current.navigate('/organization'));

    expect(result.current.search.values.q).toBe('');
  });
});
