// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useProductList } from './use-product-list';

const mocks = vi.hoisted(() => ({ products: vi.fn(() => ({ data: { items: [] } })) }));
vi.mock('@/generated/api/catalog/catalog', () => ({
  useListAdminProducts: mocks.products,
  useListAdminCategories: () => ({ data: { items: [] }, isPending: false }),
}));
describe('Product status server filter', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });
  it('sends URL status to the generated SDK, resets page on change and clears status', () => {
    const { result } = renderHook(useProductList, {
      wrapper: ({ children }: PropsWithChildren) => <MemoryRouter initialEntries={['/products?page=3&status=DRAFT&category=giay']}>{children}</MemoryRouter>,
    });
    expect(mocks.products).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'DRAFT', page: 3, category: 'giay' }));
    act(() => result.current.setStatus('ARCHIVED'));
    expect(mocks.products).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'ARCHIVED', page: 1, category: 'giay' }));
    act(() => result.current.setStatus(undefined));
    expect(result.current.status).toBeUndefined();
    expect(mocks.products).toHaveBeenLastCalledWith(expect.objectContaining({ status: undefined, page: 1 }));
  });
});
