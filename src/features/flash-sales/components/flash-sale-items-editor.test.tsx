// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EditableItem } from '../model/flash-sale.mapper';
import { FlashSaleItemsEditor } from './flash-sale-items-editor';

vi.mock('@/generated/api/catalog/catalog', () => ({
  useSearchActiveAdminProductVariants: () => ({ data: { items: [] }, isFetching: false }),
}));
vi.mock('@/foundation/table', () => ({ AdminTable: () => null, TableActionButton: () => null }));

window.matchMedia ??= (query: string) => ({
  matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
});

function items(count: number): EditableItem[] {
  return Array.from({ length: count }, (_, index) => ({
    productVariantId: String(index), name: `Sản phẩm ${index}`, sku: `SKU${index}`,
    salePrice: 80000, quota: null, committed: 0, inactive: false,
  }));
}

afterEach(cleanup);

describe('FlashSaleItemsEditor bulk quota', () => {
  it('fills all ten rows only on Apply, preserving the explicit Save workflow', () => {
    const onChange = vi.fn();
    render(<FlashSaleItemsEditor items={items(10)} onChange={onChange} enabled={false} showErrors={false} />);
    const apply = screen.getByRole('button', { name: 'Áp dụng cho tất cả (10 SKU)' });
    expect(apply.hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Số suất cho tất cả' }), { target: { value: '5' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(apply.hasAttribute('disabled')).toBe(false);
    fireEvent.click(apply);
    expect(onChange).toHaveBeenCalledWith(items(10).map((item) => ({ ...item, quota: 5 })));
  });

  it('explains and blocks a quota below sold/held instead of partially filling rows', () => {
    const rows = items(2);
    rows[1].committed = 6;
    const onChange = vi.fn();
    render(<FlashSaleItemsEditor items={rows} onChange={onChange} enabled={false} showErrors={false} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Số suất cho tất cả' }), { target: { value: '5' } });
    expect(screen.getByRole('alert').textContent).toContain('Tối thiểu 6');
    expect(screen.getByRole('button', { name: 'Áp dụng cho tất cả (2 SKU)' }).hasAttribute('disabled')).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not enable Apply when the table is empty', () => {
    render(<FlashSaleItemsEditor items={[]} onChange={vi.fn()} enabled={false} showErrors={false} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Số suất cho tất cả' }), { target: { value: '5' } });
    expect(screen.getByRole('button', { name: 'Áp dụng cho tất cả' }).hasAttribute('disabled')).toBe(true);
  });
});
