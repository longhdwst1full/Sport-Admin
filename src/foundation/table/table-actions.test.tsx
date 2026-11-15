// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Popconfirm } from 'antd';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TableActionButton } from './table-actions';

describe('Table icon actions without tooltips', () => {
  afterEach(cleanup);
  it('retains accessible label and invokes edit once without a hover tooltip', async () => {
    const edit = vi.fn();
    const { container } = render(<TableActionButton label="Sửa danh mục" icon={<span aria-hidden>✎</span>} onClick={edit} />);
    const button = screen.getByRole('button', { name: 'Sửa danh mục' });
    fireEvent.mouseEnter(button);
    fireEvent.click(button);
    expect(edit).toHaveBeenCalledOnce();
    expect(button.getAttribute('title')).toBeNull();
    expect(container.querySelector('.ant-tooltip')).toBeNull();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
  it('keeps destructive confirmation and executes delete only on confirmation', async () => {
    const remove = vi.fn();
    render(<Popconfirm title="Xóa bản ghi?" okText="Xác nhận xóa" onConfirm={remove}><TableActionButton label="Xóa bản ghi" danger icon={<span aria-hidden>×</span>} /></Popconfirm>);
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bản ghi' }));
    await screen.findByText('Xóa bản ghi?');
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }));
    await waitFor(() => expect(remove).toHaveBeenCalledOnce());
  });
});
